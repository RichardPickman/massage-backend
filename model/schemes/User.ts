import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  nickname: String,
  email: String,
  password: String,
  role: { type: String, default: "user" },
  isActivated: { type: Boolean, default: false },
  activationLink: String,
});

const userModel = mongoose.model("users", userSchema);

export default userModel;
