import mongoose from "mongoose";
import { Schema } from "mongoose";

const technicSchema = new mongoose.Schema({
  title: String,
  grips: [{ type: Schema.Types.ObjectId, ref: "grip" }],
});

const massageSchema = new mongoose.Schema({
  title: String,
  technics: [technicSchema],
  author: [{ type: Schema.Types.ObjectId, ref: "users" }],
});

const massageModel = mongoose.model("massage", massageSchema);

export default massageModel;
