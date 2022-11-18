import mongoose from "mongoose";

export const imageSchema = new mongoose.Schema({
  fieldname: String,
});

const imageModel = mongoose.model("images", imageSchema);

export default imageModel;
