# AI Agent Instructions for Fabris Safe Voting System

## Architecture Overview

This is a **browser-based voting system** (currently localStorage-backed) with role-based access control. The system has three user roles:
- **super_admin**: Full system control, manages users, sessions, voting rules
- **manager**: Creates/manages voting sessions and positions, invites voters
- **voter**: Participates in voting sessions

**Key insight**: The system is designed for migration to a backend database—see `MIGRATION_GUIDE.md` for the planned transition from localStorage to REST API.

## Core Data Layer Pattern

All data operations use the `DB` object in [db.js](db.js) as a centralized abstraction:

```javascript
// Read data
DB.getUsers() / DB.getSessions() / DB.getVotes() / etc.

// Write data
DB.addUser(email, role) / DB.saveUsers(users) / DB.updateSession(id, patch) / etc.

// Generate IDs: Uses timestamp-based prefixes (e.g., 's_' + Date.now())
```

**When modifying data**: Always use DB methods, never write directly to `localStorage`. This ensures the codebase stays ready for backend migration with minimal refactoring.

## Authentication & Session Flow

1. **Login** ([auth.js](auth.js)): User emails are auto-lowercased and trimmed; password validated against `DB.findUser()`
2. **Auto-enrollment**: Invited voters with default password `1234` auto-create accounts on first login if their email appears in `voterInvites`
3. **Role routing** ([redirect.js](redirect.js)): After login, users redirect based on `currentUser.role` stored in localStorage
4. **Logout** ([logout.js](logout.js)): Clears `currentUser` from localStorage

**Session lifecycle**:
- Sessions have optional `startDate` and `endDate`; `isSessionActive()` checks if voting is open (time-based + manual closure)
- Sessions require minimum position count (`seats` field) to become active
- Expired sessions auto-close via `autoCloseExpiredSessions()`

## Common Patterns

**Accessing current user**: Always read from `localStorage.getItem("currentUser")` and validate it exists (redirect to login.html if null)

**ID generation**: All entities use prefix + timestamp:
- Sessions: `s_` + timestamp
- Positions: `p_` + timestamp  
- Candidates: `c_` + timestamp
- Votes: `v_` + timestamp
- Requests: `r_` + timestamp

**Data validation**: Use `safeParse()` for localStorage reads—it catches JSON errors and returns empty arrays

**Voting rules**: Stored in `settings.rules` (currently only `"one_vote_per_position"` implemented)

## File Organization

| File | Purpose |
|------|---------|
| [db.js](db.js) | Central data layer; all CRUD operations |
| [auth.js](auth.js) | Login form handling and user validation |
| [redirect.js](redirect.js) | Role-based routing after login |
| [invite.js](invite.js) | User invitation form (manager feature) |
| [logout.js](logout.js) | Session cleanup on logout |
| [manager.html](manager.html) | Session/position/candidate management UI |
| [voter.html](voter.html) | Voting interface |
| [super_admin.html](super_admin.html) | User & system settings management |
| [style.css](style.css) | Global styles |

## Future Migration Guidance

The codebase is structured for backend migration (see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md#core-data-layer-db-js--apijs)):
- Replace [db.js](db.js) with `api.js` that wraps all methods as HTTP calls
- Each DB method maps to a backend endpoint (e.g., `DB.addSession()` → `POST /api/sessions`)
- Frontend logic remains unchanged; only the data transport layer swaps from localStorage to fetch/HTTP

## Edge Cases to Handle

- Email normalization: Always lowercase + trim before DB lookups
- Invited voters: Check `localStorage['voterInvites']` before creating accounts
- Session timing: Use `Date.now()` for comparisons; handle invalid/missing dates gracefully
- Default password is hardcoded as `'1234'` for all new invites

