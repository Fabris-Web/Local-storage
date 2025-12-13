// --------- LOCAL STORAGE DATABASE ---------------------
// Run once to set up the system with default datasets
function safeParse(key) {
	try {
		return JSON.parse(localStorage.getItem(key)) || [];
	} catch (e) {
		return [];
	}
}

if (!localStorage.getItem("users")) {
	const defaultUsers = [
		{ email: "super@system.com", password: "1234", role: "super_admin", active: true },
		{ email: "manager@system.com", password: "1234", role: "manager", active: true },
		{ email: "voter@system.com", password: "1234", role: "voter", active: true }
	];
	localStorage.setItem("users", JSON.stringify(defaultUsers));	fetch('http://localhost:5000/api/auth/login', {
	  method: 'POST',
	  headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({ email: 'test@test.com', password: '1234' }),
	  credentials: 'include'
	})
	.then(r => r.json())
	.then(d => console.log(JSON.stringify(d, null, 2)))
	.catch(e => console.error(e))
}

if (!localStorage.getItem("sessions")) {
	localStorage.setItem("sessions", JSON.stringify([]));
}

if (!localStorage.getItem("positions")) {
	localStorage.setItem("positions", JSON.stringify([]));
}

if (!localStorage.getItem("candidates")) {
	localStorage.setItem("candidates", JSON.stringify([]));
}

if (!localStorage.getItem("votes")) {
	localStorage.setItem("votes", JSON.stringify([]));
}

if (!localStorage.getItem("requests")) {
	localStorage.setItem("requests", JSON.stringify([]));
}

if (!localStorage.getItem("settings")) {
	const defaultSettings = { name: "Voting System", logo: "", rules: "one_vote_per_position", sessionVisibility: "public" };
	localStorage.setItem("settings", JSON.stringify(defaultSettings));
}

if (!localStorage.getItem("sessionChats")) {
	localStorage.setItem("sessionChats", JSON.stringify([]));
}

const DB = {
	// Users
	getUsers: () => safeParse('users'),
	saveUsers: (users) => localStorage.setItem('users', JSON.stringify(users)),
	addUser: (email, role) => {
		const users = DB.getUsers();
		if (users.find(u => u.email === email)) throw new Error('User already exists');
		users.push({ email, password: '1234', role, active: true });
		DB.saveUsers(users);
	},
	findUser: (email, password) => {
		const users = DB.getUsers();
		return users.find(u => u.email === email && u.password === password && u.active !== false);
	},
	updateUserRole: (email, role) => {
		const users = DB.getUsers();
		const u = users.find(x => x.email === email);
		if (u) { u.role = role; DB.saveUsers(users); }
	},
	setUserActive: (email, active) => {
		const users = DB.getUsers();
		const u = users.find(x => x.email === email);
		if (u) { u.active = !!active; DB.saveUsers(users); }
	},
	updateUser: (email, patch) => {
		const users = DB.getUsers();
		const u = users.find(x => x.email === email);
		if (u) { Object.assign(u, patch); DB.saveUsers(users); return u; }
		return null;
	},
	deleteUser: (email) => {
		let users = DB.getUsers();
		users = users.filter(u => u.email !== email);
		DB.saveUsers(users);
	},

	// Sessions
	getSessions: () => safeParse('sessions'),
	saveSessions: (sessions) => localStorage.setItem('sessions', JSON.stringify(sessions)),
	addSession: (session) => {
		const sessions = DB.getSessions();
		session.id = 's_' + Date.now();
		session.closed = false;
		session.positions = session.positions || [];
		sessions.push(session);
		DB.saveSessions(sessions);
		return session;
	},

	// Return true if a session should be considered active/open for voting
	isSessionActive: (session) => {
		if (!session) return false;
		if (session.closed) return false; // manually closed
		const now = Date.now();
		// parse start/end; treat missing start as immediately available, missing end as no auto-close
		let start = session.startDate ? (new Date(session.startDate)).getTime() : -Infinity;
		let end = session.endDate ? (new Date(session.endDate)).getTime() : Infinity;
		if (isNaN(start)) start = -Infinity;
		if (isNaN(end)) end = Infinity;
		// seats requirement: require at least `seats` positions created
		const seatsNeeded = session.seats || 1;
		const positionsCount = (session.positions || []).length;
		return (now >= start && now <= end && positionsCount >= seatsNeeded);
	},

	// Automatically close any sessions whose endDate has passed
	autoCloseExpiredSessions: () => {
		const sessions = DB.getSessions();
		const now = Date.now();
		let changed = false;
		sessions.forEach(s => {
			if (!s.closed && s.endDate) {
				const end = new Date(s.endDate).getTime();
				if (!isNaN(end) && now > end) { s.closed = true; changed = true; }
			}
		});
		if (changed) DB.saveSessions(sessions);
	},
	updateSession: (id, patch) => {
		const sessions = DB.getSessions();
		const s = sessions.find(x => x.id === id);
		if (s) { Object.assign(s, patch); DB.saveSessions(sessions); }
	},
	deleteSession: (id) => {
		let sessions = DB.getSessions();
		sessions = sessions.filter(s => s.id !== id);
		DB.saveSessions(sessions);
	},
	closeSession: (id) => DB.updateSession(id, { closed: true }),

	// Positions
	getPositions: () => safeParse('positions'),
	savePositions: (positions) => localStorage.setItem('positions', JSON.stringify(positions)),
	addPosition: (position) => {
		const positions = DB.getPositions();
		position.id = 'p_' + Date.now();
		positions.push(position);
		DB.savePositions(positions);
		return position;
	},
	updatePosition: (id, patch) => {
		const positions = DB.getPositions();
		const p = positions.find(x => x.id === id);
		if (p) { Object.assign(p, patch); DB.savePositions(positions); }
	},
	deletePosition: (id) => {
		let positions = DB.getPositions();
		positions = positions.filter(p => p.id !== id);
		DB.savePositions(positions);
		// detach from sessions
		const sessions = DB.getSessions();
		sessions.forEach(s => { s.positions = (s.positions || []).filter(pid => pid !== id); });
		DB.saveSessions(sessions);
	},

	// Candidates
	getCandidates: () => safeParse('candidates'),
	saveCandidates: (candidates) => localStorage.setItem('candidates', JSON.stringify(candidates)),
	addCandidate: (candidate) => {
		const candidates = DB.getCandidates();
		candidate.id = 'c_' + Date.now();
		candidates.push(candidate);
		DB.saveCandidates(candidates);
		return candidate;
	},
	updateCandidate: (id, patch) => {
		const candidates = DB.getCandidates();
		const c = candidates.find(x => x.id === id);
		if (c) { Object.assign(c, patch); DB.saveCandidates(candidates); }
	},
	deleteCandidate: (id) => {
		let candidates = DB.getCandidates();
		candidates = candidates.filter(c => c.id !== id);
		DB.saveCandidates(candidates);
	},

	// Votes
	getVotes: () => safeParse('votes'),
	saveVotes: (votes) => localStorage.setItem('votes', JSON.stringify(votes)),
	addVote: (vote) => {
		const votes = DB.getVotes();
		vote.id = 'v_' + Date.now();
		votes.push(vote);
		DB.saveVotes(votes);
		return vote;
	},
	tallyVotesBySession: (sessionId) => {
		const votes = DB.getVotes();
		return votes.filter(v => v.sessionId === sessionId);
	},

	// Participation Requests
	getRequests: () => safeParse('requests'),
	saveRequests: (requests) => localStorage.setItem('requests', JSON.stringify(requests)),
	addRequest: (req) => {
		const requests = DB.getRequests();
		req.id = 'r_' + Date.now();
		req.status = 'pending';
		requests.push(req);
		DB.saveRequests(requests);
		return req;
	},
	updateRequest: (id, patch) => {
		const requests = DB.getRequests();
		const r = requests.find(x => x.id === id);
		if (r) { Object.assign(r, patch); DB.saveRequests(requests); }
	},

	// Settings
	getSettings: () => JSON.parse(localStorage.getItem('settings')),
	saveSettings: (s) => localStorage.setItem('settings', JSON.stringify(s)),
	updateSettings: (patch) => {
		const s = DB.getSettings();
		Object.assign(s, patch);
		DB.saveSettings(s);
	}

	, // <-- comma to separate object properties
	// Session Chats (public per session)
	getSessionChats: () => safeParse('sessionChats'),
	saveSessionChats: (chats) => localStorage.setItem('sessionChats', JSON.stringify(chats)),
	addSessionChat: (chat) => {
		const chats = DB.getSessionChats();
		chat.id = 'm_' + Date.now();
		chat.timestamp = chat.timestamp || Date.now();
		chats.push(chat);
		DB.saveSessionChats(chats);
		return chat;
	},
	clearSessionChatsForSession: (sessionId) => {
		let chats = DB.getSessionChats();
		chats = chats.filter(c => c.sessionId !== sessionId);
		DB.saveSessionChats(chats);
	}

};

// End DB

// End DB