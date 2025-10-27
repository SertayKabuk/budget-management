import express from 'express';
import { basePrisma as prisma } from '../prisma';
import { authenticateToken, requireAdmin, isGroupAdminOrGlobalAdmin } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * GET /api/audit - Get recent audit logs (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;
    const userId = req.query.userId as string;
    const action = req.query.action as string;

    const where: any = {};
    
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: Math.min(limit, 1000), // Max 1000 records
    });

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit/entity/:entityType/:entityId - Get audit logs for a specific entity
 */
router.get('/entity/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: Math.min(limit, 500),
    });

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch entity audit logs' });
  }
});

/**
 * GET /api/audit/user/:userId - Get audit logs by user (admin only)
 */
router.get('/user/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: Math.min(limit, 500),
    });

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch user audit logs' });
  }
});

/**
 * GET /api/audit/stats - Get audit log statistics (admin only)
 */
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [totalLogs, byAction, byEntity, recentActivity] = await Promise.all([
      // Total count
      prisma.auditLog.count(),
      
      // Group by action
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
      }),
      
      // Group by entity type
      prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: true,
      }),
      
      // Recent activity (last 24 hours)
      prisma.auditLog.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      totalLogs,
      byAction: byAction.map(item => ({
        action: item.action,
        count: item._count,
      })),
      byEntity: byEntity.map(item => ({
        entityType: item.entityType,
        count: item._count,
      })),
      last24Hours: recentActivity,
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});

/**
 * GET /api/audit/group/:groupId - Get audit logs for a specific group (group admin or global admin)
 */
router.get('/group/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify user is group admin or global admin
    const hasPermission = await isGroupAdminOrGlobalAdmin(userId, groupId, userRole);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Access denied: Only group admins can view audit logs'
      });
    }

    // Fetch audit logs for entities in this group
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'Group', entityId: groupId },
          { entityType: 'GroupMember', newValues: { path: ['groupId'], equals: groupId } },
          { entityType: 'Expense', newValues: { path: ['groupId'], equals: groupId } },
          { entityType: 'Payment', newValues: { path: ['groupId'], equals: groupId } },
          { entityType: 'RecurringReminder', newValues: { path: ['groupId'], equals: groupId } },
        ]
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: Math.min(limit, 500),
    });

    res.json(auditLogs);
  } catch (error) {
    console.error('Error fetching group audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch group audit logs' });
  }
});

/**
 * GET /api/audit/changes/:entityType/:entityId - Get change history with diffs
 */
router.get('/changes/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Format change history with diffs
    const changeHistory = auditLogs.map((log, index) => {
      const changes: any[] = [];
      
      if (log.oldValues && log.newValues) {
        const oldObj = log.oldValues as any;
        const newObj = log.newValues as any;
        
        // Find changed fields
        Object.keys(newObj).forEach(key => {
          if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changes.push({
              field: key,
              oldValue: oldObj[key],
              newValue: newObj[key],
            });
          }
        });
      }

      return {
        id: log.id,
        action: log.action,
        timestamp: log.timestamp,
        userId: log.userId,
        userName: log.userName,
        changes: changes.length > 0 ? changes : undefined,
        fullOldValues: log.oldValues,
        fullNewValues: log.newValues,
      };
    });

    res.json(changeHistory);
  } catch (error) {
    console.error('Error fetching change history:', error);
    res.status(500).json({ error: 'Failed to fetch change history' });
  }
});

export default router;
