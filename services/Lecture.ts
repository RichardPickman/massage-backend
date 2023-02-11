import lectureModel from "../model/schemes/Lecture";
import TeacherService from "../services/Teacher";
import LessonService from "../services/Lesson";

class LectureService {
  async create(props: Record<any, any>) {
    const teacher = await TeacherService.get(props.teacher);
    const lesson = await LessonService.get(props.lesson);
    const createLecture = await new lectureModel({
      ...props,
      teacher: teacher.id,
      lesson: lesson.id,
    })
      .save()
      .then((item) => this.find(item.id));

    return createLecture;
  }

  async delete(id: string) {
    const removeLecture = await lectureModel.deleteOne({ _id: id });

    return removeLecture;
  }

  async find(id: string) {
    const lecture = lectureModel
      .findOne({ _id: id })
      .populate("teacher")
      .populate("lesson");

    return lecture;
  }

  async findAll() {
    const lectures = await lectureModel
      .find({})
      .populate("teacher")
      .populate("lesson");

    return lectures;
  }
}

const Lecture = new LectureService();

export default Lecture;
