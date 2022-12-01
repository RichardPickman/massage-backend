const BUCKET_URL = `https://${process.env.BUCKET_NAME}.s3.${process.env.BUCKET_REGION}.amazonaws.com`;

export const replaceNameToLink = (arr: any) => {
  const questionsWithUrls = arr.map((item: Record<any, any>) => ({
    ...item,
    // @ts-ignore
    img: item.img ? `${BUCKET_URL}/${item.img}` : null,
  }));

  return questionsWithUrls;
};
