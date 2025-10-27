import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, isExpenseOwnerOrAdmin } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Proxied endpoint for serving images with authentication
router.get('/image/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify the expense with this image exists and user has access to it
    const expense = await prisma.expense.findFirst({
      where: {
        imageUrl: `/uploads/${filename}`,
        group: {
          members: {
            some: {
              userId: userId
            }
          }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Image not found or access denied' });
    }

    // Serve the file
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.query;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // If groupId is specified, verify user is a member of that group
    if (groupId) {
      const groupMembership = await prisma.groupMember.findFirst({
        where: {
          groupId: groupId as string,
          userId: userId
        }
      });

      if (!groupMembership) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }

      const expenses = await prisma.expense.findMany({
        where: { groupId: groupId as string },
        include: {
          user: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true } }
        },
        orderBy: { date: 'desc' }
      });

      return res.json(expenses);
    }

    // If no groupId specified, return expenses from all groups where user is a member
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: userId },
      select: { groupId: true }
    });

    const groupIds = userGroups.map((g: { groupId: string }) => g.groupId);

    const expenses = await prisma.expense.findMany({
      where: {
        groupId: {
          in: groupIds
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify user is a member of the group this expense belongs to
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: expense.groupId,
        userId: userId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { amount, description, category, date, userId, groupId } = req.body;
    const authenticatedUserId = req.jwtUser?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || !description || !userId || !groupId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify user is a member of the group
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: authenticatedUserId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    const expense = await prisma.expense.createWithAudit({
      data: {
        amount: parseFloat(amount),
        description,
        category,
        date: date ? new Date(date) : new Date(),
        userId,
        groupId
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Invoice upload is now handled through WebSocket chat interface
// This endpoint is deprecated and kept only for backward compatibility

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description, category, date } = req.body;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // First, get the expense to check group membership
    const existingExpense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify user is a member of the group
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: existingExpense.groupId,
        userId: userId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    // Verify user has permission (is owner, group admin, or global admin)
    const hasPermission = await isExpenseOwnerOrAdmin(
      userId,
      id,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: You can only edit your own expenses unless you are a group admin'
      });
    }

    const expense = await prisma.expense.updateWithAudit({
      where: { id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        description,
        category,
        date: date ? new Date(date) : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // First, get the expense to check group membership
    const existingExpense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Verify user is a member of the group
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: existingExpense.groupId,
        userId: userId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    // Verify user has permission (is owner, group admin, or global admin)
    const hasPermission = await isExpenseOwnerOrAdmin(
      userId,
      id,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: You can only delete your own expenses unless you are a group admin'
      });
    }

    await prisma.expense.deleteWithAudit({
      where: { id }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
