import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import sgMail from '@sendgrid/mail';
import { OTP } from "../models/otp.model.js";


// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


export const sendOTP = async (req, res) => {
    console.log(req.body)
    try {

        console.log(req.body);
        const { email } = req.body;
        const { acceptedTerms } = req.body; 
        
        if (!email) {
            return res.status(400).json({
                message: "Email is required",
                success: false,
            });
        }

        if (!acceptedTerms) {
            return res.status(400).json({
                message: "Please accept the terms and conditions",
                success: false,
            });
        }
        
        // Validate email format
        const emailRegex = /^[a-zA-Z]+_\d{11}@hnbgu\.edu\.in$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Please enter college provided Email!",
                success: false,
            });
        }
        
        // Check if email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered",
                success: false,
            });
        }
        
        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Save OTP to database
        await OTP.findOneAndUpdate(
            { email },
            { email, otp },
            { upsert: true, new: true }
        );
        
        // Prepare email content
        const msg = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL, // Your verified sender in SendGrid
            subject: 'Your HNB X Verification Code',
            text: `Your OTP for HNB X signup is ${otp}. This code will expire in 15 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #4a5568; text-align: center;">HNB X Account Verification</h2>
                    <p>Hello,</p>
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
        console.log(req.body);
        const { firstname, lastname, department, year, email, password, otp } = req.body;
        
        if (!firstname || !year || !lastname || !email || !password || !department || !otp) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        
        // Verify OTP
        const otpRecord = await OTP.findOne({ email });
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
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(401).json({
                message: "Email already registered",
                success: false,
            });
        };

        // Extract username from email
        const baseUsername = email.split('@')[0];   
        const [name, number] = baseUsername.split('_');
        const last4Digits = number.slice(-4);
        const username = name + last4Digits;

        // Create full name
        const fullname = firstname + " " + lastname;

        // Determine role
        let role = "student";
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();

        if (year < currentYear) {
            role = "alumni";
        } else if (year == currentYear) {
            if (currentMonth > 5) {
                role = "alumni";
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        await User.create({
            username,
            email,
            department,
            password: hashedPassword,
            fullName: fullname,
            graduationYear: year,
            role
        });
        
        // Delete OTP record after successful verification
        await OTP.deleteOne({ email });
        
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
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        let user = await User.findOne({ email });
        if (!user) {
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

        // populate each post if in the posts array
        const populatedPosts = await Promise.all(
            user.posts.map( async (postId) => {
                const post = await Post.findById(postId);
                if(post.author.equals(user._id)){
                    return post;
                }
                return null;
            })
        )
        user = {
            _id: user._id,
            username: user.username,
            department : user.department,
            fullName : user.fullName ,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts,
            role : user.role,
            graduationYear : user.graduationYear
        }
        return res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
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
        let user = await User.findById(userId).populate({path:'posts', createdAt:-1}).populate('bookmarks');
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
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
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user 
        });

    } catch (error) {
        console.log(error);
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

