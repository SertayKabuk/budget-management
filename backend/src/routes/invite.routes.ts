import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';
import { checkGroupMembership } from '../middleware/groupMembership.middleware';
import prisma from '../prisma';
import { InviteStatus } from '@prisma/client';

const router = Router();

// Create a new invite (requires group membership)
router.post('/groups/:groupId/invites', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { expiresIn, maxUses } = req.body; // expiresIn in days, maxUses optional
    const userId = req.jwtUser!.id;

    // Check if user is a member of the group
    const membership = await checkGroupMembership(userId, groupId, req);

    if (!membership || !membership.isMember) {
      return res.status(403).json({ error: 'You must be a member of the group to create invites' });
    }

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresIn && typeof expiresIn === 'number' && expiresIn > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
    }

    // Create the invite
    const invite = await prisma.groupInvite.createWithAudit({
      data: {
        groupId,
        invitedById: userId,
        expiresAt,
        maxUses: maxUses || null,
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            picture: true,
          },
        },
      },
    });

    res.json(invite);
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Get invite info (public - no auth required, but supports optional auth)
router.get('/invites/:code', optionalAuth, async (req, res) => {
  try {
    const { code } = req.params;

    const invite = await prisma.groupInvite.findUnique({
      where: { code },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        invitedBy: {
          select: {
            name: true,
            picture: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      // Auto-update status to EXPIRED if not already
      if (invite.status === InviteStatus.ACTIVE) {
        await prisma.groupInvite.updateWithAudit({
          where: { id: invite.id },
          data: { status: InviteStatus.EXPIRED },
        });
      }
      return res.status(410).json({ error: 'This invite has expired' });
    }

    // Check if invite is revoked
    if (invite.status === InviteStatus.REVOKED) {
      return res.status(410).json({ error: 'This invite has been revoked' });
    }

    // Check if max uses reached
    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return res.status(410).json({ error: 'This invite has reached its maximum number of uses' });
    }

    // Check if user is already a member (if authenticated)
    let alreadyMember = false;
    if (req.jwtUser) {
      const membership = await checkGroupMembership(req.jwtUser.id, invite.groupId, req);
      alreadyMember = membership ? membership.isMember : false;
    }

    res.json({
      ...invite,
      alreadyMember,
    });
  } catch (error) {
    console.error('Error fetching invite:', error);
    res.status(500).json({ error: 'Failed to fetch invite' });
  }
});

// Accept an invite (requires authentication)
router.post('/invites/:code/accept', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.jwtUser!.id;

    const invite = await prisma.groupInvite.findUnique({
      where: { code },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await prisma.groupInvite.updateWithAudit({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      });
      return res.status(410).json({ error: 'This invite has expired' });
    }

    // Check if invite is active
    if (invite.status !== InviteStatus.ACTIVE) {
      return res.status(410).json({ error: 'This invite is no longer active' });
    }

    // Check if max uses reached
    if (invite.maxUses && invite.usedCount >= invite.maxUses) {
      return res.status(410).json({ error: 'This invite has reached its maximum number of uses' });
    }

    // Check if user is already a member
    const existingMembership = await checkGroupMembership(userId, invite.groupId, req);

    if (existingMembership && existingMembership.isMember) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    // Add user to group
    const membership = await prisma.groupMember.createWithAudit({
      data: {
        userId,
        groupId: invite.groupId,
        role: 'member',
      },
      include: {
        group: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            picture: true,
          },
        },
      },
    });

    // Increment used count
    await prisma.groupInvite.update({
      where: { id: invite.id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    res.json({
      message: 'Successfully joined group',
      membership,
      group: invite.group,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// List all invites for a group (requires group membership)
router.get('/groups/:groupId/invites', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.jwtUser!.id;

    // Check if user is a member of the group
    const membership = await checkGroupMembership(userId, groupId, req);

    if (!membership || !membership.isMember) {
      return res.status(403).json({ error: 'You must be a member of the group to view invites' });
    }

    const invites = await prisma.groupInvite.findMany({
      where: { groupId },
      include: {
        invitedBy: {
          select: {
            name: true,
            picture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// Revoke an invite (requires group admin or invite creator)
router.delete('/invites/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.jwtUser!.id;
    const userRole = req.jwtUser!.role;

    const invite = await prisma.groupInvite.findUnique({
      where: { code },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Check permissions: must be invite creator, group admin, or global admin
    const membership = await checkGroupMembership(userId, invite.groupId, req);

    const isInviteCreator = invite.invitedById === userId;
    const isGroupAdmin = membership ? membership.isAdmin : false;
    const isGlobalAdmin = userRole === 'admin';

    if (!isInviteCreator && !isGroupAdmin && !isGlobalAdmin) {
      return res.status(403).json({ 
        error: 'Only the invite creator, group admins, or global admins can revoke invites' 
      });
    }

    // Revoke the invite
    const revokedInvite = await prisma.groupInvite.updateWithAudit({
      where: { id: invite.id },
      data: {
        status: InviteStatus.REVOKED,
      },
    });

    res.json({
      message: 'Invite revoked successfully',
      invite: revokedInvite,
    });
  } catch (error) {
    console.error('Error revoking invite:', error);
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
});

export default router;
