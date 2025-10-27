# Budget Management App

[![CI](https://github.com/SertayKabuk/budget-management/actions/workflows/ci.yml/badge.svg)](https://github.com/SertayKabuk/budget-management/actions/workflows/ci.yml)
[![Backend Docker](https://github.com/SertayKabuk/budget-management/actions/workflows/backend-docker.yml/badge.svg)](https://github.com/SertayKabuk/budget-management/actions/workflows/backend-docker.yml)
[![Frontend Docker](https://github.com/SertayKabuk/budget-management/actions/workflows/frontend-docker.yml/badge.svg)](https://github.com/SertayKabuk/budget-management/actions/workflows/frontend-docker.yml)

A modern, real-time expense tracking and budget management application with AI-powered features. Built with React 19, Node.js, PostgreSQL, and Azure OpenAI.

## Features

### AI-Powered Expense Management
- **Conversational Expense Entry**: Chat naturally with AI to log expenses ("50 TL market alışverişi yaptım")
- **Multimodal Invoice Parsing**: Upload receipt images with optional text for automatic expense extraction using GPT-4 Vision
- **Text-to-SQL Queries**: Ask questions in natural language ("Bu ay ne kadar harcadım?", "Who spent the most?")
- **Streaming AI Responses**: Real-time streaming for a responsive chat experience

### Group Expense Tracking
- **Group Management**: Create groups, add members, and track shared expenses
- **Debt Settlement**: Automatically calculate who owes whom based on group expenses
- **Real-time Updates**: WebSocket integration for instant notifications across all connected clients
- **Member Spending Summaries**: View breakdown of each member's contributions

### Payment & Reminder Management
- **Payment Tracking**: Record payments between group members with status tracking (Pending/Completed/Cancelled)
- **Recurring Reminders**: Set up recurring payment reminders (weekly, monthly, yearly, every 6 months)
- **Overdue Alerts**: Visual notifications for overdue payment reminders

### Security & Compliance
- **Google OAuth 2.0**: Secure authentication with JWT tokens
- **Role-Based Access Control**: Admin and user roles with protected routes
- **Audit Logging**: Complete audit trail for all data modifications (who, what, when)
- **Group Access Control**: Users can only access expenses from groups they belong to

### Analytics & Insights
- **Visual Analytics**: Recharts-powered spending trends and category breakdowns
- **Calendar View**: Expense calendar with daily spending summaries
- **Export Functionality**: Export expense data to Excel (XLSX format)
- **Multi-language Support**: Turkish and English interface (i18n)

## Architecture

### Tech Stack

**Backend**
- Node.js + Express 5 (TypeScript)
- PostgreSQL with Prisma ORM 6
- Socket.io 4 for WebSockets
- Azure OpenAI (GPT-4) with streaming + function calling + vision
- Passport.js for Google OAuth 2.0
- JWT for session management
- Multer + Sharp for image upload and processing

**Frontend**
- React 19 + TypeScript 5
- Vite 7 for build tooling
- TanStack Query (React Query) for server state management
- TailwindCSS 4 for styling
- Socket.io Client for real-time communication
- Axios for API requests
- Recharts for data visualization
- React Router 7 for navigation
- React Markdown for AI response formatting

**DevOps**
- Docker + Docker Compose for containerization
- Traefik reverse proxy with automatic SSL (Let's Encrypt)
- Nginx for frontend static file serving
- Runtime environment variable injection (no rebuild needed)

### Project Structure

```
budget-management/
├── backend/              # Node.js Express API + WebSocket server
│   ├── ai-prompts/      # System prompts and few-shot examples
│   ├── prisma/          # Database schema and migrations
│   │   ├── schema.prisma         # 7 models: User, Group, GroupMember, Expense, Payment, RecurringReminder, AuditLog
│   │   └── migrations/           # Timestamped SQL migrations
│   ├── src/
│   │   ├── config/      # Passport OAuth configuration
│   │   ├── middleware/  # Auth, upload, and audit context middleware
│   │   ├── routes/      # REST API endpoints (7 routers)
│   │   ├── services/    # Azure OpenAI integration (streaming + function calling)
│   │   ├── utils/       # File utilities, date helpers
│   │   ├── websocket/   # Socket.io handlers (AI chat, tool execution)
│   │   ├── index.ts     # Server entry point (auto-migration on start)
│   │   └── prisma.ts    # Prisma client with audit extensions
│   └── uploads/         # Uploaded invoice images (persistent volume)
└── frontend/            # React 19 SPA
    ├── config.template.js        # Runtime config template
    ├── env.sh                    # Environment variable injection script
    ├── nginx.conf                # Nginx configuration
    ├── RUNTIME_CONFIG.md         # Runtime config documentation
    └── src/
        ├── components/  # 15+ React components
        │   ├── AdminRoute.tsx            # Admin-only route guard
        │   ├── AuthenticatedImage.tsx    # Protected image loading
        │   ├── DebtSettlementManager.tsx # Debt calculation UI
        │   ├── ExpenseCalendar.tsx       # Calendar view
        │   ├── MultimodalChatInterface.tsx # AI chat with image upload
        │   └── RecurringReminderManager.tsx # Reminder CRUD
        ├── config/      # Runtime configuration accessor
        ├── contexts/    # Auth and Language contexts
        ├── hooks/       # Custom React hooks
        ├── locales/     # i18n translations (Turkish)
        ├── pages/       # 7 main pages
        │   ├── HomePage.tsx              # Primary expense entry
        │   ├── GroupPage.tsx             # Detailed group view
        │   ├── AdminPage.tsx             # Management dashboard
        │   ├── AnalyticsPage.tsx         # Charts and visualizations
        │   ├── AuditLogsPage.tsx         # Audit log viewer
        │   ├── UserRoleManagementPage.tsx # Role management
        │   └── LoginPage.tsx + AuthCallbackPage.tsx
        ├── services/    # API and WebSocket clients
        ├── types/       # TypeScript type definitions
        └── utils/       # Currency formatting utilities
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Azure OpenAI account (for AI features)
- Google OAuth 2.0 credentials (for authentication)

### Installation

1. **Clone the repository**
   ```powershell
   git clone <repository-url>
   cd budget-management
   ```

2. **Set up the backend**
   ```powershell
   cd backend
   npm install
   ```

3. **Configure environment variables**
   
   Create `backend/.env`:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/budget_db
   
   # Azure OpenAI
   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
   AZURE_OPENAI_USE_API_KEY=true
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Server Configuration
   BACKEND_URL=http://localhost:3001
   FRONTEND_URL=http://localhost:5173
   JWT_SECRET=your-secret-key
   PORT=3001
   ```

4. **Run database migrations**
   ```powershell
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. **Set up the frontend**
   ```powershell
   cd ../frontend
   npm install
   ```

6. **Configure frontend environment**
   
   Create `frontend/.env.local`:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_WS_URL=ws://localhost:3001
   ```

### Running the Application

**Development Mode**

```powershell
# Terminal 1 - Backend
cd backend
npm run dev              # Starts server on :3001 with hot-reload

# Terminal 2 - Frontend
cd frontend
npm run dev              # Starts Vite dev server on :5173
```

**With Debugging**

```powershell
cd backend
npm run dev:debug        # Starts with Node debugger attached
```

Access the application at `http://localhost:5173`

### Docker Deployment

**Local Development**
```powershell
docker-compose -f docker-compose.local.yml up
```

**Production**
```powershell
docker-compose -f docker-compose.prod.yml up -d
```

**Note**: Frontend uses runtime environment variable configuration. See `frontend/RUNTIME_CONFIG.md` for details on configuring `VITE_API_URL` and `VITE_WS_URL` for different environments without rebuilding the Docker image.

## Key Workflows

### Authentication & Authorization Flow

1. **OAuth Login**: User clicks "Sign in with Google" → redirected to Google OAuth consent screen
2. **OAuth Callback**: Google redirects to `/api/auth/google/callback` with authorization code
3. **User Creation/Update**: Backend validates OAuth response, creates/updates user in database
4. **JWT Issuance**: Backend generates JWT containing `{ id, email, name, picture, role }`
5. **Token Storage**: Frontend stores JWT in localStorage
6. **API Authentication**: JWT automatically attached to all REST requests via axios interceptor
7. **WebSocket Authentication**: Socket.io validates JWT during handshake (`socket.handshake.auth.token`)
8. **Audit Context**: `authenticateToken` middleware sets audit context (userId, userName, IP, userAgent)
9. **Authorization**: Group-based access control checks `GroupMember` table for every expense/payment operation
10. **Admin Routes**: `requireAdmin` middleware checks `user.role === 'admin'` for sensitive operations

### AI Expense Entry & Querying

**Conversational Expense Creation:**
```
User: "50 TL marketten süt aldım"
AI: Extracts → amount: 50, category: "food", description: "marketten süt"
Backend: Creates expense via create_expense tool
WebSocket: Broadcasts expense-added event to group
```

**Multimodal Invoice Upload:**
1. User uploads receipt image (optionally with text like "Migros faturası")
2. Frontend sends base64 image via WebSocket `chat-message` event
3. Backend saves image to `uploads/` directory
4. AI (GPT-4 Vision) analyzes image, extracts expense details
5. Backend creates expense with `imageUrl` reference
6. All group members receive real-time notification

**Natural Language Queries (Text-to-SQL):**
```
User: "Bu ay ne kadar harcadım?"
AI: Generates Prisma query → filters by groupId, date range
Backend: Executes safe query (no raw SQL)
Returns: { type: 'aggregate', total: 1250.50, count: 15 }

User: "Kimin kime borcu var?"
AI: Triggers debt_calculation query type
Backend: Calculates fair share, generates settlement plan
Returns: [{ from: "Ayfer", to: "Sertay", amount: 125.25 }, ...]
```

**Supported Query Types:**
- Total/sum/average calculations
- Category breakdowns
- Top N expenses
- Recent expenses with filters
- Group member summaries ("kim ne harcamış")
- Debt settlements ("kimin kime borcu var")
- Time-based filters (this month, last week, last 30 days, etc.)

### Real-time Updates

**Socket.io Room-Based Broadcasting:**
- Clients join room on group selection: `socket.emit('join-group', groupId)`
- Server broadcasts to room: `io.to(\`group-\${groupId}\`).emit('event', data)`
- All connected group members receive instant notifications

**Real-time Events:**
- `expense-added` - New expense created (broadcast to group)
- `expense-created` - Confirmation to expense creator
- `payment-created` / `payment-updated` - Payment status changes
- `reminder-created` / `reminder-updated` / `reminder-deleted` - Reminder changes
- `chat-stream` - Streaming AI response chunks (delta content)
- `chat-response` - Final complete AI message
- `query-result` - Database query results from text-to-SQL

**Frontend Integration:**
- TanStack Query cache invalidation on real-time events
- Optimistic updates for instant UI feedback
- Toast notifications for important events

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth 2.0 flow
- `GET /api/auth/google/callback` - OAuth callback handler
- `GET /api/auth/logout` - Logout and clear session

### Users (Protected with JWT)
- `GET /api/users` - List all users (admin only with `requireAdmin`)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user (role changes require admin)

### Groups (Protected with JWT)
- `GET /api/groups` - List user's groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group details (membership verified)
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/members` - Add member
- `DELETE /api/groups/:groupId/members/:userId` - Remove member

### Expenses (Protected with JWT + Group Membership)
- `GET /api/expenses?groupId=uuid` - List expenses for group
- `GET /api/expenses/:id` - Get expense details
- `POST /api/expenses` - Create expense (uses `createWithAudit`)
- `PUT /api/expenses/:id` - Update expense (uses `updateWithAudit`)
- `DELETE /api/expenses/:id` - Delete expense (uses `deleteWithAudit`)
- `GET /api/expenses/image/:filename` - Serve protected expense image

### Payments (Protected with JWT + Group Membership)
- `GET /api/payments?groupId=uuid` - List payments for group
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment (e.g., mark as completed)
- `DELETE /api/payments/:id` - Delete payment

### Recurring Reminders (Protected with JWT + Group Membership)
- `GET /api/reminders?groupId=uuid` - List reminders for group
- `GET /api/reminders/:id` - Get reminder details
- `POST /api/reminders` - Create recurring reminder
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder
- `GET /api/reminders/overdue?groupId=uuid` - Get overdue reminders

### Audit Logs (Protected with JWT)
- `GET /api/audit` - List all audit logs (admin only)
- `GET /api/audit/entity/:entityType/:entityId` - Get audit logs for specific entity

**Note**: All endpoints (except auth) require JWT authentication via `Authorization: Bearer <token>` header. Group-based endpoints verify user membership before allowing access.

## WebSocket Events

### Client → Server
- `join-group` - Join a group room for real-time updates
  ```typescript
  socket.emit('join-group', groupId);
  ```
- `chat-message` - Send message to AI assistant (text and/or image)
  ```typescript
  socket.emit('chat-message', {
    message: "Bu ay ne harcadım?",
    userId: "uuid",
    groupId: "uuid",
    userName: "Sertay",
    imageBase64?: "data:image/jpeg;base64,..." // Optional
  });
  ```

### Server → Client
- `chat-stream` - Streaming AI response chunks (for progressive rendering)
  ```typescript
  socket.on('chat-stream', ({ content, done }) => {
    if (!done) appendToMessage(content);
  });
  ```
- `chat-response` - Final complete AI message
- `chat-error` - Error during AI processing
- `expense-added` - New expense created (broadcast to group members)
- `expense-created` - Confirmation to expense creator
- `query-result` - Database query results from text-to-SQL
- `payment-created` - New payment created
- `payment-updated` - Payment status changed
- `reminder-created` - New reminder created
- `reminder-updated` - Reminder modified
- `reminder-deleted` - Reminder removed

**Authentication**: All WebSocket connections require JWT authentication via `socket.handshake.auth.token`

## Database Schema

### Core Models (7 Total)

**User**
- Authenticated via Google OAuth 2.0
- Fields: `id`, `name`, `email`, `googleId`, `picture`, `refreshToken`, `role` (user/admin)
- Can belong to multiple groups (via GroupMember)
- Relationships: expenses, payments (from/to), created reminders

**Group**
- Container for shared expenses
- Fields: `id`, `name`, `description`
- Relationships: members (via GroupMember), expenses, payments, reminders

**GroupMember** (Junction Table)
- Many-to-many relationship: Users ↔ Groups
- Unique constraint: `[userId, groupId]`
- Fields: `id`, `userId`, `groupId`, `role` (member/admin), `joinedAt`

**Expense**
- Belongs to one User and one Group
- Fields: `id`, `amount`, `description`, `category`, `date`, `imageUrl`
- Categories: food, transport, entertainment, shopping, utilities, health, other
- Image URLs format: `/uploads/invoice-{timestamp}.jpg`

**Payment**
- Tracks payments between group members
- Fields: `id`, `amount`, `fromUserId`, `toUserId`, `groupId`, `status`, `description`, `completedAt`
- Enum: `PaymentStatus` (PENDING, COMPLETED, CANCELLED)
- Relationships: fromUser, toUser, group

**RecurringReminder**
- Scheduled payment reminders
- Fields: `id`, `title`, `description`, `amount`, `frequency`, `groupId`, `nextDueDate`, `isActive`, `createdById`
- Enum: `ReminderFrequency` (WEEKLY, MONTHLY, YEARLY, EVERY_6_MONTHS)
- Relationships: group, createdBy (User)

**AuditLog**
- Complete audit trail for compliance
- Fields: `id`, `entityType`, `entityId`, `action` (CREATE/UPDATE/DELETE), `userId`, `userName`, `oldValues`, `newValues`, `timestamp`, `ipAddress`, `userAgent`
- Indexed on: entityType+entityId, userId, timestamp
- Created automatically via Prisma extensions (`createWithAudit`, etc.)

## Development

### Database Migrations

**CRITICAL**: Always use Prisma migrations - never manually edit the database schema

After modifying `backend/prisma/schema.prisma`:

```powershell
cd backend
npm run prisma:migrate   # Creates migration SQL + applies it + regenerates client
# Creates: backend/prisma/migrations/YYYYMMDDHHMMSS_description/migration.sql

npm run prisma:generate  # Only regenerate Prisma client types (no migration)
```

**Auto-Migration on Server Start**: The backend automatically runs `prisma migrate deploy` during startup (`backend/src/index.ts`), ensuring production deployments always have the latest schema.

**Audit Logging**: All database modifications should use audit-aware methods:
```typescript
// DON'T:
await prisma.expense.create({ data: { ... } });

// DO:
await prisma.expense.createWithAudit({ data: { ... } });
```

Available methods: `createWithAudit`, `updateWithAudit`, `deleteWithAudit` (defined in `backend/src/prisma.ts`)

### Testing Azure OpenAI Integration

```powershell
cd backend
npm run test:openai      # Test AI service connection
```

### Adding New API Endpoints

1. **Create route file**: `backend/src/routes/newfeature.routes.ts`
   ```typescript
   import { Router } from 'express';
   import { authenticateToken } from '../middleware/auth.middleware';
   import prisma from '../prisma';
   
   const router = Router();
   router.use(authenticateToken); // Apply JWT auth to all routes
   
   router.get('/', async (req, res) => {
     const userId = req.jwtUser?.id;
     // Verify group membership if needed
     const groupMembership = await prisma.groupMember.findFirst({
       where: { groupId: req.query.groupId, userId }
     });
     if (!groupMembership) return res.status(403).json({ error: 'Access denied' });
     
     const data = await prisma.newFeature.findMany({ where: { ... } });
     res.json(data);
   });
   
   export default router;
   ```

2. **Mount in server**: `backend/src/index.ts`
   ```typescript
   import newfeatureRoutes from './routes/newfeature.routes';
   app.use('/api/newfeature', newfeatureRoutes);
   ```

3. **Add frontend API wrapper**: `frontend/src/services/api.ts`
   ```typescript
   export const newfeatureApi = {
     getAll: (groupId: string) => api.get('/api/newfeature', { params: { groupId } }),
     create: (data: any) => api.post('/api/newfeature', data),
   };
   ```

4. **Use audit methods**: Replace `prisma.model.create()` with `prisma.model.createWithAudit()`

## Configuration

### Azure OpenAI Setup

**API Key Authentication (Development)**
```env
AZURE_OPENAI_USE_API_KEY=true
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

**Azure AD Authentication (Production)**
```env
AZURE_OPENAI_USE_API_KEY=false
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
# Requires: az login (uses DefaultAzureCredential)
```

**Test Connection**:
```powershell
cd backend
npm run test:openai  # Verifies Azure OpenAI configuration
```

### Google OAuth 2.0 Setup

1. **Create project** in [Google Cloud Console](https://console.cloud.google.com)
2. **Enable APIs**: Google+ API and Google OAuth 2.0
3. **Create credentials**: OAuth 2.0 Client ID (Web application)
4. **Configure redirect URIs**:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://your-api-domain.com/api/auth/google/callback`
5. **Copy credentials** to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
6. **Set URLs**:
   ```env
   BACKEND_URL=http://localhost:3001
   FRONTEND_URL=http://localhost:5173
   ```

### Frontend Runtime Configuration

The frontend uses **runtime environment variable injection** (not build-time). This allows the same Docker image to be deployed across different environments without rebuilding.

**How it works**:
1. `frontend/config.template.js` contains placeholders: `__VITE_API_URL__`
2. `frontend/env.sh` runs on container startup, replaces placeholders with environment variables
3. `frontend/src/config/runtime.ts` provides typed access to configuration

**Docker deployment**:
```bash
docker run -p 80:80 \
  -e VITE_API_URL=https://api.example.com \
  -e VITE_WS_URL=wss://api.example.com \
  budget-frontend
```

See `frontend/RUNTIME_CONFIG.md` for complete documentation.

## Troubleshooting

### Database Connection Issues
```powershell
# 1. Verify PostgreSQL is running
# Windows: Check Services
# Linux/Mac: systemctl status postgresql

# 2. Check DATABASE_URL format
# Should be: postgresql://username:password@host:5432/database

# 3. Test connection
cd backend
npm run prisma:migrate

# 4. Reset database (CAUTION: destroys data)
npx prisma migrate reset
```

### WebSocket Connection Failed
**Symptoms**: AI chat doesn't work, real-time updates missing

**Solutions**:
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check WebSocket URL in browser console
3. Inspect JWT token validity: Token expires, need to re-login
4. CORS issues: Ensure `FRONTEND_URL` matches actual frontend origin
5. Firewall/proxy blocking WebSocket connections

**Debug WebSocket**:
```javascript
// Browser console
const socket = io('ws://localhost:3001', { 
  auth: { token: localStorage.getItem('token') }
});
socket.on('connect', () => console.log('Connected'));
socket.on('connect_error', (err) => console.error('Connection error:', err));
```

### Azure OpenAI API Errors
```powershell
# Test connection
cd backend
npm run test:openai

# Common issues:
# 1. Wrong endpoint or deployment name
# 2. API key invalid or expired
# 3. Azure subscription not active
# 4. Rate limit exceeded (check Azure portal)
# 5. Deployment not found (verify deployment name)
```

### Authentication Issues
**"Invalid or expired token"**:
- JWT expired (default expiration time)
- JWT_SECRET changed between login and request
- Token not being sent (check axios interceptor)

**Google OAuth fails**:
- Client ID/Secret mismatch
- Redirect URI not whitelisted in Google Console
- Google API not enabled

### Build Errors
**Frontend build fails**:
```powershell
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Backend build fails**:
```powershell
# Regenerate Prisma client
cd backend
npm run prisma:generate
npm run build
```

### Docker Issues
**Container won't start**:
```powershell
# Check logs
docker logs budget_backend_container
docker logs budget-frontend-prod

# Verify environment variables
docker exec budget_backend_container env | grep AZURE

# Restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**Frontend config not updating**:
- Environment variables only injected at container start
- Restart container after changing env vars
- Verify `env.sh` ran: `docker exec container cat /usr/share/nginx/html/config.js`

## Contributing

1. Create a feature branch
2. Make your changes
3. Run migrations if schema changed
4. Test thoroughly
5. Submit pull request

## License

[Your License Here]

## Support

For issues and questions, please open an issue on the repository.
