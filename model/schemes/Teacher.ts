import mongoose, { Schema } from "mongoose";

const teacherSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  img: String,
  lessons: [{ type: Schema.Types.ObjectId, ref: "lessons" }],
});

const teacherModel = mongoose.model("teacher", teacherSchema);

export default teacherModel;
