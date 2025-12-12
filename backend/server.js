require('dotenv').config();
const express = require('express');
const supabaseTest = require('./routes/supabase-test');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.json({ success: true, message: 'FABRIS Voting System API', endpoints: { health: '/api/health', supabase_ping: '/api/supabase/ping' } }));

app.use('/api/supabase', supabaseTest);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
