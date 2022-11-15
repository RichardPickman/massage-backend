import lectureModel from "../model/schemes/Lecture";

class LectureService {
  async create(props: Record<any, any>) {
    const createLecture = await new lectureModel(props)
      .save()
      .then((item) => this.find(item.id));

    return createLecture;
  }

  async delete(id: string) {
    const removeLecture = await lectureModel.deleteOne({ _id: id });

    return removeLecture;
  }

  async find(id: string) {
    const lecture = lectureModel.findOne({ _id: id });

    return lecture;
  }

  async findAll() {
    const lectures = await lectureModel.find({});

    return lectures;
  }
}

const Lecture = new LectureService();

export default Lecture;
