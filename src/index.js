import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

dotenv.config();

import clientRoutes from "./routes/clientRoute.js";
import donorRoutes from "./routes/donorRoute.js";
import patientRoutes from "./routes/patientRoute.js";
import healthcareInstituteRoutes from "./routes/healthcareInstitutionRoute.js";
import authRoutes from "./routes/authRoute.js";
import notificationRoutes from "./routes/notificationRoute.js";

const app = express();
const port = 3000;

// Create an HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Socket.IO authentication middleware for connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, decoded) => {
    if (err) {
      console.error("Socket authentication error:", err);
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.decoded = decoded; // Attach token data (e.g., { userId, userType, ... })
    next();
  });
});

// Make the io instance accessible to controllers via req.app.get('io')
app.set('io', io);

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Serve static files from the "public" directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Mount your API routes
app.use('/api', clientRoutes);
app.use('/api', donorRoutes);
app.use('/api', patientRoutes);
app.use('/api', healthcareInstituteRoutes);
app.use('/api', authRoutes);
app.use('/api', notificationRoutes);

// Serve your main HTML file for any unmatched routes (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Retrieve userId from the decoded token (or from handshake.auth if provided)
  const userId = socket.decoded?.userId || socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room user_${userId}`);
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
