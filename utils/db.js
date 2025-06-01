import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Add retry logic for Vercel serverless environment
    let retries = 3;
    while (retries) {
      try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 30000,
          // Remove directConnection for better compatibility
          maxPoolSize: 10, // Reduce connection pool for serverless
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);
        break;
      } catch (error) {
        console.log(`Connection attempt failed: ${error.message}`);
        retries -= 1;
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!retries) {
      throw new Error("Failed to connect to MongoDB after multiple attempts");
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
    // Don't exit process on Vercel - just log the error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;