require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || 'http://localhost:5500';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.get('/', (req, res) => res.json({ success: true, message: 'FABRIS Voting System API - Auth Only', endpoints: { auth: '/api/auth' } }));

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
