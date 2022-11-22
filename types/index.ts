import { Document } from "mongoose";

export interface User extends Document {
  name: string;
  main: string;
  password: string;
}

export interface Quiz extends Document {
  id: number;
  questions: Question[];
}

export interface Question extends Document {
  question: string;
  answers: number[];
  correctAnswers: number[];
  img: string;
}

export interface Image extends Document {
  fieldname: string;
}
