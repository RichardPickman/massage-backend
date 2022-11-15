import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    topic: String,
    images: [Object],
    teacher: [String],
    lesson: [String],
    date: String,
  },
  {
    timestamps: true,
  }
);

const lectureModel = mongoose.model("lecture", lectureSchema);

export default lectureModel;
