# Copilot Instructions for Voting System

## Architecture Overview

This is a **role-based voting system** with three user roles: super_admin, manager, and voter. The application uses **localStorage as the database** - no backend server exists.

### Data Flow
1. User submits login form (`login.html`) → validates credentials in `db.js`
2. On success, stores user object in localStorage → redirects to `redirect.js`
3. `redirect.js` reads role from localStorage and routes to appropriate dashboard
4. Dashboards are role-specific HTML pages with shared logout functionality

### Key Components
- **`db.js`**: LocalStorage database abstraction with DB object (CRUD operations)
- **`auth.js`**: Login form handler
- **`redirect.js`**: Post-login routing based on user role
- **`logout.js`**: Clears currentUser from localStorage, returns to login
- **`invite.js`**: Super admin can invite new users (managers/voters)
- **Dashboards**: `super_admin.html`, `manager.html`, `voter.html` (role-specific pages)

## Critical Patterns

### Authentication & Authorization
- **Session Storage**: User object stored in `localStorage.currentUser` as JSON string
- **Login Flow**: Email + password validation → user object → localStorage → redirect
- **Protection**: `redirect.js` checks for `currentUser` in localStorage; if missing, redirects to login
- **Hardcoded Defaults** (initialized once):
  - `super@system.com` / `1234` → super_admin role
  - `manager@system.com` / `1234` → manager role
  - `voter@system.com` / `1234` → voter role

### Database Operations
All operations go through `DB` object (in `db.js`):
- `DB.getUsers()` - retrieves all users from localStorage
- `DB.saveUsers(users)` - persists user array to localStorage
- `DB.addUser(email, role)` - creates new user with default password "1234"
- `DB.findUser(email, password)` - validates login credentials

**Important**: Default password for new invites is hardcoded as "1234" in `invite.js` alert message and `db.js` addUser method.

### Role-Based Access
- **Super Admin**: Access to invite.js, can create managers and voters
- **Manager**: Dashboard placeholder (tools "will go here")
- **Voter**: Dashboard placeholder (voting features "will appear here")

Routes are enforced via `redirect.js` switch statement based on `user.role`.

## File Structure Notes
- Root contains HTML pages and JS files (no subdirectories currently used, but dashboards reference `../` paths)
- All dashboards reference `../style.css` and `../js/logout.js` (assumed future restructure)
- Pages include scripts inline via `<script src="...">` tags

## Common Workflows

### Adding New User Functionality
1. Modify the relevant dashboard HTML
2. Create a new .js file for form handling (follow `invite.js` pattern)
3. Use `DB` object for data operations
4. Include logout button with `<button onclick="logout()">Logout</button>` + `<script src="../js/logout.js"></script>`

### Modifying Authentication
- Edit login validation in `auth.js`
- Update role checks in `redirect.js`
- Default users initialized in `db.js` (only runs once if localStorage is empty)

### Styling
- Single `style.css` shared across all pages
- Class names: `.card`, `.btn`, `.note`
- Responsive design uses inline widths (90% for inputs)

## Known Limitations & Technical Debt
- **No Backend**: All data lost on browser clear/new tab
- **Hardcoded Passwords**: Default password is "1234" for all new users
- **No Password Reset**: Users cannot change passwords
- **No Encryption**: Credentials stored in plain localStorage
- **Placeholder Dashboards**: Manager and Voter dashboards are incomplete
