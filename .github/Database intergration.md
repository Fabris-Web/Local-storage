# FABRIS Safe Voting System - MongoDB Database Integration

## Architecture Overview

**Current State**: Browser-based system using localStorage  
**Target State**: Full-stack application with Node.js/Express backend and MongoDB

The FABRIS voting system will migrate from localStorage to MongoDB for scalable, persistent data storage with multi-user support, audit trails, and real-time synchronization.

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: MongoDB 6.0+
- **ODM**: Mongoose (schema validation, relationships)
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: Existing Vue/vanilla JS (minimal changes via `api.js` wrapper)

### Architecture Flow
```
Browser (Frontend) 
    ↓
auth.js (login form) → api.js (HTTP requests)
    ↓
Express API Server (Node.js)
    ↓
Mongoose Models → MongoDB Collections
```

## MongoDB Collections & Schemas

### Users Collection
```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "role", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
        password: { bsonType: "string" },  // bcrypt hashed
        role: { enum: ["super_admin", "manager", "voter"] },
        name: { bsonType: "string" },
        active: { bsonType: "bool", default: true },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

// Indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });
```

**Mongoose Schema** (`backend/models/User.js`):
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },  // bcrypt hashed
  role: { type: String, enum: ['super_admin', 'manager', 'voter'], required: true },
  name: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

### Sessions Collection
```javascript
db.createCollection("sessions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "startDate", "endDate", "seats"],
      properties: {
        _id: { bsonType: "objectId" },
        title: { bsonType: "string" },
        description: { bsonType: "string" },
        startDate: { bsonType: "date" },
        endDate: { bsonType: "date" },
        manager: { bsonType: ["string", "null"] },  // email of assigned manager
        seats: { bsonType: "int", minimum: 1 },
        positions: { bsonType: "array", items: { bsonType: "objectId" } },  // refs to positions
        closed: { bsonType: "bool", default: false },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

// Indexes for fast queries
db.sessions.createIndex({ manager: 1 });
db.sessions.createIndex({ startDate: 1, endDate: 1 });
db.sessions.createIndex({ closed: 1 });
db.sessions.createIndex({ createdAt: -1 });
```

**Mongoose Schema** (`backend/models/Session.js`):
```javascript
const sessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  manager: { type: String, ref: 'User', default: null },  // manager email
  seats: { type: Number, required: true, min: 1 },
  positions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Position' }],
  closed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

### Positions Collection (Seats)
```javascript
db.positions.createIndex({ sessionId: 1 });
```

**Mongoose Schema** (`backend/models/Position.js`):
```javascript
const positionSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

### Candidates Collection
```javascript
db.candidates.createIndex({ sessionId: 1 });
db.candidates.createIndex({ positionId: 1 });
db.candidates.createIndex({ voterEmail: 1 });
```

**Mongoose Schema** (`backend/models/Candidate.js`):
```javascript
const candidateSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', default: null },
  name: { type: String, required: true },
  bio: { type: String },
  voterEmail: { type: String },  // nominee's email
  photo: { type: String },  // URL or base64
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

### Votes Collection
```javascript
db.votes.createIndex({ sessionId: 1 });
db.votes.createIndex({ voterEmail: 1, sessionId: 1 }, { unique: true });  // one vote per voter per session (legacy)
db.votes.createIndex({ candidateId: 1 });
db.votes.createIndex({ timestamp: -1 });
```

**Mongoose Schema** (`backend/models/Vote.js`):
```javascript
const voteSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  positionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Position', default: null },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  voterEmail: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for analytics
voteSchema.index({ sessionId: 1, positionId: 1, candidateId: 1 });
```

### Voter Invites Collection
```javascript
db.voterInvites.createIndex({ sessionId: 1 });
db.voterInvites.createIndex({ voterEmail: 1 });
```

**Mongoose Schema** (`backend/models/VoterInvite.js`):
```javascript
const voterInviteSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  voterEmail: { type: String, required: true, lowercase: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  invitedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date }
}, { timestamps: true });

voterInviteSchema.index({ sessionId: 1, voterEmail: 1 }, { unique: true });
```

### Session Chats Collection
```javascript
db.sessionChats.createIndex({ sessionId: 1 });
db.sessionChats.createIndex({ timestamp: -1 });
db.sessionChats.createIndex({ role: 1 });
```

**Mongoose Schema** (`backend/models/SessionChat.js`):
```javascript
const sessionChatSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  from: { type: String, required: true },  // email
  role: { type: String, enum: ['manager', 'voter', 'super_admin'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });
```

## API Endpoints (Express Routes)

### Authentication
```
POST   /api/auth/login          → { email, password } → { token, user }
POST   /api/auth/register       → { email, password, role } → { token, user }
POST   /api/auth/logout         → {} → { success: true }
GET    /api/auth/me             → {} → { user } (JWT protected)
```

### Users (Super Admin)
```
GET    /api/users               → [] (all users)
POST   /api/users               → { email, role } → { user }
PUT    /api/users/:id           → { name, active } → { user }
DELETE /api/users/:id           → {} → { success: true }
```

### Sessions
```
GET    /api/sessions            → [] (all sessions, filtered by manager if not super_admin)
POST   /api/sessions            → { title, seats, startDate, endDate, manager } → { session }
PUT    /api/sessions/:id        → { title, closed, ... } → { session }
DELETE /api/sessions/:id        → {} → { success: true }
GET    /api/sessions/:id/stats  → {} → { voters: [], candidates: [], votes: 0 }
```

### Positions
```
GET    /api/sessions/:id/positions        → [] (positions for session)
POST   /api/sessions/:id/positions        → { name } → { position }
DELETE /api/sessions/:id/positions/:posId → {} → { success: true }
```

### Candidates
```
GET    /api/sessions/:id/candidates       → [] (candidates for session)
POST   /api/sessions/:id/candidates       → { name, bio, positionId, voterEmail } → { candidate }
DELETE /api/candidates/:id                 → {} → { success: true }
```

### Votes
```
GET    /api/sessions/:id/votes            → [] (all votes for session)
POST   /api/sessions/:id/votes            → { positionId, candidateId } → { vote }
GET    /api/sessions/:id/results          → {} → { resultsByPosition: {...} }
```

### Voter Invites
```
GET    /api/sessions/:id/invites          → [] (invited voters for session)
POST   /api/sessions/:id/invites          → { voterEmail } → { invite }
DELETE /api/invites/:id                   → {} → { success: true }
```

### Session Chats
```
GET    /api/sessions/:id/chats            → [] (all chats for session)
POST   /api/sessions/:id/chats            → { text } → { chat }
```

## Frontend Integration (api.js)

Replace `db.js` calls with HTTP requests. Example wrapper:

```javascript
// api.js - HTTP abstraction layer
const API_URL = 'http://localhost:5000/api';

const api = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  // Users
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return res.json();
  },

  // Sessions
  getSessions: async () => {
    const res = await fetch(`${API_URL}/sessions`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return res.json();
  },

  addSession: async (session) => {
    const res = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(session)
    });
    return res.json();
  }
  
  // ... other methods
};
```

## Incremental Migration Strategy

### Phase 1: Backend Setup (Week 1)
- [ ] Initialize Node.js project with Express
- [ ] Install MongoDB driver + Mongoose
- [ ] Create basic API scaffold with JWT auth
- [ ] Keep frontend using localStorage as fallback
- [ ] Goal: User login works via API OR localStorage

### Phase 2: Migrate User Management (Week 2)
- [ ] Implement `/api/auth/login`, `/api/auth/register`
- [ ] Update `auth.js` to call API first, fallback to localStorage
- [ ] Create MongoDB users collection
- [ ] Test login with real MongoDB user
- [ ] Goal: All new users stored in MongoDB

### Phase 3: Migrate Session Data (Week 3)
- [ ] Implement session CRUD API endpoints
- [ ] Update manager/super_admin dashboards to fetch from API
- [ ] Implement caching in localStorage for offline functionality
- [ ] Add WebSocket for real-time updates (optional at this stage)
- [ ] Goal: Sessions fully managed by MongoDB

### Phase 4: Migrate Voting & Reporting (Week 4)
- [ ] Implement votes, candidates, positions API
- [ ] Update voter dashboard to use API
- [ ] Migrate CSV report generation to server-side
- [ ] Test voting workflows
- [ ] Goal: Complete voting flow uses MongoDB

### Phase 5: Chats & Analytics (Week 5)
- [ ] Implement session chats API
- [ ] Add audit logging for admin actions
- [ ] Implement real-time chat via WebSocket
- [ ] Add analytics queries (vote counts, participation, etc.)
- [ ] Goal: Full real-time collaboration features

### Phase 6: Cleanup & Optimization (Week 6)
- [ ] Remove localStorage fallbacks
- [ ] Add database indexes and performance tuning
- [ ] Implement connection pooling
- [ ] Add data validation on server side
- [ ] Test with 1000+ records
- [ ] Goal: Production-ready application

## Indexing Strategy

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Sessions
db.sessions.createIndex({ manager: 1 });
db.sessions.createIndex({ startDate: 1, endDate: 1 });
db.sessions.createIndex({ closed: 1 });

// Votes
db.votes.createIndex({ sessionId: 1, voterEmail: 1 }, { unique: false });
db.votes.createIndex({ candidateId: 1 });

// Chats
db.sessionChats.createIndex({ sessionId: 1, timestamp: -1 });

// Invites
db.voterInvites.createIndex({ sessionId: 1, voterEmail: 1 }, { unique: true });
```

## Security Checklist

- [ ] **Password Hashing**: Use bcrypt (salt rounds: 10+)
- [ ] **JWT Secrets**: Store in environment variables (never hardcode)
- [ ] **CORS**: Restrict to frontend domain only
- [ ] **Input Validation**: Sanitize all API inputs (email format, lengths, types)
- [ ] **Rate Limiting**: Implement on `/api/auth` endpoints
- [ ] **HTTPS Only**: Use TLS/SSL in production
- [ ] **SQL/NoSQL Injection**: Use Mongoose (parameterized queries by default)
- [ ] **Access Control**: Verify user role before returning data
- [ ] **Audit Logging**: Log all admin actions (user creation, session closure, etc.)
- [ ] **Refresh Tokens**: Implement token rotation (optional but recommended)

## Environment Variables (.env)

```env
MONGO_URI=mongodb://localhost:27017/voting_system
JWT_SECRET=your-super-secret-key-change-this
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

## File Structure (After Migration)

```
project/
├── frontend/                    # Existing voting system
│   ├── index.html
│   ├── login.html
│   ├── manager.html
│   ├── voter.html
│   ├── super_admin.html
│   ├── api.js                  # NEW: API wrapper (replaces db.js calls)
│   ├── auth.js                 # UPDATED: use api.js
│   ├── dark-mode.js
│   └── style.css
└── backend/                     # NEW: Node.js + MongoDB
    ├── server.js               # Express app
    ├── .env                    # Credentials (git-ignored)
    ├── config/
    │   └── db.js              # MongoDB connection
    ├── models/
    │   ├── User.js
    │   ├── Session.js
    │   ├── Position.js
    │   ├── Candidate.js
    │   ├── Vote.js
    │   ├── VoterInvite.js
    │   └── SessionChat.js
    ├── routes/
    │   ├── auth.js
    │   ├── users.js
    │   ├── sessions.js
    │   ├── votes.js
    │   └── chats.js
    ├── middleware/
    │   ├── auth.js            # JWT verification
    │   └── errorHandler.js
    ├── package.json
    └── README.md
```

## Key Differences from localStorage

| Feature | localStorage | MongoDB |
|---------|--------------|---------|
| **Persistence** | Browser only | Server-persistent |
| **Multi-user** | Single browser | Shared database |
| **Scalability** | ~5MB limit | Unlimited |
| **Real-time Sync** | Manual polling | WebSocket capable |
| **Backups** | None built-in | Snapshots, replication |
| **Query Performance** | O(n) full scans | Indexed queries O(1) |
| **Audit Trail** | None | Can log all changes |
| **Offline** | Full functionality | Requires API fallback |

## Migration Checklist

- [ ] MongoDB instance running locally
- [ ] Node.js + npm installed
- [ ] Express server booted successfully
- [ ] All schemas created with validation
- [ ] JWT auth working
- [ ] First API endpoint tested with Postman
- [ ] Frontend `api.js` integrated
- [ ] Login flow working (API → MongoDB)
- [ ] Session CRUD working
- [ ] Voting flow complete
- [ ] Reports generating from MongoDB
- [ ] Real-time features tested
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Deployed to staging environment



