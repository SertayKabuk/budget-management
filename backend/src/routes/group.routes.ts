import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, isGroupAdminOrGlobalAdmin } from '../middleware/auth.middleware';
import { convertDecimalsToNumbers } from '../utils/decimalUtils';

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

    res.json(convertDecimalsToNumbers(groups));
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

    res.json(convertDecimalsToNumbers(group));
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

    // Convert Decimal amounts to numbers for proper calculation
    const expensesWithNumbers = convertDecimalsToNumbers(expenses);
    
    const totalSpending = expensesWithNumbers.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    
    const spendingByUser = expensesWithNumbers.reduce((acc: Record<string, any>, exp: any) => {
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
      expenseCount: expensesWithNumbers.length,
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
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create group and automatically add creator as admin member
    const group = await prisma.group.createWithAudit({
      data: { 
        name, 
        description,
        members: {
          create: {
            userId: userId,
            role: 'admin'
          }
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    res.status(201).json(convertDecimalsToNumbers(group));
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(
      userId,
      id,
      userRole
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can edit group settings'
      });
    }

    const group = await prisma.group.updateWithAudit({
      where: { id },
      data: { name, description }
    });

    res.json(convertDecimalsToNumbers(group));
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
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

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(
      authenticatedUserId,
      id,
      authenticatedUserRole
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can add members'
      });
    }

    // Check if the user being added already exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToAdd) {
      return res.status(404).json({ error: 'User to add not found' });
    }

    const member = await prisma.groupMember.createWithAudit({
      data: {
        groupId: id,
        userId,
        role: role || 'member'
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(convertDecimalsToNumbers(member));
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.get('/:id/members', async (req: Request, res: Response) => {
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

    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(convertDecimalsToNumbers(members));
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

router.delete('/:groupId/members/:memberId', async (req: Request, res: Response) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(userId, groupId, userRole);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can remove members'
      });
    }

    // Prevent removing self if last admin
    const groupMember = await prisma.groupMember.findUnique({
      where: { id: memberId }
    });

    if (!groupMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (groupMember.userId === userId && groupMember.role === 'admin') {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: 'admin' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Cannot remove the last group admin. Promote another member first.'
        });
      }
    }

    // Check if user has any financial data in the group
    const [expenseCount, paymentsFromCount, paymentsToCount] = await Promise.all([
      prisma.expense.count({
        where: {
          groupId: groupId,
          userId: groupMember.userId
        }
      }),
      prisma.payment.count({
        where: {
          groupId: groupId,
          fromUserId: groupMember.userId
        }
      }),
      prisma.payment.count({
        where: {
          groupId: groupId,
          toUserId: groupMember.userId
        }
      })
    ]);

    const totalFinancialRecords = expenseCount + paymentsFromCount + paymentsToCount;

    if (totalFinancialRecords > 0) {
      return res.status(400).json({
        error: `Cannot remove member: They have ${expenseCount} expense(s) and ${paymentsFromCount + paymentsToCount} payment(s) in this group. Removing them would break debt calculations. Please settle debts first or keep them as a member.`,
        details: {
          expenses: expenseCount,
          paymentsFrom: paymentsFromCount,
          paymentsTo: paymentsToCount
        }
      });
    }

    await prisma.groupMember.deleteWithAudit({
      where: { id: memberId }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

router.patch('/:groupId/members/:memberId/role', async (req: Request, res: Response) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!role || !['member', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "member" or "admin"' });
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(userId, groupId, userRole);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can change member roles'
      });
    }

    const groupMember = await prisma.groupMember.findUnique({
      where: { id: memberId }
    });

    if (!groupMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Prevent demoting self if last admin
    if (groupMember.userId === userId && groupMember.role === 'admin' && role === 'member') {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: 'admin' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Cannot demote yourself as the last group admin. Promote another member first.'
        });
      }
    }

    const updatedMember = await prisma.groupMember.updateWithAudit({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(convertDecimalsToNumbers(updatedMember));
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

export default router;
