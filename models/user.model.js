import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{type:String, required:true, unique:true},
    rollnumber:{type:String, required:true, unique:true},
    email:{type:String,required:true,unique:true},
    fullName: { type: String, required: true },
    password:{type:String,required:true},
    department: { type: String, required: true },
    graduationYear: Number,
    profilePicture:{type:String,default:''},
    bio:{type:String, default:''},
    gender:{type:String,enum:['male','female']},
    role: { type: String, enum: ["student", "faculty", "alumni"], default: "student" },
    isVerified: { type: Boolean, default: false },
    followers:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    following:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    posts:[{type:mongoose.Schema.Types.ObjectId, ref:'Post'}],
    bookmarks:[{type:mongoose.Schema.Types.ObjectId, ref:'Post'}],
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],

    resumeUrl: { type: String, default: '' },
    resumeName: { type: String, default: '' }
},{timestamps:true});

export const User = mongoose.model('User', userSchema);