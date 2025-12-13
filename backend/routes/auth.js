const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

function safeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

// Register
router.post('/register', async (req, res) => {
  const { email, password, role = 'voter', name } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  try {
    const { data: existing, error: e1 } = await supabase.from('users').select('id').eq('email', email).limit(1).maybeSingle();
    if (e1) throw e1;
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase.from('users').insert([{ email: email.toLowerCase().trim(), password_hash, role, name }]).select('*').single();
    if (error) throw error;

    const token = generateToken({ id: data.id, role: data.role });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ success: true, token, user: safeUser(data) });
  } catch (err) {
    console.error('Auth register error:', err);
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  try {
    const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase().trim()).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, data.password_hash || '');
    if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken({ id: data.id, role: data.role });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ success: true, token, user: safeUser(data) });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

// Get current user
const { protect } = require('../middleware/auth');
router.get('/me', protect, async (req, res) => {
  try {
    const user = req.user;
    const { password_hash, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

module.exports = router;
