import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import eventRoute from "./routes/event.route.js";
import messageRoute from "./routes/message.route.js";
import { app, server } from "./socket/socket.js";
import path from "path";
 
dotenv.config();


const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://hnbconnect.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['set-cookie']
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

//api routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/event", eventRoute);

// Comment out or modify the static file serving for Vercel deployment
// app.use(express.static(path.join(__dirname, "..", "..", "frontend", "dist")));
// app.get("*", (req, res, next) => {
//   if (req.url.startsWith('/api') || req.method === 'OPTIONS') {
//     return next();
//   }
//   res.sendFile(path.join(__dirname, "..", "..", "frontend", "dist", "index.html"));
// });

// Instead, add this for API-only backend:
app.get('/', (req, res) => {
  res.status(200).json({ message: 'HNB Connect API is running' });
});

// Connect to database before starting server
const startServer = async () => {
  const dbConnected = await connectDB();
  
  const PORT = process.env.PORT || 8000;
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database connection status: ${dbConnected ? "Connected" : "Failed"}`);
  });
};

startServer();