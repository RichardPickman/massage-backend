import { pageRange, type PageQuery } from "../helpers/pagination";
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

  async update(id: string, props: Record<string, unknown>) {
    const updateLecture = await lectureModel.findOneAndUpdate(
      { _id: id },
      { $set: props },
      { new: true }
    );

    return updateLecture;
  }

  async find(id: string) {
    const lecture = lectureModel.findOne({ _id: id });

    return lecture;
  }

  // Newest first, so a page's rows keep their order as the archive grows:
  // `_id` ordering matches insertion order for this collection.
  async findPage(query: PageQuery) {
    const total = await lectureModel.countDocuments({});
    const range = pageRange(query, total);

    const lectures = await lectureModel
      .find({})
      .sort({ _id: -1 })
      .skip(range.skip)
      .limit(query.limit);

    return {
      items: lectures,
      total,
      page: range.page,
      limit: query.limit,
      pages: range.pages,
    };
  }
}

const Lecture = new LectureService();

export default Lecture;
