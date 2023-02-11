import mongoose, { Schema } from "mongoose";

const lectureSchema = new mongoose.Schema(
  {
    topic: String,
    images: [Object],
    teacher: { type: Schema.Types.ObjectId, ref: "teacher" },
    lesson: { type: Schema.Types.ObjectId, ref: "lessons" },
    date: String,
    author: [{ type: Schema.Types.ObjectId, ref: "users" }],
  },
  {
    timestamps: true,
  }
);

const lectureModel = mongoose.model("lecture", lectureSchema);

export default lectureModel;
