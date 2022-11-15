import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
  teacher: String,
  lessons: [String],
});

const teacherModel = mongoose.model("teacher", teacherSchema);

export default teacherModel;
