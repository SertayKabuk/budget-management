import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { setAuditContext, clearAuditContext } from '../prisma';

export interface JWTUser {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      jwtUser?: JWTUser;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret) as JWTUser;
    req.jwtUser = decoded;
    
    // Set audit context for this request
    setAuditContext({
      userId: decoded.id,
      userName: decoded.name,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.jwtUser) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.jwtUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const decoded = jwt.verify(token, secret) as JWTUser;
      req.jwtUser = decoded;
      
      // Set audit context for this request
      setAuditContext({
        userId: decoded.id,
        userName: decoded.name,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      // Token invalid but continue anyway
    }
  }
  next();
};

// Middleware to clear audit context after request
export const clearAuditContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    clearAuditContext();
  });
  next();
};

// Authorization Helper Functions

/**
 * Check if a user is a group admin for a specific group
 * @param userId - The user ID to check
 * @param groupId - The group ID to check
 * @returns true if user is a group admin, false otherwise
 */
export async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const prisma = (await import('../prisma')).default;
  const groupMember = await prisma.groupMember.findFirst({
    where: {
      userId,
      groupId,
      role: 'admin'
    }
  });
  return !!groupMember;
}

/**
 * Check if a user is a group admin OR a global admin
 * @param userId - The user ID to check
 * @param groupId - The group ID to check
 * @param userGlobalRole - The user's global role (optional)
 * @returns true if user is a group admin or global admin, false otherwise
 */
export async function isGroupAdminOrGlobalAdmin(
  userId: string, 
  groupId: string, 
  userGlobalRole?: string
): Promise<boolean> {
  if (userGlobalRole === 'admin') return true;
  return await isGroupAdmin(userId, groupId);
}

/**
 * Check if a user is the expense owner OR a group admin OR a global admin
 * @param userId - The user ID to check
 * @param expenseId - The expense ID to check
 * @param userGlobalRole - The user's global role (optional)
 * @returns true if user has permission to edit the expense, false otherwise
 */
export async function isExpenseOwnerOrAdmin(
  userId: string, 
  expenseId: string, 
  userGlobalRole?: string
): Promise<boolean> {
  const prisma = (await import('../prisma')).default;
  
  // Global admin bypass
  if (userGlobalRole === 'admin') return true;
  
  // Fetch expense
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { userId: true, groupId: true }
  });
  
  if (!expense) return false;
  
  // Check if user is the owner
  if (expense.userId === userId) return true;
  
  // Check if user is a group admin
  return await isGroupAdmin(userId, expense.groupId);
}

/**
 * Check if a user is a payment participant OR a group admin OR a global admin
 * @param userId - The user ID to check
 * @param paymentId - The payment ID to check
 * @param userGlobalRole - The user's global role (optional)
 * @returns true if user has permission to edit the payment, false otherwise
 */
export async function isPaymentParticipantOrAdmin(
  userId: string, 
  paymentId: string, 
  userGlobalRole?: string
): Promise<boolean> {
  const prisma = (await import('../prisma')).default;
  
  // Global admin bypass
  if (userGlobalRole === 'admin') return true;
  
  // Fetch payment
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { fromUserId: true, toUserId: true, groupId: true }
  });
  
  if (!payment) return false;
  
  // Check if user is a participant
  if (payment.fromUserId === userId || payment.toUserId === userId) return true;
  
  // Check if user is a group admin
  return await isGroupAdmin(userId, payment.groupId);
}
