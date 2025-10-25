import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { upload } from '../middleware/upload.middleware';
import { parseInvoice } from '../services/openai.service';
import { authenticateToken } from '../middleware/auth.middleware';
import fs from 'fs';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

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

    const expense = await prisma.expense.create({
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

router.post('/upload', upload.single('invoice'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, groupId } = req.body;
    const authenticatedUserId = req.jwtUser?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!userId || !groupId) {
      return res.status(400).json({ error: 'Missing userId or groupId' });
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

    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');

    const parsedData = await parseInvoice(base64Image);

    const expense = await prisma.expense.create({
      data: {
        amount: parsedData.amount || 0,
        description: parsedData.description || 'Invoice expense',
        category: parsedData.category || null,
        date: parsedData.date ? new Date(parsedData.date) : new Date(),
        imageUrl: `/uploads/${req.file.filename}`,
        userId,
        groupId
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ expense, parsedData });
  } catch (error) {
    console.error('Error processing invoice:', error);
    res.status(500).json({ error: 'Failed to process invoice' });
  }
});

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

    const expense = await prisma.expense.update({
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

    await prisma.expense.delete({
      where: { id }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
