import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Admin users see all groups, regular users only see groups they're members of
    const groups = await prisma.group.findMany({
      where: userRole === 'admin' ? {} : {
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        _count: {
          select: { expenses: true }
        }
      }
    });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Admin users can access any group, regular users must be members
    if (userRole !== 'admin') {
      const groupMembership = await prisma.groupMember.findFirst({
        where: {
          groupId: id,
          userId: userId
        }
      });

      if (!groupMembership) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }
    
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        expenses: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Admin users can access any group summary, regular users must be members
    if (userRole !== 'admin') {
      const groupMembership = await prisma.groupMember.findFirst({
        where: {
          groupId: id,
          userId: userId
        }
      });

      if (!groupMembership) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }
    
    const expenses = await prisma.expense.findMany({
      where: { groupId: id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const totalSpending = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    
    const spendingByUser = expenses.reduce((acc: Record<string, any>, exp: any) => {
      if (!acc[exp.userId]) {
        acc[exp.userId] = {
          user: exp.user,
          total: 0,
          count: 0
        };
      }
      acc[exp.userId].total += exp.amount;
      acc[exp.userId].count += 1;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      totalSpending,
      expenseCount: expenses.length,
      spendingByUser: Object.values(spendingByUser)
    });
  } catch (error) {
    console.error('Error fetching group summary:', error);
    res.status(500).json({ error: 'Failed to fetch group summary' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await prisma.group.create({
      data: { name, description }
    });

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;
    const authenticatedUserId = req.jwtUser?.id;
    const authenticatedUserRole = req.jwtUser?.role;

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Admin users can add members to any group, regular users must be members
    if (authenticatedUserRole !== 'admin') {
      const groupMembership = await prisma.groupMember.findFirst({
        where: {
          groupId: id,
          userId: authenticatedUserId
        }
      });

      if (!groupMembership) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }

    // Check if the user being added already exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToAdd) {
      return res.status(404).json({ error: 'User to add not found' });
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId,
        role: role || 'member'
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

export default router;
