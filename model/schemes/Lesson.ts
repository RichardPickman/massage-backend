import mongoose, { Schema } from "mongoose";

const lessonSchema = new mongoose.Schema({
  title: String,
  time: String,
  room: Number,
  teacher: { type: Schema.Types.ObjectId, ref: "teacher" },
  days: [String],
});

const lessonModel = mongoose.model("lessons", lessonSchema);

export default lessonModel;
