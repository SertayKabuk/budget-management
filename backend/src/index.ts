import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import passport from './config/passport';
import expenseRoutes from './routes/expense.routes';
import groupRoutes from './routes/group.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import auditRoutes from './routes/audit.routes';
import paymentRoutes from './routes/payment.routes';
import reminderRoutes from './routes/reminder.routes';
import inviteRoutes from './routes/invite.routes';
import { setupWebSocket } from './websocket/socket';
import { authenticateToken, clearAuditContextMiddleware } from './middleware/auth.middleware';
import { initGroupMembershipCache } from './middleware/groupMembership.middleware';

dotenv.config();

const execAsync = promisify(exec);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
// Initialize group membership cache for each request (performance optimization)
app.use(initGroupMembershipCache);
// Clear audit context after each request
app.use(clearAuditContextMiddleware);
// Protect uploads directory with authentication
app.use('/uploads', authenticateToken, express.static('uploads'));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api', inviteRoutes);

setupWebSocket(io);

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log('Running database migrations...');
    await execAsync('npx prisma migrate deploy');
    console.log('✓ Migrations completed successfully');

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };
