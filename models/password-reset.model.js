import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 900 // Reset token expires after 15 minutes
  }
});

export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);