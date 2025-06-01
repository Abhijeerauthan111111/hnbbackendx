import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    console.log("Connection string configured:", process.env.MONGO_URI ? "Yes" : "No");
    
    // Add retry logic for Vercel serverless environment
    let retries = 3;
    while (retries) {
      try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 30000,
          maxPoolSize: 10
        });
        console.log(`MongoDB connected successfully: ${conn.connection.host}`);
        return true;
      } catch (error) {
        console.log(`Connection attempt ${4-retries} failed: ${error.message}`);
        retries -= 1;
        
        if (retries) {
          console.log(`Retrying in 1 second... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log("All connection attempts failed");
    return false;
  } catch (error) {
    console.log(`Error in connectDB: ${error.message}`);
    return false;
  }
};

export default connectDB;