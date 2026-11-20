import type { QuestionResult, SubmittedAnswer } from "./score";

export interface AttemptAnswerSnapshot {
  question: string;
  questionText: string;
  answers: { id: string; text: string }[];
  correctAnswers: string[];
  selected: string[];
  correct: boolean;
}

// Built from the score, never from the request: every question on the quiz ends
// up in the attempt, including the ones the student never answered. Taking the
// request as the source would silently drop unanswered questions from history.
export const buildAttemptAnswers = (
  results: QuestionResult[],
  submitted: SubmittedAnswer[]
): AttemptAnswerSnapshot[] => {
  const selectedByQuestion = new Map<string, string[]>();

  submitted.forEach((answer) => {
    selectedByQuestion.set(
      String(answer.questionId),
      Array.isArray(answer.selected) ? answer.selected.map(String) : []
    );
  });

  return results.map((result) => ({
    question: result.questionId,
    questionText: result.questionText,
    answers: result.answers,
    correctAnswers: result.correctAnswers,
    selected: selectedByQuestion.get(result.questionId) ?? [],
    correct: result.correct,
  }));
};
