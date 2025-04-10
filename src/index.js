/**
 * Blood Donation System Main Application
 * 
 * This is the main entry point for the Blood Donation System application.
 * It sets up the Express server, database connection, Socket.IO for real-time communication,
 * and configures all necessary middleware and routes.
 * 
 * @module index
 */

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
import * as notificationService from './services/notificationService.js';
// Import the two analytics routers from analyticsRoute.js
import { analyticsRouter, reportsRouter } from "./routes/analyticsRoute.js";

/**
 * ESM Configuration
 * Define __dirname equivalent for ES modules
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment Configuration
 * Load and validate environment variables
 */
const envPath = path.resolve(__dirname, '../.env');
console.log('Looking for .env file at:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error.message);
} else {
  console.log('.env file loaded successfully');
}
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Environment variable validation
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('Error: JWT_SECRET environment variable is not set');
  process.exit(1);
}
if (!process.env.PORT) {
  console.warn('PORT environment variable not set, defaulting to 3000');
}

/**
 * Database Configuration
 * Set up PostgreSQL connection pool and error handling
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err.message);
});

/**
 * Database Connection Test
 * Verify database connectivity on startup
 */
const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    client.release();
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
};

/**
 * Route Imports
 * Import all route modules for different parts of the application
 */
import clientRoutes from "./routes/clientRoute.js";
import donorRoutes from "./routes/donorRoute.js";
import patientRoutes from "./routes/patientRoute.js";
import healthcareInstituteRoutes from "./routes/healthcareInstitutionRoute.js";
import authRoutes from "./routes/authRoute.js";
import notificationRoutes from "./routes/notificationRoute.js";
import requestRoutes from "./routes/requestRoute.js";
import userRoutes from "./routes/userRoute.js";

/**
 * Express Application Setup
 * Initialize Express and configure the HTTP server
 */
const app = express();
const port = process.env.PORT || 3000;

/**
 * Socket.IO Configuration
 * Set up WebSocket server with CORS and authentication
 */
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  } 
});

/**
 * Socket.IO Authentication Middleware
 * Verify JWT tokens for WebSocket connections
 */
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.log('Socket connection rejected: No token provided');
    return next(new Error('Authentication token missing'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.decoded = decoded;
    next();
  } catch (err) {
    console.error('Socket authentication failed:', { token, error: err.message });
    next(new Error('Authentication failed'));
  }
});

// Make io instance available to routes
app.set("io", io);

/**
 * Middleware Configuration
 * Set up essential middleware for the application
 */
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Authentication request logging
app.use((req, res, next) => {
  if (req.path.includes('/api/auth/login')) {
    console.log('Auth request body:', req.body);
  }
  next();
});

/**
 * Route Configuration
 * Mount all API routes with their respective paths
 */
app.use("/api/auth", authRoutes);
app.use("/api", clientRoutes);
app.use("/api", donorRoutes);
app.use("/api", requestRoutes);
app.use("/api", patientRoutes);
app.use("/api", healthcareInstituteRoutes);
app.use("/api", notificationRoutes);
app.use("/api", userRoutes);
app.use("/api/analytics", analyticsRouter);
app.use("/api/reports", reportsRouter);

/**
 * JWT Authentication Middleware
 * Verify JWT tokens for protected routes
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

/**
 * Donor Availability Update Route
 * Update a donor's availability status
 */
app.put('/api/donors/:id/availability', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { is_available } = req.body;
  if (req.user.userId !== parseInt(id) || req.user.role !== 'donor') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query(
      'UPDATE bloodlink_schema.donor SET is_available = $1 WHERE donor_id = $2 RETURNING *',
      [is_available, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Donor not found' });
    res.json({ message: 'Availability updated', donor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Blood Request Creation Route
 * Create a new blood request and notify relevant donors
 */
app.post('/api/blood-requests', authenticateToken, async (req, res) => {
  const { blood_type, units_needed, needed_by, location } = req.body;
  const patientId = req.user.userId;
  try {
    // Create blood request
    const requestResult = await pool.query(
      `INSERT INTO bloodlink_schema.blood_request (patient_id, blood_type, units_needed, needed_by, location, request_status)
       VALUES ($1, $2, $3, $4, $5, 'Pending')
       RETURNING *`,
      [patientId, blood_type, units_needed, needed_by, location]
    );
    const newRequest = requestResult.rows[0];

    // Notify matching donors
    const donors = await pool.query(
      `SELECT donor_id FROM bloodlink_schema.donor WHERE blood_type = $1 AND is_available = TRUE`,
      [blood_type]
    );
    for (const donor of donors.rows) {
      const notification = {
        recipient_id: donor.donor_id,
        recipient_type: 'donor',
        notification_type: 'blood_request',
        notification_title: 'New Blood Request',
        notification_message: `Urgent blood request for ${blood_type} blood type. ${units_needed} units needed by ${needed_by} at ${location}.`,
        related_request_id: newRequest.request_id,
        related_match_id: null
      };
      await notificationService.createNotification(notification, io);
    }

    // Notify admin
    const adminNotification = {
      recipient_id: 1,
      recipient_type: 'admin',
      notification_type: 'blood_request',
      notification_title: 'New Blood Request Created',
      notification_message: `A new blood request for ${blood_type} blood type (${units_needed} units) has been created by patient ${patientId}.`,
      related_request_id: newRequest.request_id,
      related_match_id: null
    };
    await notificationService.createNotification(adminNotification, io);

    res.json({ message: 'Blood request created', request: newRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create blood request' });
  }
});

/**
 * Static File Serving Configuration
 * Serve static files with appropriate headers and caching
 */
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

/**
 * Default Routes
 * Configure routes for the main application pages
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
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
  
  const userId = socket.decoded?.userId;
  const userRole = socket.decoded?.role;

  // Join user-specific room
  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room user_${userId}`);
  } else {
    console.warn(`Socket ${socket.id} has no userId in token`);
  }

  // Join role-specific room (e.g., 'donor', 'patient', 'admin')
  if (userRole) {
    socket.join(userRole);
    console.log(`Socket ${socket.id} joined ${userRole} room`);
  } else {
    console.warn(`Socket ${socket.id} has no role in token`);
  }

  socket.on("joinAdmin", () => {
    if (userRole === 'admin') {
      socket.join("admin_room");
      console.log(`Admin ${userId} joined admin_room`);
      socket.emit('admin_connected', {
        userId,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`Non-admin ${userId} attempted to join admin_room`);
    }
  });

  socket.on("bloodRequest", (data) => {
    console.log(`Broadcasting bloodRequest from ${socket.id}:`, data);
    io.emit("bloodRequest", data);
    io.to("admin_room").emit("bloodRequest", data);
    io.to('healthcare').to('admin').emit('blood_inventory_update', data);
  });

  socket.on("requestAction", (data) => {
    console.log(`Handling requestAction from ${socket.id}:`, data);
    if (data.patientId) io.to(`user_${data.patientId}`).emit("requestAction", data);
    if (data.institutionId) io.to(`user_${data.institutionId}`).emit("requestAction", data);
    io.to("admin_room").emit("requestAction", data);
  });

  socket.on('donor_match', (data) => {
    console.log(`Broadcasting donor_match from ${socket.id}:`, data);
    io.to(`healthcare_${data.institutionId}`).to(`donor_${data.donorId}`).emit('donor_match_found', data);
  });

  // Add handler for fetching notifications on demand
  socket.on('fetch_notifications', async () => {
    try {
      const notifications = await notificationService.getNotifications(userId, userRole);
      socket.emit('notifications', notifications);
    } catch (error) {
      console.error('Error sending notifications via Socket.IO:', error);
      socket.emit('notifications_error', { error: 'Failed to fetch notifications' });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    if (userRole === 'admin') {
      console.log(`Admin ${userId} disconnected`);
    }
  });

  socket.on("error", (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });
});

// Start server after database connection
testDatabaseConnection().then(() => {
  server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
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
