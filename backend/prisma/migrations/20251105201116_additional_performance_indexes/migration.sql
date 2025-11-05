-- Additional performance indexes for optimized query patterns

-- Optimize image serving lookups (reduces queries from 2 to 1)
CREATE INDEX IF NOT EXISTS "Expense_imageUrl_idx" ON "Expense"("imageUrl");

-- Optimize user's expenses in group queries (common pattern in group views)
CREATE INDEX IF NOT EXISTS "Expense_groupId_userId_idx" ON "Expense"("groupId", "userId");

-- Optimize category filtering per group (used in analytics and filters)
CREATE INDEX IF NOT EXISTS "Expense_groupId_category_idx" ON "Expense"("groupId", "category");

-- Optimize group admin lookups (frequently checked in authorization)
CREATE INDEX IF NOT EXISTS "GroupMember_groupId_role_idx" ON "GroupMember"("groupId", "role");
