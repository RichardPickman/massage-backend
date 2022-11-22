import ApiError from "../../Error";

export default (err: any, req: any, res: any, next: any) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  return res.status(500).json({ message: err });
};
