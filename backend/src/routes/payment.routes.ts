import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { authenticateToken, isPaymentParticipantOrAdmin } from '../middleware/auth.middleware';
import { PaymentStatus } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/payments - List payments with optional groupId filter
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

      const payments = await prisma.payment.findMany({
        where: { groupId: groupId as string },
        include: {
          fromUser: { select: { id: true, name: true, email: true } },
          toUser: { select: { id: true, name: true, email: true } },
          group: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json(payments);
    }

    // If no groupId specified, return payments from all groups where user is a member
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: userId },
      select: { groupId: true }
    });

    const groupIds = userGroups.map((g: { groupId: string }) => g.groupId);

    const payments = await prisma.payment.findMany({
      where: {
        groupId: {
          in: groupIds
        }
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/payments/:id - Get single payment
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify user is a member of the group this payment belongs to
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: payment.groupId,
        userId: userId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// POST /api/payments - Create new payment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { fromUserId, toUserId, groupId, amount, description } = req.body;
    const authenticatedUserId = req.jwtUser?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validation
    if (!fromUserId || !toUserId || !groupId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: fromUserId, toUserId, groupId, amount' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: 'fromUserId and toUserId must be different' });
    }

    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description must be less than 500 characters' });
    }

    // Verify authenticated user is a member of the group
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: authenticatedUserId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    // Verify both users exist and are group members
    const fromUserMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: fromUserId }
    });

    const toUserMembership = await prisma.groupMember.findFirst({
      where: { groupId, userId: toUserId }
    });

    if (!fromUserMembership) {
      return res.status(400).json({ error: 'fromUser is not a member of this group' });
    }

    if (!toUserMembership) {
      return res.status(400).json({ error: 'toUser is not a member of this group' });
    }

    const payment = await prisma.payment.createWithAudit({
      data: {
        amount: parseFloat(amount),
        fromUserId,
        toUserId,
        groupId,
        description,
        status: PaymentStatus.PENDING
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PUT /api/payments/:id - Update payment (status and/or full edit)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, description, fromUserId, toUserId, amount } = req.body;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the existing payment
    const existingPayment = await prisma.payment.findUnique({
      where: { id }
    });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify user is a member of the group
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: existingPayment.groupId,
        userId: userId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    // Verify user has permission (is participant, group admin, or global admin)
    const hasPermission = await isPaymentParticipantOrAdmin(
      userId,
      id,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: You can only edit payments involving yourself unless you are a group admin'
      });
    }

    // Validate status if provided
    if (status && !Object.values(PaymentStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Validate amount if provided
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Validate users are different if both are provided
    if (fromUserId && toUserId && fromUserId === toUserId) {
      return res.status(400).json({ error: 'fromUserId and toUserId must be different' });
    }

    // Validate description length if provided
    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description must be less than 500 characters' });
    }

    // If updating users, verify they are group members
    if (fromUserId) {
      const fromUserMembership = await prisma.groupMember.findFirst({
        where: { groupId: existingPayment.groupId, userId: fromUserId }
      });
      if (!fromUserMembership) {
        return res.status(400).json({ error: 'fromUser is not a member of this group' });
      }
    }

    if (toUserId) {
      const toUserMembership = await prisma.groupMember.findFirst({
        where: { groupId: existingPayment.groupId, userId: toUserId }
      });
      if (!toUserMembership) {
        return res.status(400).json({ error: 'toUser is not a member of this group' });
      }
    }

    const updateData: any = {
      ...(status !== undefined && { status }),
      ...(description !== undefined && { description }),
      ...(fromUserId !== undefined && { fromUserId }),
      ...(toUserId !== undefined && { toUserId }),
      ...(amount !== undefined && { amount: parseFloat(amount) })
    };

    // Set completedAt when status changes to COMPLETED
    if (status === PaymentStatus.COMPLETED && existingPayment.status !== PaymentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const payment = await prisma.payment.updateWithAudit({
      where: { id },
      data: updateData,
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.jwtUser?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get the existing payment
    const existingPayment = await prisma.payment.findUnique({
      where: { id }
    });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify user is a member of the group
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: existingPayment.groupId,
        userId: userId
      }
    });

    if (!groupMembership) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    // Verify user has permission (is participant, group admin, or global admin)
    const hasPermission = await isPaymentParticipantOrAdmin(
      userId,
      id,
      req.jwtUser?.role
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: You can only delete payments involving yourself unless you are a group admin'
      });
    }

    await prisma.payment.deleteWithAudit({
      where: { id }
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;
