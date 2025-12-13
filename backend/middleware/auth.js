const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

async function protect(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    if (!token && req.cookies) token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

    const decoded = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user from Supabase
    const { data, error } = await supabase.from('users').select('*').eq('id', decoded.id).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = data;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { protect };
