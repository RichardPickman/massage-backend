export interface StoredAnswer {
  id?: string | null;
  text?: string | null;
}

export interface StoredQuestion {
  _id: string;
  question?: string | null;
  answers?: StoredAnswer[] | null;
  correctAnswers?: string[] | null;
}

export interface SubmittedAnswer {
  questionId: string;
  selected: string[];
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  correctAnswers: string[];
  // Snapshot of the question as it looked when the attempt was submitted.
  // Copied into the result so that editing or deleting the question later
  // cannot rewrite what the student actually answered.
  questionText: string;
  answers: { id: string; text: string }[];
}

export interface AttemptScore {
  correctCount: number;
  questionCount: number;
  percent: number;
  // null when the quiz carries no threshold - attempts made before the field
  // existed - which is deliberately different from "failed".
  threshold: number | null;
  passed: boolean | null;
  results: QuestionResult[];
}

// A question only counts when the submitted set matches the correct set
// exactly: no missing answers, no extra ones. Partial credit is deliberately
// out - it let the old client grader award negative scores.
const isExactMatch = (selected: string[], correct: string[]) => {
  if (selected.length !== correct.length) {
    return false;
  }

  const selectedSet = new Set(selected);

  return correct.every((id) => selectedSet.has(id));
};

// Rows written before the editor enforced the shape may miss ids or text, so
// every field is coerced instead of trusted.
const snapshotAnswers = (answers?: StoredAnswer[] | null) => {
  if (!Array.isArray(answers)) {
    return [];
  }

  const snapshot: { id: string; text: string }[] = [];

  answers.forEach((answer) => {
    if (!answer || typeof answer !== "object") {
      return;
    }

    snapshot.push({
      id: answer.id == null ? "" : String(answer.id),
      text: answer.text == null ? "" : String(answer.text),
    });
  });

  return snapshot;
};

export const scoreAttempt = (
  questions: StoredQuestion[],
  answers: SubmittedAnswer[],
  threshold?: number | null
): AttemptScore => {
  const selectedByQuestion = new Map<string, string[]>();

  answers.forEach((answer) => {
    const selected = Array.isArray(answer.selected)
      ? answer.selected.map(String)
      : [];

    selectedByQuestion.set(String(answer.questionId), selected);
  });

  // Score against the questions stored on the quiz, so a submission can never
  // invent questions or inflate the total.
  const results = questions.map((question) => {
    const questionId = String(question._id);
    const correctAnswers = (question.correctAnswers ?? []).map(String);
    const selected = selectedByQuestion.get(questionId) ?? [];

    return {
      questionId,
      correct:
        correctAnswers.length > 0 && isExactMatch(selected, correctAnswers),
      correctAnswers,
      questionText: question.question == null ? "" : String(question.question),
      answers: snapshotAnswers(question.answers),
    };
  });

  const questionCount = results.length;
  const correctCount = results.filter((result) => result.correct).length;
  const percent = questionCount
    ? Math.round((correctCount / questionCount) * 100)
    : 0;

  // Exactly on the boundary passes: "threshold 50" has to mean that 50 percent
  // gets you through, otherwise the number shown to the author is a lie.
  const hasThreshold =
    typeof threshold === "number" && Number.isFinite(threshold);
  const passed = hasThreshold ? percent >= threshold : null;

  return {
    correctCount,
    questionCount,
    percent,
    threshold: hasThreshold ? threshold : null,
    passed,
    results,
  };
};
