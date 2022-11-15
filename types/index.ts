import { Document } from "mongoose";

export interface User extends Document {
  name: string;
  main: string;
  password: string;
}

export interface Quiz extends Document {
  id: number;
  question: string;
  img: string;
  incorrectAnswers: string[];
  correctAnswer: number[];
}

export interface Image {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}
