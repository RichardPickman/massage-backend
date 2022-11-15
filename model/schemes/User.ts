import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    user: String,
    email: String,
    role: String,
    password: String,
})

const userModel = mongoose.model('users', userSchema);

export default userModel;
