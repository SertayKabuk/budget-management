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
        picture: true,
        iban: true,
        phone: true
        // Explicitly exclude: password, googleId, refreshToken, bio (bio is private)
      }
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user's profile (MUST be before /:id route)
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.jwtUser?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        picture: true,
        iban: true,
        phone: true,
        bio: true,
        createdAt: true,
        updatedAt: true
        // Explicitly exclude: password, googleId, refreshToken
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update current user's profile (MUST be before /:id route)
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.jwtUser?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, iban, phone, bio } = req.body;

    // Only allow updating specific fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (iban !== undefined) updateData.iban = iban;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;

    const user = await prisma.user.updateWithAudit({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        picture: true,
        iban: true,
        phone: true,
        bio: true,
        createdAt: true,
        updatedAt: true
        // Explicitly exclude: password, googleId, refreshToken
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get user by ID - admin only (full details with groups)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if requesting user is admin
    if (req.jwtUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        picture: true,
        iban: true,
        phone: true,
        bio: true,
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

// Get public profile - any authenticated user can view
router.get('/:id/public', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.jwtUser?.id;
    
    if (!requestingUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        iban: true,
        phone: true,
        createdAt: true,
        // Exclude: password, googleId, refreshToken, bio (bio is private), role
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if they share any groups
    const sharedGroups = await prisma.groupMember.findMany({
      where: {
        AND: [
          { userId: id },
          {
            group: {
              members: {
                some: {
                  userId: requestingUserId
                }
              }
            }
          }
        ]
      },
      select: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      ...user,
      sharedGroups: sharedGroups.map(sg => sg.group),
      isSharedMember: sharedGroups.length > 0
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
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
        picture: true,
        iban: true,
        phone: true
        // Explicitly exclude: password, googleId, refreshToken, bio
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
