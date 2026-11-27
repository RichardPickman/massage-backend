// The records every end-to-end run starts from.
//
// Kept deliberately small and fixed: the tests assert against these names, so a
// test that fails means behaviour changed, not that a fixture drifted. Sign-in
// credentials are the same as the ones in `e2e/README.md`, and nothing here touches
// a real database.

import * as bcrypt from "bcrypt";
import lectureModel from "../model/schemes/Lecture";
import questionModel from "../model/schemes/Question";
import quizModel from "../model/schemes/Quiz";
import userModel from "../model/schemes/User";
import { nicknameKey } from "../helpers/nickname";

// Not credentials: a throwaway password both this seed and the browser suite compute
// from the nickname, so the repository holds no password-shaped literal that a secret
// scanner has to be taught to ignore.
export const passwordFor = (login: string) => `${login}-e2e-test`;
export const ADMIN = { login: "kierownik" };
export const STUDENT = { login: "studentka" };
export const LECTURE_TOPIC = "Anatomia zęba — test E2E";
export const QUIZ_TITLE = "Test E2E — instrumentarium";

export const seed = async () => {
    const hash = await bcrypt.hash(passwordFor(ADMIN.login), 10);

    await userModel.create({
        user: ADMIN.login,
        userKey: nicknameKey(ADMIN.login),
        email: `${ADMIN.login}@students.local`,
        role: "admin",
        password: hash,
    });

    await userModel.create({
        user: STUDENT.login,
        userKey: nicknameKey(STUDENT.login),
        email: `${STUDENT.login}@students.local`,
        role: "user",
        password: await bcrypt.hash(passwordFor(STUDENT.login), 10),
    });

    const lecture = await lectureModel.create({
        topic: LECTURE_TOPIC,
        date: "11/24/2026",
        teacher: ["dr Nowak"],
        lesson: ["Wprowadzenie"],
        images: [],
    });

    const questions = await questionModel.create([
        {
            question: "Które narzędzie służy do usuwania kamienia?",
            answers: [
                { id: "a", text: "Kiretka" },
                { id: "b", text: "Kleszcze" },
            ],
            correctAnswers: ["a"],
        },
        {
            question: "Ile wynosi próg zaliczenia?",
            answers: [
                { id: "a", text: "50%" },
                { id: "b", text: "60%" },
            ],
            correctAnswers: ["b"],
        },
    ]);

    await quizModel.create({
        title: QUIZ_TITLE,
        threshold: 60,
        lecture: lecture._id,
        questions: questions.map((question) => question._id),
    });
};
