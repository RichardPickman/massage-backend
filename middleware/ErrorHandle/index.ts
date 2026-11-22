import ApiError from "../../Error";

export default (err: any, req: any, res: any, next: any) => {
  if (err instanceof ApiError) {
    // Only errors that opted into a code carry one; everything else answers
    // exactly as it did before this field existed.
    const body = err.code
      ? { message: err.message, code: err.code }
      : { message: err.message };

    return res.status(err.status).json(body);
  }

  return res.status(500).json({ message: err });
};
