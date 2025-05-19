import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Event } from "../models/event.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";


// Middleware to check user is faculty or not
export const isFaculty = async (req, res, next) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        
        if (!user || user.role !== 'faculty') {
            return res.status(403).json({
                message: 'Only faculty members can create events',
                success: false
            });
        }
        
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Server error',
            success: false
        });
    }
};


// Create new event - matches your frontend EventPost.jsx implementation
export const addNewEvent = async (req, res) => {
    try {
        const { caption, startDate, endDate } = req.body;
        const image = req.file;
        const authorId = req.id;
        
        // Check for required fields (based on your frontend validation)
        if (!caption && !image) {
            return res.status(400).json({
                message: 'Please provide at least a caption or image',
                success: false
            });
        }
        
        // Image upload and processing - reusing your post controller pattern
        let imageUrl = null;
        if (image) {
            try {
                const optimizedImageBuffer = await sharp(image.buffer)
                    .resize({ width: 800, height: 800, fit: 'inside' })
                    .toFormat('jpeg', { quality: 80 })
                    .toBuffer();
                
                const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
                const cloudResponse = await cloudinary.uploader.upload(fileUri);
                imageUrl = cloudResponse.secure_url;
            } catch (imageError) {
                console.log("Image processing error:", imageError);
                return res.status(500).json({
                    message: 'Failed to process image',
                    success: false
                });
            }
        }
        
        // Prepare event data
        const eventData = {
            caption,
            author: authorId,
            image: imageUrl
        };
        
        // Add dates if provided
        if (startDate) eventData.startDate = new Date(startDate);
        if (endDate) eventData.endDate = new Date(endDate);
        
        // Set event status based on dates
        const currentDate = new Date();
        if (startDate && endDate) {
            const eventStartDate = new Date(startDate);
            const eventEndDate = new Date(endDate);
            
            if (currentDate >= eventStartDate && currentDate <= eventEndDate) {
                eventData.eventStatus = 'ongoing';
            } else if (currentDate > eventEndDate) {
                eventData.eventStatus = 'completed';
            } else {
                eventData.eventStatus = 'upcoming';
            }
        }
        
        // Create the event
        const event = await Event.create(eventData);
        
        // Update user's events list (optional)
        const user = await User.findById(authorId);
        if (user) {
            if (!user.events) user.events = [];
            user.events.push(event._id);
            await user.save();
        }
        
        // Populate author details
        await event.populate({ path: 'author', select: '-password' });
        
        return res.status(201).json({
            message: 'Event created successfully',
            event: event, // Change from post to event
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: error.message || 'Failed to create event',
            success: false
        });
    }
};



// Get all events
export const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture fullName role department' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture fullName role'
                }
            });
        
        // Update event statuses based on current date
        const currentDate = new Date();
        for (const event of events) {
            if (event.startDate && event.endDate) {
                if (currentDate >= event.startDate && currentDate <= event.endDate) {
                    if (event.eventStatus !== 'ongoing') {
                        event.eventStatus = 'ongoing';
                        await event.save();
                    }
                } else if (currentDate > event.endDate) {
                    if (event.eventStatus !== 'completed') {
                        event.eventStatus = 'completed';
                        await event.save();
                    }
                }
            }
        }
        
        return res.status(200).json({
            events,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Failed to fetch events',
            success: false
        });
    }
};


// Like an event
export const likeEvent = async (req, res) => {
    try {
        const likerUserId = req.id;
        const eventId = req.params.id;
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ 
                message: 'Event not found', 
                success: false 
            });
        }
        
        // Check if already liked
        if (event.likes.includes(likerUserId)) {
            return res.status(400).json({
                message: 'Event already liked',
                success: false
            });
        }
        
        // Add like
        event.likes.push(likerUserId);
        await event.save();
        
        // Send notification if author is different from liker
        const eventAuthorId = event.author.toString();
        if (eventAuthorId !== likerUserId) {
            const user = await User.findById(likerUserId).select('username profilePicture fullName');
            
            // Send real-time notification
            const notification = {
                type: 'like',
                userId: likerUserId,
                userDetails: user,
                eventId,
                message: 'Your event was liked'
            };
            
            const authorSocketId = getReceiverSocketId(eventAuthorId);
            if (authorSocketId) {
                io.to(authorSocketId).emit('notification', notification);
            }
        }
        
        return res.status(200).json({
            message: 'Event liked',
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Failed to like event',
            success: false
        });
    }
};

// Unlike an event
export const unlikeEvent = async (req, res) => {
    try {
        const userId = req.id;
        const eventId = req.params.id;
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ 
                message: 'Event not found', 
                success: false 
            });
        }
        
        // Remove like
        event.likes = event.likes.filter(id => id.toString() !== userId);
        await event.save();
        
        return res.status(200).json({
            message: 'Event unliked',
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Failed to unlike event',
            success: false
        });
    }
};


// Add comment to an event
export const addEventComment = async (req, res) => {
    try {
        const eventId = req.params.id;
        const commenterId = req.id;
        const { text } = req.body;
        
        if (!text || text.trim() === '') {
            return res.status(400).json({
                message: 'Comment text is required',
                success: false
            });
        }
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                message: 'Event not found',
                success: false
            });
        }
        
        // Create comment
        const comment = await Comment.create({
            text,
            author: commenterId,
            post: eventId // reusing the post field from Comment model
        });
        
        // Add comment to event
        event.comments.push(comment._id);
        await event.save();
        
        // Populate comment with author details
        await comment.populate({ path: 'author', select: 'username profilePicture fullName role' });
        
        // Notify event author if different from commenter
        const eventAuthorId = event.author.toString();
        if (eventAuthorId !== commenterId) {
            const commenter = await User.findById(commenterId).select('username profilePicture fullName');
            
            // Send real-time notification
            const notification = {
                type: 'comment',
                userId: commenterId,
                userDetails: commenter,
                eventId,
                commentId: comment._id,
                message: 'commented on your event'
            };
            
            const authorSocketId = getReceiverSocketId(eventAuthorId);
            if (authorSocketId) {
                io.to(authorSocketId).emit('notification', notification);
            }
        }
        
        return res.status(201).json({
            message: 'Comment added',
            comment,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Failed to add comment',
            success: false
        });
    }
};

// Delete an event (faculty only or admin)
export const deleteEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.id;
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                message: 'Event not found',
                success: false
            });
        }
        
        // Check if user is authorized (event author or admin)
        const user = await User.findById(userId);
        if (event.author.toString() !== userId && user.role !== 'admin') {
            return res.status(403).json({
                message: 'Not authorized to delete this event',
                success: false
            });
        }
        
        // Delete all comments associated with the event
        await Comment.deleteMany({ post: eventId });
        
        // Delete the event
        await Event.findByIdAndDelete(eventId);
        
        // Remove from user's events list if exists
        if (user.events) {
            user.events = user.events.filter(id => id.toString() !== eventId);
            await user.save();
        }
        
        return res.status(200).json({
            message: 'Event deleted successfully',
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Failed to delete event',
            success: false
        });
    }
};

// Get event comments
export const getEventComments = async (req, res) => {
    try {
        const eventId = req.params.id;
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                message: 'Event not found',
                success: false
            });
        }
        
        // Fetch comments with populated author details
        const comments = await Comment.find({ post: eventId })
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture fullName role' });
        
        return res.status(200).json({
            comments,
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Failed to fetch comments',
            success: false
        });
    }
};