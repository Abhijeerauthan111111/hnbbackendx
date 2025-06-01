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
import { fileURLToPath } from 'url';

dotenv.config();

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.options('*', cors()); // Enable preflight for all routes
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


app.use(express.static(path.join(__dirname, "..", "..", "frontend", "dist")));
app.get("*", (req, res, next) => {
  if (req.url.startsWith('/api') || req.method === 'OPTIONS') {
    return next();
  }
  res.sendFile(path.join(__dirname, "..", "..", "frontend", "dist", "index.html"));
});


server.listen(PORT, () => {
    connectDB();
    console.log(`Server listen at port ${PORT}`);
});