import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, isGroupAdminOrGlobalAdmin } from '../middleware/auth.middleware';
import { checkGroupMembership } from '../middleware/groupMembership.middleware';
import { ReminderFrequency } from '@prisma/client';
import { convertDecimalsToNumbers } from '../utils/decimalUtils';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/reminders - List reminders with optional groupId filter
router.get('/', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.query;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // If groupId is specified, verify user is a member of that group unless global admin
    if (groupId) {
      if (req.jwtUser?.role !== 'admin') {
        const membership = await checkGroupMembership(userId, groupId as string, req);

        if (!membership || !membership.isMember) {
          return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
        }
      }

      const reminders = await prisma.recurringReminder.findMany({
        where: { groupId: groupId as string },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true } }
        },
        orderBy: { nextDueDate: 'asc' }
      });

      return res.json(convertDecimalsToNumbers(reminders));
    }

    // If no groupId specified, return reminders from all groups where user is a member
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: userId },
      select: { groupId: true }
    });

    const groupIds = userGroups.map((g: { groupId: string }) => g.groupId);

    const reminders = await prisma.recurringReminder.findMany({
      where: {
        groupId: {
          in: groupIds
        }
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      },
      orderBy: { nextDueDate: 'asc' }
    });

    res.json(convertDecimalsToNumbers(reminders));
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// GET /api/reminders/:id - Get single reminder
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const reminder = await prisma.recurringReminder.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Verify user is a member of the group this reminder belongs to unless global admin
    if (req.jwtUser?.role !== 'admin') {
      const membership = await checkGroupMembership(userId, reminder.groupId, req);

      if (!membership || !membership.isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }

    res.json(convertDecimalsToNumbers(reminder));
  } catch (error) {
    console.error('Error fetching reminder:', error);
    res.status(500).json({ error: 'Failed to fetch reminder' });
  }
});

// POST /api/reminders - Create new reminder
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, amount, frequency, groupId, nextDueDate } = req.body;
    const authenticatedUserId = req.jwtUser?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validation
    if (!title || !amount || !frequency || !groupId || !nextDueDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, amount, frequency, groupId, nextDueDate' 
      });
    }

    if (!title.trim()) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    if (amount < 0) {
      return res.status(400).json({ error: 'Amount must be greater than or equal to 0' });
    }

    if (!Object.values(ReminderFrequency).includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency value' });
    }

    const dueDate = new Date(nextDueDate);
    if (isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: 'Invalid nextDueDate format' });
    }

    if (dueDate < new Date()) {
      return res.status(400).json({ error: 'nextDueDate must be in the future' });
    }

    // Verify authenticated user is a member of the group unless global admin
    if (req.jwtUser?.role !== 'admin') {
      const membership = await checkGroupMembership(authenticatedUserId, groupId, req);

      if (!membership || !membership.isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(
      authenticatedUserId,
      groupId,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can create reminders'
      });
    }

    const reminder = await prisma.recurringReminder.createWithAudit({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        amount: parseFloat(amount),
        frequency,
        groupId,
        nextDueDate: dueDate,
        createdById: authenticatedUserId,
        isActive: true
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(convertDecimalsToNumbers(reminder));
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// PUT /api/reminders/:id - Update reminder
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, amount, frequency, nextDueDate } = req.body;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the existing reminder
    const existingReminder = await prisma.recurringReminder.findUnique({
      where: { id }
    });

    if (!existingReminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Verify user is a member of the group unless global admin
    if (req.jwtUser?.role !== 'admin') {
      const membership = await checkGroupMembership(userId, existingReminder.groupId, req);

      if (!membership || !membership.isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(
      userId,
      existingReminder.groupId,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can edit reminders'
      });
    }

    // Validation for provided fields
    const updateData: any = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (amount !== undefined) {
      if (amount < 0) {
        return res.status(400).json({ error: 'Amount must be greater than or equal to 0' });
      }
      updateData.amount = parseFloat(amount);
    }

    if (frequency !== undefined) {
      if (!Object.values(ReminderFrequency).includes(frequency)) {
        return res.status(400).json({ error: 'Invalid frequency value' });
      }
      updateData.frequency = frequency;
    }

    if (nextDueDate !== undefined) {
      const dueDate = new Date(nextDueDate);
      if (isNaN(dueDate.getTime())) {
        return res.status(400).json({ error: 'Invalid nextDueDate format' });
      }
      updateData.nextDueDate = dueDate;
    }

    const reminder = await prisma.recurringReminder.updateWithAudit({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.json(convertDecimalsToNumbers(reminder));
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// PATCH /api/reminders/:id/toggle - Toggle active status
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the existing reminder
    const existingReminder = await prisma.recurringReminder.findUnique({
      where: { id }
    });

    if (!existingReminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Verify user is a member of the group unless global admin
    if (req.jwtUser?.role !== 'admin') {
      const membership = await checkGroupMembership(userId, existingReminder.groupId, req);

      if (!membership || !membership.isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(
      userId,
      existingReminder.groupId,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can toggle reminders'
      });
    }

    const reminder = await prisma.recurringReminder.updateWithAudit({
      where: { id },
      data: {
        isActive: !existingReminder.isActive
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.json(convertDecimalsToNumbers(reminder));
  } catch (error) {
    console.error('Error toggling reminder:', error);
    res.status(500).json({ error: 'Failed to toggle reminder' });
  }
});

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the existing reminder
    const existingReminder = await prisma.recurringReminder.findUnique({
      where: { id }
    });

    if (!existingReminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Verify user is a member of the group unless global admin
    if (req.jwtUser?.role !== 'admin') {
      const membership = await checkGroupMembership(userId, existingReminder.groupId, req);

      if (!membership || !membership.isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
      }
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(
      userId,
      existingReminder.groupId,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can delete reminders'
      });
    }

    await prisma.recurringReminder.deleteWithAudit({
      where: { id }
    });

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export default router;
