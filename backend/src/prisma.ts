import { PrismaClient } from '@prisma/client';

// Store the current user context for audit logging
let currentAuditContext: {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
} = {};

export function setAuditContext(context: typeof currentAuditContext) {
  currentAuditContext = { ...context };
}

export function clearAuditContext() {
  currentAuditContext = {};
}

export function getAuditContext() {
  return currentAuditContext;
}

const basePrisma = new PrismaClient();

/**
 * Sanitize data for audit logging
 */
function sanitizeForAudit(data: any): any {
  if (!data) return null;
  
  const sensitiveFields = ['password', 'refreshToken', 'googleId'];
  const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone
  
  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  entityType: string,
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  oldValues: any = null,
  newValues: any = null
) {
  try {
    await basePrisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId: currentAuditContext.userId,
        userName: currentAuditContext.userName,
        oldValues: oldValues ? sanitizeForAudit(oldValues) : null,
        newValues: newValues ? sanitizeForAudit(newValues) : null,
        ipAddress: currentAuditContext.ipAddress,
        userAgent: currentAuditContext.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging shouldn't break the main operation
  }
}

// Extend Prisma Client with audit-aware operations
const extendedPrisma = basePrisma.$extends({
  name: 'auditLog',
  model: {
    user: {
      async createWithAudit(args: any) {
        const result = await basePrisma.user.create(args);
        await createAuditLog('User', result.id, 'CREATE', null, result);
        return result;
      },
      async updateWithAudit(args: any) {
        const oldValues = await basePrisma.user.findUnique({ where: args.where });
        const result = await basePrisma.user.update(args);
        await createAuditLog('User', result.id, 'UPDATE', oldValues, result);
        return result;
      },
      async deleteWithAudit(args: any) {
        const oldValues = await basePrisma.user.findUnique({ where: args.where });
        const result = await basePrisma.user.delete(args);
        await createAuditLog('User', result.id, 'DELETE', oldValues, null);
        return result;
      },
    },
    group: {
      async createWithAudit(args: any) {
        const result = await basePrisma.group.create(args);
        await createAuditLog('Group', result.id, 'CREATE', null, result);
        return result;
      },
      async updateWithAudit(args: any) {
        const oldValues = await basePrisma.group.findUnique({ where: args.where });
        const result = await basePrisma.group.update(args);
        await createAuditLog('Group', result.id, 'UPDATE', oldValues, result);
        return result;
      },
      async deleteWithAudit(args: any) {
        const oldValues = await basePrisma.group.findUnique({ where: args.where });
        const result = await basePrisma.group.delete(args);
        await createAuditLog('Group', result.id, 'DELETE', oldValues, null);
        return result;
      },
    },
    groupMember: {
      async createWithAudit(args: any) {
        const result = await basePrisma.groupMember.create(args);
        await createAuditLog('GroupMember', result.id, 'CREATE', null, result);
        return result;
      },
      async updateWithAudit(args: any) {
        const oldValues = await basePrisma.groupMember.findUnique({ where: args.where });
        const result = await basePrisma.groupMember.update(args);
        await createAuditLog('GroupMember', result.id, 'UPDATE', oldValues, result);
        return result;
      },
      async deleteWithAudit(args: any) {
        const oldValues = await basePrisma.groupMember.findUnique({ where: args.where });
        const result = await basePrisma.groupMember.delete(args);
        await createAuditLog('GroupMember', result.id, 'DELETE', oldValues, null);
        return result;
      },
    },
    expense: {
      async createWithAudit(args: any) {
        const result = await basePrisma.expense.create(args);
        await createAuditLog('Expense', result.id, 'CREATE', null, result);
        return result;
      },
      async updateWithAudit(args: any) {
        const oldValues = await basePrisma.expense.findUnique({ where: args.where });
        const result = await basePrisma.expense.update(args);
        await createAuditLog('Expense', result.id, 'UPDATE', oldValues, result);
        return result;
      },
      async deleteWithAudit(args: any) {
        const oldValues = await basePrisma.expense.findUnique({ where: args.where });
        const result = await basePrisma.expense.delete(args);
        await createAuditLog('Expense', result.id, 'DELETE', oldValues, null);
        return result;
      },
    },
    payment: {
      async createWithAudit(args: any) {
        const result = await basePrisma.payment.create(args);
        await createAuditLog('Payment', result.id, 'CREATE', null, result);
        return result;
      },
      async updateWithAudit(args: any) {
        const oldValues = await basePrisma.payment.findUnique({ where: args.where });
        const result = await basePrisma.payment.update(args);
        await createAuditLog('Payment', result.id, 'UPDATE', oldValues, result);
        return result;
      },
      async deleteWithAudit(args: any) {
        const oldValues = await basePrisma.payment.findUnique({ where: args.where });
        const result = await basePrisma.payment.delete(args);
        await createAuditLog('Payment', result.id, 'DELETE', oldValues, null);
        return result;
      },
    },
    recurringReminder: {
      async createWithAudit(args: any) {
        const result = await basePrisma.recurringReminder.create(args);
        await createAuditLog('RecurringReminder', result.id, 'CREATE', null, result);
        return result;
      },
      async updateWithAudit(args: any) {
        const oldValues = await basePrisma.recurringReminder.findUnique({ where: args.where });
        const result = await basePrisma.recurringReminder.update(args);
        await createAuditLog('RecurringReminder', result.id, 'UPDATE', oldValues, result);
        return result;
      },
      async deleteWithAudit(args: any) {
        const oldValues = await basePrisma.recurringReminder.findUnique({ where: args.where });
        const result = await basePrisma.recurringReminder.delete(args);
        await createAuditLog('RecurringReminder', result.id, 'DELETE', oldValues, null);
        return result;
      },
    },
  },
});

// Export both for different use cases:
// - basePrisma for reading audit logs and other non-audited operations
// - extendedPrisma for operations that should be audited
export { basePrisma };
export default extendedPrisma;


