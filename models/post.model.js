import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
    caption:{type:String, default:''},
    image:{type:String},
    author:{type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
    likes:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    comments:[{type:mongoose.Schema.Types.ObjectId, ref:'Comment'}],
    createdAt:{type:Date, default:Date.now},
   
});
export const Post = mongoose.model('Post', postSchema);