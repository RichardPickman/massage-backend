import mongoose, { Schema } from "mongoose";

const tokenSchema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  refreshToken: String,
});

const tokenModel = mongoose.model("token", tokenSchema);

export default tokenModel;
