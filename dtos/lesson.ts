import { User } from "../types";

export default class LessonDto {
  id: string;
  title: string;
  time: string;
  room: number;
  teacher: object;
  days: [string];

  constructor(model) {
    this.id = model._id;
    this.title = model.title;
    this.time = model.time;
    this.room = model.room;
    this.teacher = model.teacher;
    this.days = model.days;
  }
}
