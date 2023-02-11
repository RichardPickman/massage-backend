import { User } from "../types";
import LessonDto from "./lesson";

export default class TeacherDto {
  id: string;
  email: string;
  firstName: string;
  lastName: boolean;
  lessons: string;
  img: string;

  constructor(model) {
    this.id = model._id;
    this.firstName = model.firstName;
    this.lastName = model.lastName;
    this.email = model.email;
    this.lessons = model.lessons.map((lesson) => new LessonDto(lesson));
    this.img = model.img;
  }
}
