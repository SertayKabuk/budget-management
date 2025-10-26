import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type AuditEntityType = 'User' | 'Group' | 'GroupMember' | 'Expense';

export interface AuditLogData {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId?: string;
  userName?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        userId: data.userId,
        userName: data.userName,
        oldValues: data.oldValues || null,
        newValues: data.newValues || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 50
) {
  return await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

/**
 * Get audit logs by user
 */
export async function getAuditLogsByUser(userId: string, limit: number = 100) {
  return await prisma.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

/**
 * Get recent audit logs across all entities
 */
export async function getRecentAuditLogs(limit: number = 100) {
  return await prisma.auditLog.findMany({
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });
}

/**
 * Get audit logs within a date range
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  entityType?: AuditEntityType
) {
  return await prisma.auditLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
      ...(entityType && { entityType }),
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
}

/**
 * Extract user context from request for audit logging
 */
export function extractAuditContext(req: any) {
  return {
    userId: req.user?.id,
    userName: req.user?.name,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}
