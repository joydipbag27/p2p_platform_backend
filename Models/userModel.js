import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
    },
    avatar: {
        type: String,
    },
    trustScore: {
        type: Number,
        default: 0
    },
}, {
    strict: "throw",
    timestamps: true
})

export const User = mongoose.model("user", userSchema)

