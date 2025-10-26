import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        picture: true
        // Explicitly exclude: password, googleId, refreshToken
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        picture: true,
        // Explicitly exclude: password, googleId, refreshToken
        groupMembers: {
          include: {
            group: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user role - admin only
router.patch('/:id/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin".' });
    }

    // Prevent self-demotion
    if (req.jwtUser?.id === id && role === 'user') {
      return res.status(400).json({ error: 'You cannot demote yourself from admin.' });
    }

    const user = await prisma.user.updateWithAudit({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        picture: true
        // Explicitly exclude: password, googleId, refreshToken
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Manual user creation is disabled - users are created automatically via Google OAuth
// Only authenticated users via Google OAuth are valid users

export default router;
