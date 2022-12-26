import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  user: String,
  email: String,
  role: String,
  password: String,
  activationLink: String,
  isActivated: { type: Boolean, default: false },
});

const userModel = mongoose.model("users", userSchema);

export default userModel;
