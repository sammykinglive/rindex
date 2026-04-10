require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');

const authRoutes      = require('./routes/auth');
const receiptsRoutes  = require('./routes/receipts');
const issuesRoutes    = require('./routes/issues');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    /\.vercel\.app$/
  ],
  credentials: true
}));
app.use(express.json());

initDb().then(() => {
  console.log('✅ Database ready');
}).catch(err => {
  console.error('❌ Database init failed:', err);
});

app.use('/api/auth',      authRoutes);
app.use('/api/receipts',  receiptsRoutes);
app.use('/api/issues',    issuesRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'Rindex API running ✅' }));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🌽  Rindex Backend API`);
  console.log(`✅  Running on http://localhost:${PORT}`);
  console.log(`🗄️   Database: Turso Cloud`);
  console.log(`🔐  Default login: admin@rindex.com / admin123\n`);
});
