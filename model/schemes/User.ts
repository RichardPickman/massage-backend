import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    // The name people see. `userKey` is the same value lower-cased, so the unique
    // index can be relied on: "Ania" and "ania" are one student to a reader.
    user: String,
    userKey: { type: String, unique: true, sparse: true },
    email: String,
    role: String,
    password: String,
})

const userModel = mongoose.model('users', userSchema);

export default userModel;
