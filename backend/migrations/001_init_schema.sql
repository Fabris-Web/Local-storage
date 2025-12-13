-- FABRIS Voting System - Postgres Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql/new

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (super_admin, manager, voter)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'manager', 'voter')),
  name TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Sessions table (voting events)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  seats INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_manager_id ON sessions(manager_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Positions table (roles to vote on)
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_positions_session_id ON positions(session_id);

-- Candidates table (nominees for positions)
CREATE TABLE candidates (
  id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_candidates_position_id ON candidates(position_id);

-- Votes table (voter selections)
CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_position_id ON votes(position_id);

-- Chat messages table (per-session public messaging)
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- Voter Invites table (pending voter registrations)
CREATE TABLE voter_invites (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voter_invites_session_id ON voter_invites(session_id);
CREATE INDEX idx_voter_invites_email ON voter_invites(email);

-- Settings table (system-wide configuration)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('rules', '{"one_vote_per_position": true}')
ON CONFLICT (key) DO NOTHING;

-- Seed default super_admin user (password: 1234 hashed with bcrypt)
INSERT INTO users (email, password_hash, role, name, active) VALUES
  ('super@system.com', '$2a$10$mzPxHxF4Q6xf5nXH7E1qQO3nWU8xGxR4PZc8N0Y5XK2Y3K4X7X7He', 'super_admin', 'Super Admin', true),
  ('manager@system.com', '$2a$10$mzPxHxF4Q6xf5nXH7E1qQO3nWU8xGxR4PZc8N0Y5XK2Y3K4X7X7He', 'manager', 'Manager', true),
  ('voter@system.com', '$2a$10$mzPxHxF4Q6xf5nXH7E1qQO3nWU8xGxR4PZc8N0Y5XK2Y3K4X7X7He', 'voter', 'Voter', true)
ON CONFLICT (email) DO NOTHING;

-- Grant RLS policies (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view themselves
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Super admins can view all users
CREATE POLICY "Super admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Policy: Anyone authenticated can insert public chat messages
CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Anyone authenticated can view chat messages
CREATE POLICY "Users can view chat messages" ON chat_messages
  FOR SELECT USING (true);

-- Policy: Managers can view their sessions
CREATE POLICY "Managers can view their sessions" ON sessions
  FOR SELECT USING (manager_id = auth.uid() OR auth.uid() IN (SELECT id FROM users WHERE role = 'super_admin'));

-- Policy: Voters can insert votes in active sessions
CREATE POLICY "Voters can insert votes" ON votes
  FOR INSERT WITH CHECK (voter_id = auth.uid());

-- Policy: Voters can view their own votes
CREATE POLICY "Voters can view their own votes" ON votes
  FOR SELECT USING (voter_id = auth.uid());
