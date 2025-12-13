const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// List sessions
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('sessions').select('*');
    if (error) throw error;
    res.json({ success: true, sessions: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Get session
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('sessions').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    res.json({ success: true, session: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Create session
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const { data, error } = await supabase.from('sessions').insert([payload]).select('*').single();
    if (error) throw error;
    res.json({ success: true, session: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Update session
router.put('/:id', async (req, res) => {
  try {
    const patch = req.body;
    const { data, error } = await supabase.from('sessions').update(patch).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json({ success: true, session: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Delete session
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('sessions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

module.exports = router;
