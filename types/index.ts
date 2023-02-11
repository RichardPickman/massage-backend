import { Document } from "mongoose";

export interface User extends Document {
  user: string;
  email: string;
  password: string;
  role: string;
  isActivated: boolean;
  activationLink: string;
}

export interface Quiz extends Document {
  questions: Question[];
  title: string;
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

export interface Massage extends Document {
  title: string;
  technics: [Technic];
}

export interface Technic extends Document {
  title: string;
  grips: [Grip];
}

export interface Grip extends Document {
  text: string;
}

export type Lesson = {
  id: string;
  title: string;
};

export type Teacher = {
  firstName: string;
  lastName: string;
  email: string;
  img: string;
  lessons: [Lesson];
};
