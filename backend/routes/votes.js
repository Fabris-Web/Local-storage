const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Add vote
router.post('/', async (req, res) => {
  try {
    const payload = req.body; // expected { id, session_id, position_id, candidate_id, voter_id }
    const { data, error } = await supabase.from('votes').insert([payload]).select('*').single();
    if (error) throw error;
    res.json({ success: true, vote: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

// Get votes for session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('votes').select('*').eq('session_id', req.params.sessionId);
    if (error) throw error;
    res.json({ success: true, votes: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

module.exports = router;
