import { Request, Response, NextFunction } from "express";

export default (req: Request, res: Response, next: NextFunction) => {
  console.log(
    `[LOG]: Request code: ${req.method}${"\n"}[LOG]: Request url: ${
      req.url
    }${"\n"}[LOG]: Request body: ${{ ...req.body }}`
  );

  next();
};
