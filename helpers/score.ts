export interface StoredQuestion {
  _id: string;
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
}

export interface AttemptScore {
  correctCount: number;
  questionCount: number;
  percent: number;
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

export const scoreAttempt = (
  questions: StoredQuestion[],
  answers: SubmittedAnswer[]
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
    };
  });

  const questionCount = results.length;
  const correctCount = results.filter((result) => result.correct).length;
  const percent = questionCount
    ? Math.round((correctCount / questionCount) * 100)
    : 0;

  return { correctCount, questionCount, percent, results };
};
