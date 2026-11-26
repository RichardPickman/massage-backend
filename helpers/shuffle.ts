/**
 * Order of questions and answers, randomised in one place.
 *
 * A test whose questions arrive in the stored order can be answered from memory of
 * the syllabus rather than from knowledge: the finger alphabet is learned in
 * alphabetical order, so a fixed list gives the sequence away. Shuffling the
 * response fixes that without touching what is stored, and scoring is unaffected —
 * an answer is submitted against a question id, not against a position.
 *
 * `random` is injectable so a test can pin the outcome instead of hoping.
 */
export const shuffle = <T>(
    items: readonly T[],
    random: () => number = Math.random,
): T[] => {
    const out = [...items];

    // Fisher–Yates: every permutation is equally likely. `sort(() => random() - .5)`
    // is the shortcut, and it is measurably biased towards the original order.
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const swap = out[i];

        out[i] = out[j];
        out[j] = swap;
    }

    return out;
};
