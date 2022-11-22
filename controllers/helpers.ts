export const replaceNameToLink = (quiz: any) => {
  const questionsWithUrls = quiz?.questions.map((item: Record<any, any>) => ({
    ...item,
    // @ts-ignore
    img: item.img ? `${BUCKET_URL}/${item.img}` : null,
  }));

  return questionsWithUrls;
};
