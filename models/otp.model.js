import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: String,
        required: true
    },
    validatedData: {
        firstname: String,
        lastname: String,
        department: String,
        year: Number,
        password: String
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 900 // 15 minutes in seconds
    }
});

export const OTP = mongoose.model('OTP', otpSchema);