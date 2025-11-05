import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';

/**
 * Middleware to cache group membership checks per request
 * This prevents duplicate database queries for the same groupId+userId combination
 */

interface GroupMembershipCache {
  [key: string]: {
    isMember: boolean;
    isAdmin: boolean;
  };
}

// Extend Express Request to include membership cache
declare global {
  namespace Express {
    interface Request {
      groupMembershipCache?: GroupMembershipCache;
    }
  }
}

/**
 * Initialize the group membership cache for the request
 */
export const initGroupMembershipCache = (req: Request, res: Response, next: NextFunction) => {
  req.groupMembershipCache = {};
  next();
};

/**
 * Check if a user is a member of a group (with caching)
 * @param userId - The user ID to check
 * @param groupId - The group ID to check
 * @param req - The Express request object (for cache)
 * @returns Promise with membership details
 */
export async function checkGroupMembership(
  userId: string,
  groupId: string,
  req: Request
): Promise<{ isMember: boolean; isAdmin: boolean } | null> {
  const cacheKey = `${userId}:${groupId}`;
  
  // Check cache first
  if (req.groupMembershipCache && req.groupMembershipCache[cacheKey]) {
    return req.groupMembershipCache[cacheKey];
  }

  // Query database with optimized findUnique using composite key
  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId
      }
    },
    select: {
      role: true,
    },
  });

  const result = membership
    ? { isMember: true, isAdmin: membership.role === 'admin' }
    : { isMember: false, isAdmin: false };

  // Cache the result
  if (req.groupMembershipCache) {
    req.groupMembershipCache[cacheKey] = result;
  }

  return result;
}

/**
 * Middleware to verify group membership and attach to request
 * Use this instead of manual checks in route handlers
 */
export const verifyGroupMembership = (groupIdParam: 'params' | 'query' | 'body' = 'query') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.jwtUser?.id;
    const userRole = req.jwtUser?.role;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Extract groupId from specified location
    let groupId: string | undefined;
    if (groupIdParam === 'params') {
      groupId = req.params.groupId || req.params.id;
    } else if (groupIdParam === 'query') {
      groupId = req.query.groupId as string;
    } else if (groupIdParam === 'body') {
      groupId = req.body.groupId;
    }

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    // Global admins bypass membership check
    if (userRole === 'admin') {
      return next();
    }

    // Check membership with caching
    const membership = await checkGroupMembership(userId, groupId, req);

    if (!membership || !membership.isMember) {
      return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
    }

    next();
  };
};
