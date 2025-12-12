# FABRIS Safe Voting System - Database Integration

## Architecture Overview

This is a **browser-based, role-based voting system** with three user roles: `super_admin`, `manager`, and `voter`. The application uses **localStorage as the persistent database** with no backend server.

### Core Data Layer
- **`db.js`**: Central localStorage abstraction providing a complete CRUD API
- **Entity Types**: Users, Sessions, Positions, Candidates, Votes, Voter Invites, Session Chats
- **ID Generation**: Timestamp-based with role prefixes (e.g., `s_` for sessions, `c_` for candidates)

### Key Components
- **`db.js`**: LocalStorage database abstraction (all data operations)
- **`auth.js`**: Login form handler with email/password validation
- **`redirect.js`**: Post-login routing based on user role
- **`logout.js`**: Session cleanup (clears `currentUser`)
- **`dark-mode.js`**: Dark/light theme toggle with localStorage persistence
- **Dashboards**: `super_admin.html`, `manager.html`, `voter.html` (role-specific UI)
- **Style**: `style.css` (responsive, theme-aware with CSS variables)

## Data Model

### Users
```js
{
  email: "user@example.com",
  password: "1234",
  role: "super_admin|manager|voter",
  name: "Display Name",
  active: true
}
```

### Sessions
```js
{
  id: "s_" + timestamp,
  title: "Session Title",
  description: "Details",
  startDate: ISO8601,
  endDate: ISO8601,
  manager: "manager@example.com",
  seats: 2,
  positions: ["p_123", "p_456"],
  closed: false
}
```

### Positions (Seats)
```js
{
  id: "p_" + timestamp,
  sessionId: "s_123",
  name: "President"
}
```

### Candidates
```js
{
  id: "c_" + timestamp,
  sessionId: "s_123",
  positionId: "p_123",
  name: "John Doe",
  bio: "Short bio",
  voterEmail: "voter@example.com",
  photo: "url or base64"
}
```

### Votes
```js
{
  id: "v_" + timestamp,
  sessionId: "s_123",
  positionId: "p_123",
  candidateId: "c_123",
  voterEmail: "voter@example.com",
  timestamp: ISO8601
}
```

### Voter Invites
```js
{
  "s_123": ["voter1@example.com", "voter2@example.com"],
  "s_456": ["voter3@example.com"]
}
```

### Session Chats
```js
{
  id: "m_" + timestamp,
  sessionId: "s_123",
  from: "manager@example.com",
  role: "manager|voter|super_admin",
  text: "Message content",
  timestamp: timestamp
}
```

## Critical Patterns

### Authentication & Authorization
- **Session Storage**: User object stored in `localStorage.currentUser` (JSON string)
- **Login Flow**: Email validation + password check → user object → redirect
- **Authorization**: `redirect.js` enforces role-based routing; missing `currentUser` redirects to login
- **Default Users** (initialized once on first app load):
  - `super@system.com` / `1234` → super_admin
  - `manager@system.com` / `1234` → manager
  - `voter@system.com` / `1234` → voter

### Database Operations
All data access via `DB` object in `db.js`. Example patterns:
```js
DB.getUsers()                           // array of all users
DB.addUser(email, role)                // new user with default pw "1234"
DB.findUser(email, password)           // login validation
DB.getSessions()                       // all sessions
DB.addSession({...})                   // create session
DB.getSessionChats()                   // public per-session chats
DB.addSessionChat({sessionId, from, role, text, timestamp})
DB.getCandidates()                     // all candidates
DB.getVotes()                          // all votes
```

**Important**: Default password hardcoded as `"1234"` in `addUser()`. No password reset mechanism.

### Role-Based Dashboards

#### Super Admin (`super_admin.html`)
- User Management: add/remove/toggle users
- Session Management: create, close, delete sessions
- Voter Invites: invite voters to sessions
- Session Statistics: voters, candidates, votes
- Analytics: participation overview
- Per-Session Chat: public reply channel via chat modal
- Header Chat Button: quick access to all session chats

#### Manager (`manager.html`)
- Assigned Sessions: manage only sessions assigned by super admin
- Voters: invite voters to assigned sessions
- Candidates: manage candidates (voter-nominated or manager-added)
- Session Reports:
  - **Download Voters List**: all invited voters with system + session name in title
  - **Download Candidates List**: all candidates with seats (if multi-seat)
- Session Statistics: display voters, candidates, votes per session
- Session Chat: manager-side reply channel for public session chat
- Responsive session cards with inline voting panel for candidates

#### Voter (`voter.html`)
- Session Browse: invited sessions (active, pending, closed)
- Cast Vote: inline voting panel (supports multi-seat sessions)
- Session Chat: public message board per session
- Results: closed session voting tallies
- Statistics: invited/voted sessions, active sessions

### Theme System
- **CSS Variables**: All colors defined via `--bg-primary`, `--text-primary`, `--accent-primary`, etc.
- **Dark Mode Toggle**: `dark-mode.js` creates toggle button, persists preference to `localStorage.darkModeEnabled`
- **Attribute-Based**: `html[data-theme="dark"]` selector for dark-specific overrides
- **Per-Page Customization**: Each dashboard has theme variable overrides in `<style>` block

### Chat UI
- **Professional Bubbles**: Sent messages (right, accent color), received messages (left, secondary background)
- **Styling**: Rounded corners, timestamps, sender info
- **Persistence**: All chats in localStorage under `sessionChats`
- **Access**: Super admin (header "Chats" button + per-session modal), manager (header "Chat" button), voters (embedded in session card)

## Common Workflows

### Creating a New Session
1. Super admin navigates to "Voting Sessions" section
2. Fills form: title, seats, start/end dates, description, optional manager
3. System generates `id: "s_" + Date.now()`
4. DB stores in `sessions` array via `DB.addSession(...)`

### Inviting Voters to Session
1. Manager selects session, enters voter email
2. Email added to `voterInvites[sessionId]` array in localStorage
3. Voter receives no email; must be notified out-of-band
4. On first login, voter auto-enrolls if email in `voterInvites`

### Voting Flow
1. Voter logs in → sees invited sessions
2. Session is active (time-based check via `DB.isSessionActive()`)
3. Voter opens voting panel → selects candidates per seat
4. Submit → votes recorded with voter email, timestamp, position/candidate IDs
5. Closed sessions show results (tally by position)

### Reporting
- Managers can download CSV:
  - **Voters List**: all invited voters (system + session name in header)
  - **Candidates List**: all candidates with seats
  - **Votes Summary**: candidate vote counts per position

### Session Lifecycle
- **Pending**: session exists, startDate in future or minimum positions not met
- **Active**: startDate ≤ now ≤ endDate AND positions count ≥ seats
- **Closed**: endDate passed OR manually closed by manager/super admin

## File Structure

```
.
├── index.html                   # Landing page
├── login.html                   # Login form
├── redirect.html                # Loading/redirect page
├── super_admin.html             # Super admin dashboard
├── manager.html                 # Manager dashboard
├── voter.html                   # Voter dashboard
├── not-authorized.html          # 403 page
├── auth.js                      # Login validation
├── db.js                        # localStorage CRUD layer
├── redirect.js                  # Role-based routing
├── logout.js                    # Session cleanup
├── dark-mode.js                 # Theme toggle manager
├── style.css                    # Shared responsive styling
├── default-users.txt            # Documentation of initial users
├── MIGRATION_GUIDE.md           # Future backend migration steps
└── .github/
    └── copilot-instructions.md  # AI coding guidelines
```

## Known Limitations & Technical Debt

- **No Backend**: All data lost if localStorage is cleared or accessed in new incognito window
- **Hardcoded Passwords**: Default password "1234" for all new users; no password reset
- **No Encryption**: Credentials + votes stored in plain localStorage
- **No Audit Trail**: No activity logging or event history
- **No Email Notifications**: Voter invites require out-of-band communication
- **Single-Tab Sync**: Changes in one tab don't auto-sync other tabs
- **No Rate Limiting**: Anyone with access can spam requests/chats
- **Chat Moderation**: No delete/edit on messages; no spam filters

## Future Backend Migration
See `MIGRATION_GUIDE.md` for planned transition from localStorage to a REST API backend. The DB layer abstraction in `db.js` enables swapping to HTTP calls with minimal UI changes.

## Security Notes
- **Demo Only**: This system is suitable only for demos/testing, not production
- **No Authentication**: No real session tokens or JWT
- **Plaintext Storage**: Users can inspect credentials in browser DevTools
- **No HTTPS**: Should only run on localhost in development

