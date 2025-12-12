const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

router.get('/ping', async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(400).json({ success: false, message: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env' });
  }
  try {
    const { data, error } = await supabase.from('users').select('id,email').limit(1);
    if (error) throw error;
    res.json({ success: true, message: 'Supabase connection OK', sample: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || String(err) });
  }
});

module.exports = router;
