# Migration Guide: localStorage to Backend Database

This guide outlines all the areas you'll need to change when migrating from browser localStorage to a backend database.

---

## 1. Core Data Layer (`db.js` → `api.js`)

**Current:** All data operations use `DB` object that reads/writes to `localStorage`.

**Changes needed:**

- **Replace `db.js`** with a new `api.js` that wraps all DB methods as HTTP API calls instead of localStorage reads/writes.
- **Create these API endpoints** on your backend and update frontend calls to use them:

| Method | Current (localStorage) | New (Backend) |
|--------|------------------------|---------------|
| `DB.getUsers()` | Read from `localStorage['users']` | `GET /api/users` |
| `DB.saveUsers(users)` | Write to `localStorage['users']` | `PUT /api/users` (bulk save) |
| `DB.addUser(email, role)` | Push to array, save | `POST /api/users` |
| `DB.findUser(email, pwd)` | Filter local array | `POST /api/login` (auth endpoint) |
| `DB.updateUser(email, patch)` | Find & modify in array | `PUT /api/users/:email` |
| `DB.deleteUser(email)` | Filter out from array | `DELETE /api/users/:email` |
| `DB.getSessions()` | Read from `localStorage['sessions']` | `GET /api/sessions` |
| `DB.addSession(session)` | Generate local ID, push, save | `POST /api/sessions` |
| `DB.updateSession(id, patch)` | Find & modify, save | `PUT /api/sessions/:id` |
| `DB.deleteSession(id)` | Filter out, save | `DELETE /api/sessions/:id` |
| `DB.getPositions()` | Read from `localStorage['positions']` | `GET /api/positions` or `/api/sessions/:id/positions` |
| `DB.addPosition(position)` | Push, save | `POST /api/sessions/:id/positions` |
| `DB.getCandidates()` | Read from `localStorage['candidates']` | `GET /api/candidates` or `/api/sessions/:id/candidates` |
| `DB.addCandidate(candidate)` | Push, save | `POST /api/candidates` |
| `DB.getVotes()` | Read from `localStorage['votes']` | `GET /api/sessions/:id/votes` |
| `DB.addVote(vote)` | Push, save | `POST /api/sessions/:id/votes` |
| `DB.getRequests()` | Read from `localStorage['requests']` | `GET /api/requests` |
| `DB.getSettings()` | Read from `localStorage['settings']` | `GET /api/settings` |
| `DB.updateSettings(patch)` | Modify, save | `PUT /api/settings` |

**Implementation approach:**

```javascript
// api.js (new file)
const API = {
  async getUsers() {
    const res = await fetch('/api/users');
    return res.json();
  },
  async addUser(email, role) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    return res.json();
  },
  // ... repeat for all DB methods
};
```

Then update all files to use `API.method()` instead of `DB.method()`.

---

## 2. Authentication & Session Management

**Current:** 
- Credentials validated locally in `auth.js` using `DB.findUser()`
- User stored in `localStorage.currentUser` as JSON string

**Changes needed:**

### Files to modify:
- **`auth.js`** – Replace local credential check with `POST /api/login` call
- **`login.html`** – Adapt form handling for server auth response
- **`redirect.js`** – Replace role-based redirect with role from auth token/response
- **`super_admin.html`, `manager.html`, `voter.html`** – Replace `localStorage.currentUser` reads with authenticated user data from session/token

### Specific changes:

1. **Remove local user lookup**
   ```javascript
   // OLD (auth.js)
   let user = DB.findUser(email, password);
   ```
   ```javascript
   // NEW (auth.js)
   const res = await fetch('/api/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password })
   });
   const data = await res.json();
   if (data.token) {
     localStorage.setItem('authToken', data.token); // Store JWT or session cookie
     localStorage.setItem('currentUser', JSON.stringify(data.user));
   }
   ```

2. **Update session storage**
   - Replace storing plain `currentUser` with **secure token storage**:
     - Option A: **httpOnly cookie** (server sets, frontend doesn't touch)
     - Option B: **JWT in localStorage** (less secure but simpler)
   - Remove storing password in `localStorage.currentUser`

3. **Remove auto-user-creation logic**
   ```javascript
   // OLD: Auto-create voter if invited
   if (!user && isInvited && password === '1234') {
     DB.addUser(email, 'voter');
   }
   ```
   Replace with server-side invite system:
   ```javascript
   // NEW: Call server to verify invite and create/login
   const res = await fetch('/api/auth/invite-accept', {
     method: 'POST',
     body: JSON.stringify({ email, password })
   });
   ```

4. **Replace `redirect.js` logic**
   ```javascript
   // OLD
   const user = JSON.parse(localStorage.getItem('currentUser'));
   const role = user.role;
   ```
   ```javascript
   // NEW: Get user from API (using token/session)
   const res = await fetch('/api/me', {
     headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
   });
   const user = await res.json();
   const role = user.role;
   ```

---

## 3. Profile Updates & Password Changes

**Current:** `profile.js` or inline modal code updates user via `DB.updateUser()`

**Changes needed:**

- **Update profile save function** to call `PUT /api/users/:email` or `PUT /api/me`
- **Hash passwords on backend**, not frontend (never send plaintext over HTTP; always use HTTPS)
- **Current password validation** should be done server-side:
  ```javascript
  // OLD (client-side – INSECURE)
  if (current !== user.password) alert('Current password incorrect');
  
  // NEW (server-side – SECURE)
  // Send: { currentPassword, newPassword } to server
  // Server verifies hash, then updates
  ```

---

## 4. Candidate Photos & File Uploads

**Current:** Photos stored as data URLs in candidate object (`candidate.photo = "data:image/png;base64,..."`)

**Changes needed:**

1. **Change upload flow** in `manager.html`:
   ```javascript
   // OLD: Convert to data URL and store in candidate object
   const reader = new FileReader();
   reader.onload = (e) => candidate.photo = e.target.result;
   
   // NEW: Upload file to server, get URL back
   const formData = new FormData();
   formData.append('file', fileInput.files[0]);
   const res = await fetch('/api/uploads', { method: 'POST', body: formData });
   const { url } = await res.json();
   candidate.photo = url; // Store URL, not data
   ```

2. **Store URLs instead of data** in candidates table
   - This also reduces localStorage size and database record size

3. **Update image rendering** to use `<img src="URL" />` instead of data URLs (already compatible)

4. **Backend requirements:**
   - Endpoint: `POST /api/uploads` to receive multipart file
   - Storage: Save to disk, object storage (S3, etc.), or CDN
   - Response: Return public URL to image
   - Optional: Return CDN or presigned URL for direct browser access

---

## 5. Voter Invitations (`voterInvites`)

**Current:** Stored in `localStorage['voterInvites']` as `{ sessionId: [email, email, ...] }`

**Changes needed:**

1. **Create server resource** for session invites:
   - `POST /api/sessions/:id/invites` – Invite voter to session
   - `GET /api/sessions/:id/invites` – List invited voters
   - `DELETE /api/sessions/:id/invites/:email` – Revoke invite

2. **Update `manager.html`** invite form:
   ```javascript
   // OLD: Write to localStorage
   voterInvites[sessionId].push(email);
   localStorage.setItem('voterInvites', JSON.stringify(voterInvites));
   
   // NEW: Call server
   await fetch(`/api/sessions/${sessionId}/invites`, {
     method: 'POST',
     body: JSON.stringify({ email })
   });
   ```

3. **Update `voter.html`** to fetch invited sessions:
   ```javascript
   // OLD: Check localStorage['voterInvites']
   const voterInvites = JSON.parse(localStorage.getItem('voterInvites') || '{}');
   
   // NEW: Call server
   const res = await fetch('/api/me/invites');
   const invitedSessions = await res.json();
   ```

---

## 6. Session Lifecycle & Auto-Close

**Current:** 
- Client tracks session state (active/closed/pending) locally
- `DB.autoCloseExpiredSessions()` runs on page load (client-side check)
- `DB.isSessionActive()` checks time + seat count on client

**Changes needed:**

1. **Move authoritative state to server:**
   - Server cron job or scheduled task that runs periodically to close expired sessions
   - Or: Database trigger on session update to auto-set `closed=true` if `endDate < NOW()`

2. **Client-side adjustments:**
   - Keep countdown timers for UX (visual feedback)
   - Remove/simplify `autoCloseExpiredSessions()` – let server be source of truth
   - Optionally poll `GET /api/sessions/:id` every few seconds to refresh status
   - Or use WebSockets/Server-Sent Events to push updates

3. **Update pages** (`super_admin.html`, `manager.html`, `voter.html`):
   ```javascript
   // OLD: Compute active locally
   const active = DB.isSessionActive(session);
   
   // NEW: Trust server status or refresh from API
   const session = await API.getSession(id);
   const active = session.active; // or check date locally for countdown only
   ```

---

## 7. Voting & Vote Validation

**Current:**
- Voter clicks to vote; vote added to `localStorage['votes']`
- No concurrency/double-voting checks
- Results tallied client-side from all votes

**Changes needed:**

1. **Server-side vote validation** (critical for security):
   ```javascript
   // Backend POST /api/sessions/:sessionId/votes should:
   // - Verify session is active
   // - Verify voter is invited/authenticated
   // - Prevent duplicate votes (one vote per voter per position)
   // - Record vote with timestamp
   // - Return vote ID or error
   ```

2. **Update `voter.html` vote submission:**
   ```javascript
   // OLD: Add to local votes array
   DB.addVote({ sessionId, positionId, candidateId, voterEmail });
   
   // NEW: POST to server
   const res = await fetch(`/api/sessions/${sessionId}/votes`, {
     method: 'POST',
     body: JSON.stringify({
       positionId,
       candidateId,
       voterEmail // or derive from token
     })
   });
   ```

3. **Vote tallying:**
   - Option A: Client fetches all votes and tallies (simpler, less secure)
   - Option B: Call server endpoint for results: `GET /api/sessions/:id/results`
   - Option B is recommended to prevent result tampering

4. **Update closed session results display** in `voter.html`:
   ```javascript
   // NEW: Fetch results from server
   const res = await fetch(`/api/sessions/${sessionId}/results`);
   const results = await res.json();
   // results = { positionId: { candidateId: count, ... }, ... }
   ```

---

## 8. Data Migration (One-Time Setup)

**Current:** Data exists only in browser localStorage

**Changes needed:**

1. **Export tool** – Create script to export all localStorage data:
   ```javascript
   const export = {
     users: JSON.parse(localStorage.getItem('users')),
     sessions: JSON.parse(localStorage.getItem('sessions')),
     positions: JSON.parse(localStorage.getItem('positions')),
     candidates: JSON.parse(localStorage.getItem('candidates')),
     votes: JSON.parse(localStorage.getItem('votes')),
     voterInvites: JSON.parse(localStorage.getItem('voterInvites')),
     settings: JSON.parse(localStorage.getItem('settings'))
   };
   console.log(JSON.stringify(export));
   // Download or copy to file
   ```

2. **Import script/endpoint** – Create backend migration handler:
   - Accept JSON import file
   - Create users, sessions, positions, candidates, votes, invites in order
   - Handle ID mapping (local IDs like `s_123456` → server auto-IDs)
   - Upload photo data URLs to file storage and convert to URLs
   - Validate foreign key relationships (e.g., positionId exists in session.positions)

3. **Testing** – Test migration on staging before production:
   - Export from demo localStorage
   - Import to staging DB
   - Verify all records, relationships, and photos

---

## 9. Client-Side Error Handling & Network Resilience

**Current:** All operations succeed immediately (no network delays)

**Changes needed:**

1. **Network error handling:**
   ```javascript
   try {
     const res = await fetch('/api/sessions');
     if (!res.ok) throw new Error(res.statusText);
     return await res.json();
   } catch (err) {
     console.error('Failed to load sessions:', err);
     alert('Unable to load sessions. Please try again.');
   }
   ```

2. **Loading states** – Show spinners/disabled buttons during API calls

3. **Optimistic updates** – Update UI immediately, revert if server rejects:
   ```javascript
   // Show vote submitted immediately
   uiAddVote(candidateId);
   // But verify on server
   const res = await fetch('/api/vote', { method: 'POST', body: ... });
   if (!res.ok) {
     uiRemoveVote(candidateId);
     alert('Vote failed.');
   }
   ```

4. **Retry logic** – Retry failed requests (with backoff)

5. **Session expiry handling** – If token expires mid-session, redirect to login

---

## 10. Security & Authentication

**Current:** No real security (plaintext passwords in localStorage)

**Changes needed:**

1. **Password hashing:**
   - Frontend: Never hash (hashing client-side is security theater)
   - Backend: Hash with bcrypt, Argon2, or PBKDF2
   - Database: Store hash only, never plaintext

2. **HTTPS/TLS:**
   - All API calls must use HTTPS in production
   - Update all `fetch('http://...')` to `fetch('https://...')`

3. **Authentication tokens:**
   - Use **JWT** (JSON Web Token) with expiry + refresh token, OR
   - Use **Session cookies** with httpOnly flag
   - Never store password in token

4. **Authorization checks:**
   - Server-side role validation for every endpoint
   - Example: `GET /api/sessions/:id` should verify user is manager or admin or invited voter

5. **Input validation:**
   - Server-side validation of all inputs (email, session data, etc.)
   - Client-side validation for UX only

6. **CSRF protection:**
   - Use CSRF tokens or SameSite cookies for state-changing requests

---

## 11. Real-Time Updates (Optional, Recommended)

**Current:** Client polls or manual refresh for updates

**Changes needed:**

1. **Implement WebSockets or Server-Sent Events (SSE):**
   - Live vote count updates for managers/admins
   - Session status changes (when session becomes active/closes)
   - New invites pushed to voters

2. **Libraries:**
   - WebSocket: Native or Socket.IO
   - SSE: Native EventSource API or simple `fetch` streaming

3. **Backend:**
   - Broadcast vote counts every N seconds
   - Push session status changes
   - Notify voters of new invites

---

## 12. Files to Create or Modify

### New files:
- **`api.js`** – API wrapper (replaces many DB methods)
- **`config.js`** – API base URL, feature flags
- **`MIGRATION_GUIDE.md`** (this file)
- **Backend project** – Node/Express, Python/Django, Java, etc.

### Files to modify:
- **`db.js`** – Keep for reference; create `api.js` alongside or replace calls
- **`auth.js`** – Use server `/api/login` instead of local lookup
- **`redirect.js`** – Use `/api/me` instead of `localStorage.currentUser`
- **`login.html`** – Update form handling for server response
- **`super_admin.html`** – Use API calls; update user/session management
- **`manager.html`** – Use API calls; update invite/candidate/photo handling
- **`voter.html`** – Use API calls; fetch invites and results from server
- **`profile.js`** or inline modals – Update to use `PUT /api/users/:id` for password changes
- **`invite.js`** – Use server invite endpoint
- **`logout.js`** – Call `POST /api/logout` to invalidate token/session

### Files to keep (no changes):
- **`style.css`** – Styling unchanged
- **`index.html`** – Welcome page unchanged

---

## 13. Recommended Implementation Order

1. **Set up backend project** (Node/Express, Python/Django, etc.)
2. **Create database schema** (users, sessions, positions, candidates, votes, invites, settings)
3. **Implement auth endpoints** (`POST /api/login`, `GET /api/me`, `POST /api/logout`)
4. **Create `api.js`** wrapper and test login flow
5. **Implement CRUD endpoints** for users, sessions, positions, candidates
6. **Implement vote endpoints** with validation
7. **Test all dashboards** with server backend
8. **Create migration script** to import existing localStorage data
9. **Implement file uploads** for candidate photos
10. **Add real-time updates** (WebSocket/SSE) if desired
11. **Deploy to production** with HTTPS

---

## 14. Backend Endpoint Checklist

```
AUTH
  POST   /api/login                    – Authenticate user
  POST   /api/logout                   – Invalidate token
  GET    /api/me                       – Get current user

USERS
  GET    /api/users                    – List all users (admin)
  GET    /api/users/:id                – Get user details
  POST   /api/users                    – Create user (admin)
  PUT    /api/users/:id                – Update user
  DELETE /api/users/:id                – Delete user

SESSIONS
  GET    /api/sessions                 – List sessions (filter by role)
  GET    /api/sessions/:id             – Get session details
  POST   /api/sessions                 – Create session (manager/admin)
  PUT    /api/sessions/:id             – Update session
  DELETE /api/sessions/:id             – Delete session
  POST   /api/sessions/:id/close       – Close session

POSITIONS (Seats)
  GET    /api/sessions/:id/positions   – List seats in session
  POST   /api/sessions/:id/positions   – Create seat
  PUT    /api/positions/:id            – Update position
  DELETE /api/positions/:id            – Delete position

CANDIDATES
  GET    /api/sessions/:id/candidates  – List candidates in session
  POST   /api/candidates               – Create candidate
  PUT    /api/candidates/:id           – Update candidate
  DELETE /api/candidates/:id           – Delete candidate

VOTES
  POST   /api/sessions/:id/votes       – Cast vote (voter)
  GET    /api/sessions/:id/votes       – Get all votes (manager/admin)
  GET    /api/sessions/:id/results     – Get vote tally/results

INVITES
  POST   /api/sessions/:id/invites     – Invite voter
  GET    /api/sessions/:id/invites     – List invites for session
  DELETE /api/sessions/:id/invites/:email – Revoke invite
  GET    /api/me/invites               – Get sessions user is invited to

FILES
  POST   /api/uploads                  – Upload candidate photo
  GET    /api/uploads/:id              – Download/view photo

SETTINGS
  GET    /api/settings                 – Get system settings
  PUT    /api/settings                 – Update system settings
```

---

## Summary

**Key takeaway:** Replace all `localStorage` reads/writes with API calls to a backend database. The frontend becomes a "thin client" that authenticates via tokens, fetches data from the server, and sends updates via HTTPS. The server becomes the source of truth for all business logic and security validation.

