import express, { Request, Response } from 'express';
import passport from '../config/passport';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT secret is not defined in environment variables.');
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Generate JWT token
const generateToken = (user: { id: string; email: string; name: string; picture?: string | null; role?: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, picture: user.picture, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Initiate Google OAuth
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=auth_failed` 
  }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_user`);
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
    });

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  res.json({ user: req.jwtUser });
});

// Logout
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
