import ApiError from "../exceptions";
import teacherModel from "../model/schemes/Teacher";
import lessonModel from "../model/schemes/Lesson";
import TeacherDto from "../dtos/teacher";
import { Teacher } from "../types";

class TeacherService {
  async create(data: Teacher) {
    try {
      const parsedLessons = data.lessons.map((lesson) =>
        lessonModel.findById(lesson)
      );

      const payload = {
        ...data,
        lessons: await Promise.all(parsedLessons),
      };

      const teacher = await teacherModel.create(payload);

      const result = new TeacherDto(teacher);

      return result;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }

  async get(id: string) {
    try {
      const teacher = await teacherModel
        .findOne({ _id: id })
        .populate("lessons");

      const result = new TeacherDto(teacher);

      return result;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }

  async update(id: string, changes: Record<string, unknown>) {
    try {
      console.log(changes);
      const teacher = await teacherModel.findOneAndUpdate(
        { _id: id },
        { ...changes }
      );

      const result = new TeacherDto(teacher);

      return result;
    } catch (error) {
      console.log(error);
      throw ApiError.ServerSideError(error.message);
    }
  }

  async remove(id: string) {
    try {
      const teacherData = await teacherModel.deleteOne({ _id: id });

      return teacherData;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }

  async getAll() {
    try {
      const teachers = await teacherModel.find({}).populate("lessons");

      const result = teachers.map((teacher) => new TeacherDto(teacher));

      return result;
    } catch (error) {
      throw ApiError.ServerSideError(error.message);
    }
  }
}

export default new TeacherService();
