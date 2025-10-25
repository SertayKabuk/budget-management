# Budget Management App

A modern, real-time expense tracking and budget management application with AI-powered features. Built with React, Node.js, PostgreSQL, and Azure OpenAI.

## Features

- **AI-Powered Expense Entry**: Chat naturally with AI to log expenses ("I spent $50 on groceries")
- **Invoice Parsing**: Upload receipt images for automatic expense extraction using GPT-4 Vision
- **Real-time Updates**: WebSocket integration for instant expense notifications across all connected clients
- **Group Management**: Create groups, add members, and track shared expenses
- **User Authentication**: Secure Google OAuth 2.0 authentication with JWT tokens
- **Multi-language Support**: Built-in internationalization (i18n) support
- **Analytics Dashboard**: View spending patterns and group statistics

## Architecture

### Tech Stack

**Backend**
- Node.js + Express (TypeScript)
- PostgreSQL with Prisma ORM
- Socket.io for WebSockets
- Azure OpenAI (GPT-4) for AI features
- Passport.js for authentication
- JWT for session management

**Frontend**
- React 18 + TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Socket.io Client for real-time communication
- Axios for API requests

### Project Structure

```
budget-management/
├── backend/              # Node.js Express API + WebSocket server
│   ├── prisma/          # Database schema and migrations
│   ├── src/
│   │   ├── config/      # Passport OAuth configuration
│   │   ├── middleware/  # Auth and upload middleware
│   │   ├── routes/      # REST API endpoints
│   │   ├── services/    # Azure OpenAI integration
│   │   └── websocket/   # Socket.io event handlers
│   └── uploads/         # Uploaded invoice images
└── frontend/            # React SPA
    ├── public/          # Static assets
    └── src/
        ├── components/  # React components
        ├── contexts/    # Auth and Language contexts
        ├── pages/       # Main application pages
        ├── services/    # API and WebSocket clients
        └── types/       # TypeScript type definitions
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

## Key Workflows

### Authentication Flow

1. User clicks "Sign in with Google" → redirected to Google OAuth
2. Google redirects back to `/api/auth/google/callback`
3. Backend validates OAuth response, creates/updates user
4. Backend issues JWT token
5. Frontend stores JWT in localStorage
6. JWT automatically attached to all API requests via axios interceptor
7. WebSocket connections authenticate using the same JWT

### AI Expense Entry

**Chat-based Entry:**
```
User: "I spent $50 on groceries at Whole Foods"
AI: Extracts amount, category, description → creates expense
```

**Invoice Upload:**
1. User uploads receipt image
2. Backend sends image to GPT-4 Vision
3. AI extracts: amount, merchant, date, line items
4. Returns structured expense data
5. User confirms and saves

### Real-time Updates

- Clients join Socket.io rooms: `group-${groupId}`
- When expense added → server broadcasts to group room
- All connected group members receive instant notification
- Expense list updates automatically

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/logout` - Logout

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Groups
- `GET /api/groups` - List all groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/members` - Add member
- `DELETE /api/groups/:groupId/members/:userId` - Remove member

### Expenses
- `GET /api/expenses` - List expenses (filterable by user/group)
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/parse-invoice` - Parse invoice image

## WebSocket Events

### Client → Server
- `join-group` - Join a group room for real-time updates
- `leave-group` - Leave a group room
- `chat-message` - Send message to AI assistant

### Server → Client
- `chat-response` - AI response to user message
- `expense-added` - New expense created in group
- `error` - Error message

## Database Schema

### Core Models

**User**
- Authenticated via Google OAuth
- Can belong to multiple groups
- Can create expenses

**Group**
- Container for shared expenses
- Has multiple members (Users)
- Tracks group-level spending

**Expense**
- Belongs to one User and one Group
- Fields: amount, description, category, date, currency
- Optional invoice image attachment

**GroupMember** (Junction Table)
- Links Users to Groups (many-to-many)
- Tracks membership status

## Development

### Database Migrations

After modifying `backend/prisma/schema.prisma`:

```powershell
cd backend
npm run prisma:migrate   # Create and apply migration
npm run prisma:generate  # Regenerate Prisma client types
```

### Testing Azure OpenAI Integration

```powershell
cd backend
npm run test:openai      # Test AI service connection
```

### Adding New API Endpoints

1. Create route handler in `backend/src/routes/*.routes.ts`
2. Import and mount in `backend/src/index.ts`
3. Protect with JWT: `router.get('/path', authenticateToken, handler)`
4. Add typed API function in `frontend/src/services/api.ts`

## Configuration

### Azure OpenAI Authentication

**API Key (Development)**
```env
AZURE_OPENAI_USE_API_KEY=true
AZURE_OPENAI_API_KEY=your-key
```

**Azure AD (Production)**
```env
AZURE_OPENAI_USE_API_KEY=false
# Requires: az login
```

### Google OAuth Setup

1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
5. Copy Client ID and Secret to `.env`

## Troubleshooting

### Database Connection Issues
```powershell
# Verify PostgreSQL is running
# Check DATABASE_URL format in .env
npm run prisma:migrate
```

### WebSocket Connection Failed
- Ensure backend server is running on correct port
- Check `VITE_WS_URL` in frontend `.env.local`
- Verify JWT token is valid

### OpenAI API Errors
```powershell
npm run test:openai      # Test connection
# Verify AZURE_OPENAI_* variables in .env
```

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
