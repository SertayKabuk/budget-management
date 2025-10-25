# Budget Management App - AI Coding Guide

## Architecture Overview

**Monorepo Structure**: Backend (Node.js/Express/TypeScript) + Frontend (React/Vite/TypeScript)
- Backend: Express API + Socket.io WebSocket server in a single process (`backend/src/index.ts`)
- Frontend: React SPA with Vite, connects via REST API and WebSocket
- Database: PostgreSQL with Prisma ORM (`backend/prisma/schema.prisma`)
- AI: Azure OpenAI for invoice parsing and conversational expense entry

**Key Architectural Pattern**: Real-time bidirectional communication
- REST APIs for CRUD operations (users, groups, expenses)
- WebSocket (Socket.io) for AI chat and real-time expense notifications
- All WebSocket connections are authenticated via JWT tokens

## Critical Developer Workflows

### Running the Application
```powershell
# Backend (from backend/ directory)
npm run dev              # Start with nodemon hot-reload on :3001
npm run dev:debug        # Start with Node debugger attached
npm run prisma:migrate   # Apply database migrations

# Frontend (from frontend/ directory)  
npm run dev              # Start Vite dev server on :5173
npm run build            # Production build
```

### Database Changes
Always use Prisma migrations - never manually edit the database:
```powershell
cd backend
# After editing schema.prisma:
npm run prisma:migrate   # Creates migration + applies it
npm run prisma:generate  # Regenerate Prisma client types
```

### Azure OpenAI Configuration
Backend requires `backend/.env` with either:
- **API Key auth** (dev): `AZURE_OPENAI_USE_API_KEY=true` + `AZURE_OPENAI_API_KEY`
- **Azure AD auth** (prod): `AZURE_OPENAI_USE_API_KEY=false` + `az login`

Test OpenAI integration: `npm run test:openai` (from backend/)

## Project-Specific Conventions

### Authentication Flow
**Google OAuth → JWT**: Users authenticate via Google OAuth 2.0, backend issues JWT tokens
- OAuth config: `backend/src/config/passport.ts` (Passport.js strategies)
- JWT middleware: `backend/src/middleware/auth.middleware.ts` (protects REST routes)
- WebSocket auth: Socket.io middleware in `backend/src/websocket/socket.ts` (validates JWT on connect)
- Frontend: JWT stored in localStorage, auto-attached to API calls via axios interceptor (`frontend/src/services/api.ts`)
- Auth context: `frontend/src/contexts/AuthContext.tsx` (React Context for user state)

### WebSocket Communication Pattern
Socket.io events follow a request/response pattern with room-based broadcasting:

**Client → Server** (`chat-message` event):
```typescript
socket.emit('chat-message', {
  message: "I spent $50 on groceries",
  userId: "user-uuid",
  groupId: "group-uuid", 
  userName: "John"
});
```

**Server → Client** (`expense-added` broadcast):
```typescript
io.to(`group-${groupId}`).emit('expense-added', { expense, addedBy: userName });
```

Clients must join group rooms: `socket.emit('join-group', groupId)`
- Conversation history maintained per socket ID in Map (`backend/src/websocket/socket.ts`)
- Frontend socket connection: `frontend/src/services/socket.ts`

### AI Service Integration
**Azure OpenAI with Function Calling**: AI extracts expense data and triggers backend actions
- Service layer: `backend/src/services/openai.service.ts`
- Two modes: 
  - `chatWithAI()` - Simple chat completions
  - `chatWithAIAndTools()` - Function calling for expense creation
- Function definition: `create_expense` tool in `backend/src/websocket/socket.ts`
- AI automatically calls `executeCreateExpense()` when detecting expense mentions

**Invoice parsing**: Uploads processed via Multer, images sent as base64 to GPT-4 Vision
- Upload middleware: `backend/src/middleware/upload.middleware.ts`
- Parsing function: `parseInvoice()` in openai.service.ts

### UI Architecture (3 Pages)
**HomePage** (`frontend/src/pages/HomePage.tsx`): Primary expense entry
- Group/user selection → invoice upload OR AI chat interface
- Designed for speed - no navigation required for basic tasks

**AdminPage** (`frontend/src/pages/AdminPage.tsx`): Management dashboard  
- User/group CRUD operations
- Statistics cards (total groups, users, expenses)
- Only accessible when authenticated

**GroupPage** (`frontend/src/pages/GroupPage.tsx`): Detailed group view
- Expense history list, group summary, member management
- Links back to HomePage for new expenses

## Integration Points

### Frontend → Backend API
Central API client: `frontend/src/services/api.ts`
- Axios instance with automatic JWT injection via interceptor
- Auto-redirect to login on 401 responses
- Type-safe API wrappers: `userApi`, `groupApi`, `expenseApi`

### Database Schema Key Relationships
```
User ←→ GroupMember ←→ Group
  ↓                       ↓
Expense ←──────────────────┘
```
- Many-to-many: Users ↔ Groups (via GroupMember junction)
- One-to-many: User → Expenses, Group → Expenses
- Unique constraint: `[userId, groupId]` in GroupMember

### External Dependencies
- **Azure OpenAI**: Required for AI features (invoice parsing, chat)
- **Google OAuth 2.0**: Required for authentication (credentials in .env)
- No other external services or APIs

## Common Patterns

### Adding New API Endpoints
1. Create route handler in `backend/src/routes/*.routes.ts`
2. Import and mount in `backend/src/index.ts`: `app.use('/api/endpoint', routes)`
3. Protect with JWT middleware: `router.get('/path', authenticateToken, handler)`
4. Add typed API function in `frontend/src/services/api.ts`

### Real-time Features
All real-time updates use Socket.io rooms named `group-${groupId}`:
- Clients join on group selection
- Server broadcasts to room for group-scoped events
- Pattern: emit to room, don't emit back to sender unless needed

### Type Definitions
Shared types: `frontend/src/types/index.ts` mirrors Prisma models
- Backend uses Prisma-generated types
- Frontend duplicates for API responses (no shared package)

## Environment Variables Reference
**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_USE_API_KEY=true
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key
PORT=3001
```

**Frontend** (`frontend/.env.local`):
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Key Files for Onboarding
- `README.md` - Setup instructions and feature overview
- `backend/prisma/schema.prisma` - Data model (5 models, 100 lines)
- `backend/src/index.ts` - Server entry point showing all routes
- `backend/src/websocket/socket.ts` - WebSocket event handlers and AI integration
- `frontend/src/App.tsx` - React Router setup and auth flow
- `SIMPLIFICATION.md` - UI/UX design decisions and page responsibilities
