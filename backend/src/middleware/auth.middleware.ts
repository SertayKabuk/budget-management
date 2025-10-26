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
