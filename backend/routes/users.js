const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// List users (admin)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id,email,role,name,active,created_at');
    if (error) throw error;
    res.json({ success: true, users: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id,email,role,name,active,created_at').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Create user (admin creates user)
router.post('/', async (req, res) => {
  try {
    const { email, role = 'voter', name, password_hash } = req.body;
    const payload = { email: String(email).toLowerCase().trim(), role, name };
    if (password_hash) payload.password_hash = password_hash;
    const { data, error } = await supabase.from('users').insert([payload]).select('id,email,role,name,active').single();
    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const patch = req.body;
    if (patch.email) patch.email = String(patch.email).toLowerCase().trim();
    const { data, error } = await supabase.from('users').update(patch).eq('id', req.params.id).select('id,email,role,name,active').single();
    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

module.exports = router;
