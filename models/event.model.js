import mongoose from "mongoose";
const eventSchema = new mongoose.Schema({
    caption:{type:String, default:''},
    image:{type:String},
    author:{type:mongoose.Schema.Types.ObjectId, ref:'User', required:true},
    likes:[{type:mongoose.Schema.Types.ObjectId, ref:'User'}],
    comments:[{type:mongoose.Schema.Types.ObjectId, ref:'Comment'}],
    startDate:{type:Date},
    endDate:{type:Date},
    description:{type:String, default:''},
    eventStatus:{type:String, enum:['upcoming', 'ongoing', 'completed'], default:'upcoming'},  
    createdAt: {type: Date, default: Date.now},

},  {timestamps: true}
);
export const Event = mongoose.model('Event', eventSchema);