import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  user: String,
  email: String,
  password: String,
  role: String,
  isActivated: { type: Boolean, default: false },
  activationLink: String,
});

const userModel = mongoose.model("users", userSchema);

export default userModel;
