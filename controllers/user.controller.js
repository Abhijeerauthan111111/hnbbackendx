import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import sgMail from '@sendgrid/mail';
import { OTP } from "../models/otp.model.js";
import { PasswordReset } from "../models/password-reset.model.js";

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


export const sendOTP = async (req, res) => {
  try {
    console.log(req.body);
    const { firstname, lastname, email, password, department, year } = req.body;
    const { acceptedTerms } = req.body;
    
    // Validate all required fields first
    if (!firstname || !lastname || !email || !password || !department || !year || !acceptedTerms) {
      return res.status(400).json({
        message: "All fields are required",
        success: false,
      });
    }

    // Extract rollnumber from email for checking
 const baseUsername =email.split('@')[0];   
    const [name, number] = baseUsername.split('_');
    const rollnumber = number;
    
    // Check if rollnumber is already registered
    const existingRollNumber = await User.findOne({ rollnumber });
    if (existingRollNumber) {
      return res.status(400).json({
        message: "This roll number is already registered with an account",
        success: false,
      });
    }

    // Name validation - Only letters and spaces allowed
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(firstname)) {
      return res.status(400).json({
        message: "First name should only contain letters and spaces",
        success: false,
      });
    }
    
    if (!nameRegex.test(lastname)) {
      return res.status(400).json({
        message: "Last name should only contain letters and spaces",
        success: false,
      });
    }
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
        success: false,
      });
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one uppercase letter",
        success: false,
      });
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one lowercase letter",
        success: false,
      });
    }
    
    // Check for number
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one number",
        success: false,
      });
    }
    
    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one special character",
        success: false,
      });
    }

    // Convert email to lowercase
    const lowercaseEmail = email.toLowerCase();

    // Validate email format
    const emailRegex = /^[a-zA-Z]+_\d{11}@hnbgu\.edu\.in$/;
    if (!emailRegex.test(lowercaseEmail)) {
      return res.status(400).json({
        message: "Please enter college provided Email!",
        success: false,
      });
    }
    
    // Check if email exists (using lowercase email)
    const existingUser = await User.findOne({ email: lowercaseEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
        success: false,
      });
    }

    // Check terms acceptance
    if (!acceptedTerms) {
      return res.status(400).json({
        message: "Please accept the terms and conditions",
        success: false,
      });
    }
    
    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Save OTP to database with lowercase email
    await OTP.findOneAndUpdate(
      { email: lowercaseEmail },
      { 
        email: lowercaseEmail, 
        otp,
        // Store validated data for later use
        validatedData: {
          firstname,
          lastname,
          department,
          year,
          password
        }
      },
      { upsert: true, new: true }
    );
    
    // Prepare email content
    const msg = {
      to: lowercaseEmail,
      from: process.env.SENDGRID_FROM_EMAIL, // Your verified sender in SendGrid
      subject: 'Your HNB X Verification Code',
      text: `Your OTP for HNB X signup is ${otp}. This code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a5568; text-align: center;">HNB X Account Verification</h2>
          <p>Hello ${firstname},</p>
          <p>Your verification code for HNB X is:</p>
          <div style="text-align: center; padding: 10px; background: #f7fafc; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 15px 0;">
            ${otp}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p style="font-size: 12px; color: #718096; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };
    
    // Send email
    await sgMail.send(msg);
    
    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to send OTP",
      success: false,
    });
  }
};

export const register = async (req, res) => {
  try {
    const { firstname, lastname, department, year, email, password, otp } = req.body;
    
    // Basic check for required fields
    if (!email || !otp) {
      return res.status(401).json({
        message: "Email and OTP are required",
        success: false,
      });
    }
    
    // Convert email to lowercase
    const lowercaseEmail = email.toLowerCase();
    
    // Verify OTP
    const otpRecord = await OTP.findOne({ email: lowercaseEmail });
    if (!otpRecord) {
      return res.status(400).json({
        message: "OTP expired or not sent. Please request a new OTP.",
        success: false,
      });
    }
    
    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP. Please check and try again.",
        success: false,
      });
    }
    
    // Get previously validated data
    const validatedData = otpRecord.validatedData || {};
    
    // Use either new data or previously validated data
    const finalFirstname = firstname || validatedData.firstname;
    const finalLastname = lastname || validatedData.lastname;
    const finalDepartment = department || validatedData.department;
    const finalYear = year || validatedData.year;
    const finalPassword = password || validatedData.password;
    
    // Extract username from email
    const baseUsername = lowercaseEmail.split('@')[0];   
    const [name, number] = baseUsername.split('_');
    const last4Digits = number.slice(-4);
    const username = name + last4Digits;
    const rollnumber = number;

    // Create full name
    const fullname = `${finalFirstname.trim()} ${finalLastname.trim()}`;

    // Determine role
    let role = "student";
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    if (finalYear < currentYear) {
      role = "alumni";
    } else if (finalYear == currentYear) {
      if (currentMonth > 5) {
        role = "alumni";
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    
    // Create user with lowercase email
    await User.create({
      username,
      email: lowercaseEmail,
      department: finalDepartment,
      password: hashedPassword,
      fullName: fullname,
      rollnumber,
      graduationYear: finalYear,
      role
    });
    
    // Delete OTP record after successful verification
    await OTP.deleteOne({ email: lowercaseEmail });
    
    return res.status(201).json({
      message: "Account created successfully.",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Failed to create account",
      success: false,
    });
  }
};    
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check for missing fields
    if (!email || !password) {
      return res.status(401).json({
        message: "Something is missing, please check!",
        success: false,
      });
    }
    
    // Convert email to lowercase and trim any whitespace
    const lowercaseEmail = email.toLowerCase().trim();
    
    // Debug log to verify the email being searched
    console.log("Looking up user with email:", lowercaseEmail);
    
    // Find user with normalized email - avoid full population in login
    let user = await User.findOne({ email: lowercaseEmail }).select("+password");
    
    if (!user) {
      console.log("User not found with email:", lowercaseEmail);
      return res.status(401).json({
        message: "Incorrect email or password",
        success: false,
      });
    }
    
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Incorrect email or password",
        success: false,
      });
    };

    const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

    // Simplify the user object - don't populate posts
    const userResponse = {
      _id: user._id,
      username: user.username,
      department: user.department,
      fullName: user.fullName,
      rollnumber: user.rollnumber,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
      followers: user.followers,
      following: user.following,
      role: user.role,
      graduationYear: user.graduationYear,
      resumeUrl: user.resumeUrl,       
      resumeName: user.resumeName
    };
    
    // Set cookie and send response
    return res.cookie('token', token, { 
      httpOnly: true, 
      sameSite: 'none',  
      secure: true,    
      maxAge: 1 * 24 * 60 * 60 * 1000 
    }).json({
      message: `Welcome back ${user.username}`,
      success: true,
      user: userResponse
    });
  } catch (error) {
    // Improved error logging
    console.error("Login Error:", error);
    return res.status(500).json({
      message: "Login failed due to server error",
      success: false
    });
  }
};
export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};
export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        let user = await User.findById(userId)
            .populate({
                path: 'posts',
                options: { sort: { createdAt: -1 } }
            })
            .populate({
                path: 'bookmarks',
                populate: [
                    {
                        path: 'author',
                        select: 'username profilePicture fullName role department'
                    },
                    {
                        path: 'comments',
                        options: { sort: { createdAt: -1 } },
                        populate: {
                            path: 'author',
                            select: 'username profilePicture fullName role'
                        }
                    }
                ]
            });
            
      


            
            
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to fetch profile",
            success: false
        });
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        };
        
        // Update bio if provided (empty string is allowed)
        if (bio !== undefined) {
            user.bio = bio;
        }
        
        // Only update gender if it's a valid enum value
        if (gender && gender !== "undefined" && gender !== "null") {
            // Check if gender is a valid value based on your schema
            if (gender === 'male' || gender === 'female') {
                user.gender = gender;
            }
        }
        
        if (profilePicture) {
            user.profilePicture = cloudResponse.secure_url;
        }

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user 
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Failed to update profile.',
            success: false,
            error: error.message
        });
    }
};
export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(400).json({
                message: 'Currently do not have any users',
            })
        };
        return res.status(200).json({
            success: true,
            users: suggestedUsers
        })
    } catch (error) {
        console.log(error);
    }
};
export const followOrUnfollow = async (req, res) => {
    try {
        const followKrneWala = req.id; // patel
        const jiskoFollowKrunga = req.params.id; // shivani
        if (followKrneWala === jiskoFollowKrunga) {
            return res.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }

        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskoFollowKrunga);

        if (!user || !targetUser) {
            return res.status(400).json({
                message: 'User not found',
                success: false
            });
        }
        // mai check krunga ki follow krna hai ya unfollow
        const isFollowing = user.following.includes(jiskoFollowKrunga);
        if (isFollowing) {
            // unfollow logic ayega
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $pull: { followers: followKrneWala } }),
            ])
            return res.status(200).json({ message: 'Unfollowed successfully', success: true });
        } else {
            // follow logic ayega
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $push: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $push: { followers: followKrneWala } }),
            ])
            return res.status(200).json({ message: 'followed successfully', success: true });
        }
    } catch (error) {
        console.log(error);
    }
}

// Forgot password - send OTP to email
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false
      });
    }
    
    // Check if user exists with this email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "No account found with this email",
        success: false
      });
    }
    
    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Save OTP to password reset collection
    await PasswordReset.findOneAndUpdate(
      { email },
      { email, otp, isVerified: false },
      { upsert: true, new: true }
    );
    
    // Prepare email content
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'HNB X Password Reset Code',
      text: `Your password reset code for HNB X is ${otp}. This code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a5568; text-align: center;">HNB X Password Reset</h2>
          <p>Hello ${user.fullName || user.username},</p>
          <p>We received a request to reset your password. Your verification code is:</p>
          <div style="text-align: center; padding: 10px; background: #f7fafc; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 15px 0;">
            ${otp}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p style="font-size: 12px; color: #718096; margin-top: 30px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };
    
    // Send email
    await sgMail.send(msg);
    
    return res.status(200).json({
      message: "Password reset code sent to your email",
      success: true
    });
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to process password reset request",
      success: false
    });
  }
};

// Verify OTP for password reset
export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
        success: false
      });
    }
    
    // Find the reset record
    const resetRecord = await PasswordReset.findOne({ email });
    if (!resetRecord) {
      return res.status(400).json({
        message: "Reset code expired or not sent. Please request a new code.",
        success: false
      });
    }
    
    // Verify OTP
    if (resetRecord.otp !== otp) {
      return res.status(400).json({
        message: "Invalid code. Please check and try again.",
        success: false
      });
    }
    
    // Mark as verified
    resetRecord.isVerified = true;
    await resetRecord.save();
    
    return res.status(200).json({
      message: "Code verified successfully. You can now reset your password.",
      success: true
    });
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to verify reset code",
      success: false
    });
  }
};

// Reset password with new password
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All fields are required",
        success: false
      });
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords don't match",
        success: false
      });
    }
    
    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters, including uppercase, lowercase, numbers and special characters",
        success: false
      });
    }
    
    // Check if OTP was verified
    const resetRecord = await PasswordReset.findOne({ email, isVerified: true });
    if (!resetRecord) {
      return res.status(400).json({
        message: "You must verify your email with the code first",
        success: false
      });
    }
    
    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    // Delete reset record after successful password change
    await PasswordReset.deleteOne({ email });
    
    return res.status(200).json({
      message: "Password reset successfully. You can now login with your new password.",
      success: true
    });
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to reset password",
      success: false
    });
  }
};





// Upload resume
export const uploadResume = async (req, res) => {
  try {
    const userId = req.id;
    const resume = req.file;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false
      });
    }
    
    // Check if user is faculty
    if (user.role === 'faculty') {
      return res.status(403).json({
        message: "Faculty members do not need to upload resumes",
        success: false
      });
    }
    
    // Check if resume exists
    if (!resume) {
      return res.status(400).json({
        message: "Resume file is required",
        success: false
      });
    }
    
    // Check file type
    if (resume.mimetype !== 'application/pdf') {
      return res.status(400).json({
        message: "Only PDF files are accepted",
        success: false
      });
    }
    
    // Convert to base64 for Cloudinary
    const fileUri = getDataUri(resume);
    
    // Upload to Cloudinary with optimized settings for free plan
    const cloudResponse = await cloudinary.uploader.upload(fileUri, {
      resource_type: 'raw', // Important for PDFs
      folder: 'resumes',
      public_id: `resume_${userId}_${Date.now()}`, // Add timestamp to prevent caching
    });
    
    // Update user's resume information
    user.resumeUrl = cloudResponse.secure_url;
    user.resumeName = resume.originalname;
    await user.save();
    
    return res.status(200).json({
      message: "Resume uploaded successfully",
      resumeUrl: cloudResponse.secure_url,
      resumeName: resume.originalname,
      success: true
    });
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to upload resume",
      success: false
    });
  }
};

// Delete resume
export const deleteResume = async (req, res) => {
  try {
    const userId = req.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false
      });
    }
    
    // Check if user has a resume
    if (!user.resumeUrl) {
      return res.status(400).json({
        message: "No resume found to delete",
        success: false
      });
    }
    
    // Extract public_id from Cloudinary URL
    const publicId = `resumes/resume_${userId}`;
    
    // Delete from Cloudinary (if fails, still remove from user)
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch (cloudinaryError) {
      console.log("Cloudinary delete error:", cloudinaryError);
    }
    
    // Update user
    user.resumeUrl = "";
    user.resumeName = "";
    await user.save();
    
    return res.status(200).json({
      message: "Resume deleted successfully",
      success: true
    });
    
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Failed to delete resume",
      success: false
    });
  }
};

