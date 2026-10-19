import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    topic: String,
    images: [Object],
    teacher: [String],
    lesson: [String],
    date: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  },
  {
    timestamps: true,
  }
);

const lectureModel = mongoose.model("lecture", lectureSchema);

export default lectureModel;
