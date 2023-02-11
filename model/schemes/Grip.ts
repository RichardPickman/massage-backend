import mongoose from "mongoose";

export const gripSchema = new mongoose.Schema({
  title: String,
});

const gripModel = mongoose.model("grip", gripSchema);

export default gripModel;
