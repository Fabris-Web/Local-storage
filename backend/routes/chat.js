const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Get chat messages for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', req.params.sessionId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, messages: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Post chat message
router.post('/', async (req, res) => {
  try {
    const payload = req.body; // { id, session_id, user_id, message }
    const { data, error } = await supabase.from('chat_messages').insert([payload]).select('*').single();
    if (error) throw error;
    res.json({ success: true, message: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

module.exports = router;
