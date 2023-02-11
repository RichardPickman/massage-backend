import ApiError from "../exceptions";
import lessonModel from "../model/schemes/Lesson";
import LessonDto from "../dtos/lesson";
import Teacher from "./Teacher";

class LessonService {
  async create(data: Record<string, unknown>) {
    try {
      const teacher = await Teacher.get(data.teacher as string);

      const lesson = await lessonModel.create({
        ...data,
        room: Number(data.room),
        teacher: teacher.id,
      });

      const result = new LessonDto(lesson);

      return result;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }

  async get(id: string) {
    try {
      const lesson = await lessonModel.findOne({ _id: id }).populate("teacher");

      const result = new LessonDto(lesson);

      return result;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }

  async remove(id: string) {
    try {
      const lessonData = await lessonModel.deleteOne({ _id: id });

      return lessonData;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }

  async getAll() {
    try {
      const lessons = await lessonModel.find().populate("teacher");

      const result = lessons.map((lesson) => new LessonDto(lesson));

      return result;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }
}

export default new LessonService();
