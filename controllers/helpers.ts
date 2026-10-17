// Built per call: this module can be imported before dotenv has run.
const getBucketUrl = () =>
  `https://${process.env.BUCKET_NAME}.s3.${process.env.BUCKET_REGION}.amazonaws.com`;

export const replaceNameToLink = (arr: any) => {
  const bucketUrl = getBucketUrl();

  const questionsWithUrls = arr.map((item: Record<any, any>) => ({
    ...item,
    // @ts-ignore
    img: item.img ? `${bucketUrl}/${item.img}` : null,
  }));

  return questionsWithUrls;
};
