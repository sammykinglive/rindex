const express = require('express');
const cors = require('cors');
const { initDb } = require('./db/database');

// Route imports
const authRoutes      = require('./routes/auth');
const receiptsRoutes  = require('./routes/receipts');
const issuesRoutes    = require('./routes/issues');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Initialise database
initDb();

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/receipts',  receiptsRoutes);
app.use('/api/issues',    issuesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'Rindex API running ✅' }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🌽  Rindex Backend API`);
  console.log(`✅  Running on http://localhost:${PORT}`);
  console.log(`📦  Database: rindex.db`);
  console.log(`🔐  Default login: admin@rindex.com / admin123\n`);
});


const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true,  // Force SSL verification
    },
  },
});