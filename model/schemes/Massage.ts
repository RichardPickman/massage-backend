import mongoose from "mongoose";
import { gripSchema } from "./Grip";
import { Schema } from "mongoose";

const massageSchema = new mongoose.Schema({
  title: String,
  items: [{ type: Schema.Types.ObjectId, ref: "grip" }],
});

const massageModel = mongoose.model("massage", massageSchema);

export default massageModel;
