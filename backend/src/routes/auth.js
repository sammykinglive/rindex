const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get, all } = require('../db/database');
const { authMiddleware, adminOnly, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ── Default permissions for new staff users ───────────────────────────────────
const DEFAULT_STAFF_PERMISSIONS = {
  dashboard:  { view: true },
  receipts:   { view: true,  create: true,  edit: true,  delete: false, export: false },
  issues:     { view: true,  create: true,  edit: true,  delete: false, export: false },
  balance:    { view: true,  export: false },
  expenses:   { view: false, create: false, edit: false, delete: false, export: false },
  pnl:        { view: false },
};

const ADMIN_PERMISSIONS = {
  dashboard:  { view: true },
  receipts:   { view: true,  create: true,  edit: true,  delete: true, export: true },
  issues:     { view: true,  create: true,  edit: true,  delete: true, export: true },
  balance:    { view: true,  export: true },
  expenses:   { view: true,  create: true,  edit: true,  delete: true, export: true },
  pnl:        { view: true },
};

// Ensure permissions column exists (idempotent migration)
async function ensurePermissionsColumn() {
  try {
    await run(`ALTER TABLE users ADD COLUMN permissions TEXT`);
  } catch (_) { /* column already exists — ignore */ }
}
ensurePermissionsColumn();

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    // Determine effective permissions
    const permissions = user.role === 'admin'
      ? ADMIN_PERMISSIONS
      : (user.permissions ? JSON.parse(user.permissions) : DEFAULT_STAFF_PERMISSIONS);

    const tokenPayload = { id: user.id, name: user.name, email: user.email, role: user.role, permissions };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions } });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ── List Users ────────────────────────────────────────────────────────────────
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await all('SELECT id, name, email, role, permissions, created_at FROM users ORDER BY created_at DESC');
    const parsed = users.map(u => ({
      ...u,
      permissions: u.permissions ? JSON.parse(u.permissions) : (u.role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS),
    }));
    res.json(parsed);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── Create User ───────────────────────────────────────────────────────────────
router.post('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
    const existing = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'A user with this email already exists.' });
    const hashed = bcrypt.hashSync(password, 10);
    const effectivePerms = role === 'admin'
      ? ADMIN_PERMISSIONS
      : (permissions || DEFAULT_STAFF_PERMISSIONS);
    const result = await run(
      'INSERT INTO users (name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), hashed, role || 'staff', JSON.stringify(effectivePerms)]
    );
    res.status(201).json({ id: result.lastInsertRowid, name, email, role: role || 'staff', permissions: effectivePerms });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── Update User Permissions ───────────────────────────────────────────────────
router.put('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { permissions, role } = req.body;
    const uid = parseInt(req.params.id);
    if (uid === req.user.id) return res.status(400).json({ error: 'You cannot edit your own permissions.' });
    const updates = [];
    const params = [];
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    params.push(uid);
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'User updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── Delete User ───────────────────────────────────────────────────────────────
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── Change Password ───────────────────────────────────────────────────────────
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(400).json({ error: 'Current password is incorrect.' });
    const hashed = bcrypt.hashSync(newPassword, 10);
    await run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
