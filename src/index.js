// index.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// PostgreSQL connection setup using Pool (alternative to db.js client)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Import routes
import clientRoutes from "./routes/clientRoute.js";
import donorRoutes from "./routes/donorRoute.js";
import patientRoutes from "./routes/patientRoute.js";
import healthcareInstituteRoutes from "./routes/healthcareInstitutionRoute.js";
import authRoutes from "./routes/authRoute.js";
import notificationRoutes from "./routes/notificationRoute.js";
import requestRoutes from "./routes/requestRoute.js";

const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  } 
});

// Socket.IO setup with authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication token missing'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    socket.decoded = decoded;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    next(new Error('Authentication failed'));
  }
});

app.set("io", io);

// Essential Middlewares
app.use(cors());
app.use(express.json());

// Debug middleware for request logging
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Debug middleware for auth requests
app.use((req, res, next) => {
  if (req.path.includes('/api/auth/login')) {
    console.log('Auth request body:', req.body);
  }
  next();
});

// Mount auth routes first
app.use("/api/auth", authRoutes);

// Mount other API routes
app.use("/api", clientRoutes);
app.use("/api", donorRoutes);
app.use("/api", patientRoutes);
app.use("/api", healthcareInstituteRoutes);
app.use("/api", notificationRoutes);
app.use("/api", requestRoutes);

// Set up __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static file serving AFTER API routes
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res, filepath) => {
    const ext = path.extname(filepath);
    if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    } else if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard routes
app.get('/donor-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'donor-dashboard.html'));
});

app.get('/patient-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'patient-dashboard.html'));
});

app.get('/healthcare-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'healthcare-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Login route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test route for CSS
app.get('/test-css', (req, res) => {
  res.send(`
    <html>
      <head>
        <link rel="stylesheet" href="/patient-dashboard.css">
      </head>
      <body>
        <h1>CSS Test Page</h1>
        <div class="patient-profile">
          <div class="profile-header">
            <div class="profile-avatar">P</div>
            <div class="profile-info">
              <h2>Test Patient</h2>
              <p>ID: TEST123</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Handle 404s - MUST be last
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).send('File not found');
  }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  
  // Join user-specific room
  const userId = socket.decoded?.userId;
  const userType = socket.decoded?.role;
  
  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room user_${userId}`);
  }

  // Join role-specific room
  if (userType) {
    socket.join(userType);
    console.log(`Socket ${socket.id} joined ${userType} room`);
  }

  socket.on("joinAdmin", () => {
    if (socket.decoded?.role === 'admin') {
      socket.join("admin_room");
      console.log(`Admin ${socket.decoded.userId} joined admin_room`);
      // Send initial admin data
      socket.emit('admin_connected', {
        userId: socket.decoded.userId,
        timestamp: new Date()
      });
    }
  });

  socket.on("bloodRequest", (data) => {
    io.emit("bloodRequest", data);
    io.to("admin_room").emit("bloodRequest", data);
    io.to('healthcare').to('admin').emit('blood_inventory_update', data);
  });

  socket.on("requestAction", (data) => {
    if (data.patientId) io.to(`user_${data.patientId}`).emit("requestAction", data);
    if (data.institutionId) io.to(`user_${data.institutionId}`).emit("requestAction", data);
    io.to("admin_room").emit("requestAction", data);
  });

  socket.on('donor_match', (data) => {
    io.to(`healthcare_${data.institutionId}`).to(`donor_${data.donorId}`).emit('donor_match_found', data);
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    if (socket.decoded?.role === 'admin') {
      console.log(`Admin ${socket.decoded.userId} disconnected`);
    }
  });

  // Handle socket errors
  socket.on("error", (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// Global error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Export pool for use in routes if needed
export { pool };
