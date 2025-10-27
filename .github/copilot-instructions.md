# Budget Management App - AI Coding Guide

## Architecture Overview

**Monorepo Structure**: Backend (Node.js/Express/TypeScript) + Frontend (React/Vite/TypeScript)
- Backend: Express REST API + Socket.io WebSocket server in single process (`backend/src/index.ts`)
- Frontend: React 19 SPA with TanStack Query, runtime environment configuration
- Database: PostgreSQL with Prisma ORM + custom audit logging extensions
- AI: Azure OpenAI GPT-4 for invoice parsing, text2SQL, and conversational expense entry
- Deployment: Docker + Traefik reverse proxy with automatic SSL

**Key Architectural Pattern**: Real-time bidirectional communication
- REST APIs for CRUD (users, groups, expenses, payments, reminders, audit logs)
- WebSocket (Socket.io) for AI chat with streaming responses and real-time notifications
- All connections authenticated via JWT tokens (REST headers + WebSocket handshake)

## Critical Developer Workflows

### Running the Application
```powershell
# Backend (from backend/ directory)
npm run dev              # Start with nodemon hot-reload on :3001
npm run dev:debug        # Start with Node debugger attached
npm run prisma:migrate   # Apply database migrations
npm run test:openai      # Test Azure OpenAI connection

# Frontend (from frontend/ directory)  
npm run dev              # Start Vite dev server on :5173
npm run build            # Production build
```

### Database Migrations
**CRITICAL**: Always use Prisma migrations - never manually edit the database
```powershell
cd backend
# After editing backend/prisma/schema.prisma:
npm run prisma:migrate   # Creates + applies migration + regenerates client
npm run prisma:generate  # Regenerate Prisma client types only
```

Migration files stored in `backend/prisma/migrations/` with UTC timestamps.

### Docker Deployment
```powershell
# Local development with PostgreSQL
docker-compose -f docker-compose.local.yml up

# Production with Traefik reverse proxy
docker-compose -f docker-compose.prod.yml up -d
```

Frontend uses **runtime configuration** - change `VITE_API_URL`/`VITE_WS_URL` without rebuilding image (see `frontend/RUNTIME_CONFIG.md`).

## Project-Specific Conventions

### Authentication & Authorization
**Google OAuth → JWT → Role-Based Access Control**
- OAuth config: `backend/src/config/passport.ts` (Passport.js Google OAuth20 strategy)
- JWT middleware: `backend/src/middleware/auth.middleware.ts`
  - `authenticateToken`: Validates JWT, sets `req.jwtUser`, initializes audit context
  - `requireAdmin`: Checks `jwtUser.role === 'admin'` (for user management pages)
  - `optionalAuth`: Non-blocking auth for public endpoints
- WebSocket auth: Socket.io middleware validates JWT from handshake auth token
- Frontend: JWT in localStorage, auto-attached via axios interceptor (`frontend/src/services/api.ts`)
- Auth context: `frontend/src/contexts/AuthContext.tsx` (user state, login/logout)

**Group Access Control**: All expense/payment operations verify user is group member via:
```typescript
const groupMembership = await prisma.groupMember.findFirst({
  where: { groupId, userId: req.jwtUser.id }
});
if (!groupMembership) return res.status(403).json({ error: 'Access denied' });
```

### Audit Logging System
**Prisma Client Extensions for automatic audit trails** (`backend/src/prisma.ts`)
- Custom methods: `createWithAudit`, `updateWithAudit`, `deleteWithAudit`
- Captures: entity type, ID, action (CREATE/UPDATE/DELETE), old/new values, user context
- Sanitizes sensitive fields (password, refreshToken, googleId) → `[REDACTED]`
- Context set per-request by `authenticateToken` middleware, cleared after response
- Usage pattern:
  ```typescript
  // DON'T: await prisma.expense.create(...)
  // DO:   await prisma.expense.createWithAudit(...)
  ```
- Audit logs queryable at `/api/audit` (admin only) or `/api/audit/entity/:type/:id`

### WebSocket Communication Pattern
**Socket.io rooms + streaming AI responses**

**Client → Server events**:
- `join-group` - Subscribe to group-specific broadcasts
- `chat-message` - Send text/image to AI assistant
  ```typescript
  socket.emit('chat-message', {
    message: "Bu ay ne harcadım?",
    userId: "uuid",
    groupId: "uuid",
    userName: "Sertay",
    imageBase64?: "data:image/jpeg;base64,..." // Optional invoice image
  });
  ```

**Server → Client events**:
- `chat-stream` - Streaming AI response chunks (delta content)
- `chat-response` - Final complete message
- `expense-added` - New expense created (broadcast to group)
- `expense-created` - Confirmation to user who created expense
- `query-result` - Database query results (text2SQL feature)
- `payment-created`/`payment-updated`/`reminder-created`/etc. - Entity notifications

**Conversation state**: Maintained per socket ID in Map, includes system prompt + user/assistant/tool messages.

### AI Service Integration
**Azure OpenAI with Function Calling + Streaming** (`backend/src/services/openai.service.ts`)

**Two-phase AI workflow**:
1. `chatWithAIAndTools()` - Determines if tool call needed (create_expense, query_database)
2. `chatWithAIAndToolsStream()` - Streams final response after tool execution

**Tool Definitions** (`backend/src/websocket/socket.ts`):
- `create_expense`: Extracts amount/description/category from natural language OR invoice images
  - Handles Turkish Lira (TL/₺) formats: "50 TL", "50 lira", "50₺", "50"
  - Supports GPT-4 Vision for invoice image analysis (multimodal content arrays)
  - Saves uploaded images to `backend/uploads/` with `saveBase64Image()` utility
- `query_database`: Text-to-SQL expense queries with safety controls
  - Parses natural language → Prisma queries (no raw SQL exposure)
  - Few-shot examples in system prompt for Turkish/English queries
  - Supports: totals, averages, category breakdowns, top N expenses, time filters
  - **Group queries**: "Ayfer bu ay ne harcadı?", "Kim ne harcadı?", "Kimin kime borcu var?"
  - Returns structured data (aggregate, list, group_summary, debt_calculation types)

**System Prompt Pattern**: Multi-capability assistant with:
- Database schema documentation (User, Group, Expense, GroupMember models)
- Few-shot query examples (10+ scenarios showing tool usage)
- Bilingual support (Turkish/English) with Turkish-first responses
- Markdown formatting guidelines for tabular data

### UI Architecture (7 Pages)
**HomePage** (`frontend/src/pages/HomePage.tsx`) - Primary expense entry
- Group selector (auto-selects first group, syncs to localStorage)
- `MultimodalChatInterface` component - text/image input for AI
- `GroupSpendingSummary` - total spending + member breakdown
- `ReminderAlertBanner` - overdue reminder notifications

**GroupPage** (`frontend/src/pages/GroupPage.tsx`) - Detailed group view
- `ExpenseList` with calendar view toggle
- `GroupMembers` management
- `DebtSettlementManager` - calculate/display who owes whom
- `RecurringReminderManager` - scheduled payment reminders

**AdminPage** (`frontend/src/pages/AdminPage.tsx`) - Management dashboard
- Statistics cards (users, groups, expenses, payments, reminders)
- Quick access to user role management + audit logs
- Admin-only route (`AdminRoute` component checks user role)

**AnalyticsPage** - Recharts visualizations (spending trends, category breakdowns)

**AuditLogsPage** - Filterable audit log viewer (entity type, user, date range)

**UserRoleManagementPage** - Admin panel to promote/demote user roles

**LoginPage** + **AuthCallbackPage** - Google OAuth flow

### Real-time Features Pattern
All WebSocket broadcasts use group rooms: `group-${groupId}`
```typescript
// Server-side pattern in routes (e.g., payment.routes.ts)
import { io } from '../index';
io.to(`group-${groupId}`).emit('payment-created', { payment, createdBy });

// Client-side listener (e.g., GroupPage.tsx)
socket.on('payment-created', ({ payment, createdBy }) => {
  queryClient.invalidateQueries(['payments', groupId]);
  // Show toast notification...
});
```

**Image Serving with Auth**: Expense images protected at `/api/expenses/image/:filename`
- Middleware verifies user is member of group containing expense
- Frontend uses `AuthenticatedImage` component with JWT in fetch headers

## Integration Points

### Frontend → Backend API
**Type-safe API client** (`frontend/src/services/api.ts`)
- Axios instance with baseURL from runtime config (`config.apiUrl`)
- Interceptor: auto-attaches JWT to Authorization header
- 401 handler: clears auth state + redirects to /login
- API namespaces: `userApi`, `groupApi`, `expenseApi`, `paymentApi`, `reminderApi`, `auditApi`

### Frontend Runtime Configuration
**Environment variables injected at container startup** (not build time)
- Template: `frontend/config.template.js` with `__VITE_API_URL__` placeholders
- Script: `frontend/env.sh` runs in nginx `/docker-entrypoint.d/`, replaces placeholders via `sed`
- Accessor: `frontend/src/config/runtime.ts` - checks `window.ENV` first, falls back to `import.meta.env` for dev
- Usage: `import { config } from '../config/runtime'; const url = config.apiUrl;`
- See `frontend/RUNTIME_CONFIG.md` for full details

### Database Schema Key Relationships
**7 core models** (`backend/prisma/schema.prisma`):
```
User ←→ GroupMember ←→ Group
  ↓         ↓            ↓
  Expense ←─────────────┘
  Payment (fromUser/toUser) → Group
  RecurringReminder → Group + createdBy (User)
  AuditLog (references all entities)
```
- Many-to-many: Users ↔ Groups (via GroupMember junction table with unique [userId, groupId])
- Enums: `PaymentStatus` (PENDING/COMPLETED/CANCELLED), `ReminderFrequency` (WEEKLY/MONTHLY/YEARLY/EVERY_6_MONTHS)
- Indexes: groupId, userId, status, timestamp (for query performance)

### External Dependencies
- **Azure OpenAI**: GPT-4 deployment (streaming + function calling + vision)
- **Google OAuth 2.0**: Authentication (credentials in .env)
- **PostgreSQL**: Database server (connection via DATABASE_URL)
- **Traefik** (prod): Reverse proxy with automatic Let's Encrypt SSL
- **Sharp**: Image processing library (for invoice resizing before storage)

## Common Patterns

### Adding New API Endpoints
1. Create route file: `backend/src/routes/newfeature.routes.ts`
2. Define Express router with `authenticateToken` middleware:
   ```typescript
   import { Router } from 'express';
   import { authenticateToken } from '../middleware/auth.middleware';
   const router = Router();
   router.use(authenticateToken); // Apply to all routes
   router.get('/', async (req, res) => { ... });
   export default router;
   ```
3. Mount in `backend/src/index.ts`: `app.use('/api/newfeature', newfeatureRoutes);`
4. Add frontend API wrapper in `frontend/src/services/api.ts`:
   ```typescript
   export const newfeatureApi = {
     getAll: () => api.get('/api/newfeature'),
     // ...
   };
   ```

### Adding WebSocket Events
1. Define tool in `backend/src/websocket/socket.ts` `tools` array (if AI-driven)
2. Add execution function (e.g., `executeNewFeature`) with group membership check
3. Emit broadcast: `io.to(\`group-\${groupId}\`).emit('feature-event', data);`
4. Client listener in relevant page component:
   ```typescript
   useEffect(() => {
     const socket = getSocket();
     socket.on('feature-event', handleFeatureUpdate);
     return () => { socket.off('feature-event', handleFeatureUpdate); };
   }, []);
   ```

### Multilingual Support
**LanguageContext** (`frontend/src/contexts/LanguageContext.tsx`)
- Translations: `frontend/src/locales/tr.ts` (Turkish strings)
- Usage: `const { t } = useTranslation(); return <h1>{t.home.title}</h1>;`
- Add new keys to locales file, access via nested object paths

## Environment Variables Reference
**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_USE_API_KEY=true  # false for Azure AD (requires az login)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
```

**Frontend** (`frontend/.env.local` for dev, container env vars for prod):
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Key Files for Onboarding
- `README.md` - Setup instructions, tech stack, feature overview
- `backend/prisma/schema.prisma` - Complete data model (7 models, ~200 lines)
- `backend/src/index.ts` - Server entry point (route mounting, WebSocket setup, auto-migration on start)
- `backend/src/prisma.ts` - Audit logging extensions (custom CRUD methods)
- `backend/src/websocket/socket.ts` - AI chat handler, tool definitions, streaming logic (500+ lines)
- `backend/src/services/openai.service.ts` - Azure OpenAI client configuration
- `frontend/src/App.tsx` - React Router setup, navigation, auth flow
- `frontend/src/pages/HomePage.tsx` - Primary UI entry point
- `frontend/RUNTIME_CONFIG.md` - Environment variable injection mechanism for Docker
