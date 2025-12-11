const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');

const app = express();

if (!process.env.PORT) {
  console.error('[CRITICAL] PORT not set in environment');
  process.exit(1);
}

const port = parseInt(process.env.PORT);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://erp.tolpar.com.bd', 'http://103.51.129.55:5173']
    : ['http://localhost:5173', 'http://localhost:9990', 'http://103.51.129.55:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - General
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Strict rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.set('trust proxy', 1);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${randomString}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Database connection
if (!process.env.DB_PASSWORD) {
  console.error('[CRITICAL] DB_PASSWORD not set in environment');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Allowed tables and columns whitelist
const ALLOWED_TABLES = [
  'users', 'franchises', 'machines', 'sales', 'invoices', 'machine_payments',
  'machine_expenses', 'machine_counters', 'banks', 'expense_categories',
  'franchise_agreements', 'attachments', 'notifications', 'inventory_transactions',
  'bank_money_logs', 'audit_logs', 'ledger_entries', 'price_history', 'stock_out_history'
];

const TABLE_ALIASES = {
  'invoices': 'sales'
};

const ALLOWED_COLUMNS = {
  invoices: ['id', 'machine_id', 'franchise_id', 'sales_date', 'coin_sales', 'sales_amount', 'prize_out_quantity', 'prize_out_cost', 'coin_adjustment', 'prize_adjustment', 'adjustment_notes', 'pay_to_clowee', 'electricity_cost', 'amount_adjustment', 'vat_amount', 'net_sales_amount', 'clowee_profit', 'invoice_number', 'payment_status', 'created_at', 'created_by'],
  users: ['id', 'name', 'email', 'role', 'franchise_id', 'first_name', 'last_name', 'username', 'created_at'],
  franchises: ['id', 'name', 'coin_price', 'doll_price', 'electricity_cost', 'vat_percentage', 'franchise_share', 'clowee_share', 'payment_duration', 'maintenance_percentage', 'security_deposit_type', 'security_deposit_notes', 'agreement_copy', 'trade_nid_copy', 'payment_bank_id', 'is_active', 'created_at', 'updated_at'],
  machines: ['id', 'machine_name', 'machine_number', 'franchise_id', 'installation_date', 'notes', 'esp_id', 'branch_location', 'initial_coin_counter', 'initial_prize_counter', 'is_active', 'created_at'],
  sales: ['id', 'machine_id', 'franchise_id', 'sales_date', 'coin_sales', 'sales_amount', 'prize_out_quantity', 'prize_out_cost', 'coin_adjustment', 'prize_adjustment', 'adjustment_notes', 'pay_to_clowee', 'electricity_cost', 'amount_adjustment', 'adjustment_type', 'vat_amount', 'net_sales_amount', 'clowee_profit', 'invoice_number', 'payment_status', 'created_at', 'created_by'],
  machine_payments: ['id', 'machine_id', 'payment_date', 'amount', 'bank_id', 'invoice_id', 'created_by', 'remarks', 'created_at'],
  machine_expenses: ['id', 'machine_id', 'expense_date', 'expense_details', 'quantity', 'item_price', 'total_amount', 'created_at', 'category_id', 'bank_id', 'created_by', 'employee_id', 'expense_number', 'item_name'],
  machine_counters: ['id', 'machine_id', 'reading_date', 'coin_counter', 'notes', 'created_by', 'prize_counter', 'created_at'],
  banks: ['id', 'bank_name', 'account_number', 'account_holder_name', 'branch_name', 'routing_number', 'is_active', 'created_at'],
  expense_categories: ['id', 'category_name', 'description', 'is_active', 'created_at', 'updated_at'],
  franchise_agreements: ['id', 'franchise_id', 'effective_date', 'coin_price', 'doll_price', 'franchise_share', 'clowee_share', 'electricity_cost', 'vat_percentage', 'payment_duration', 'notes', 'created_at', 'updated_at'],
  attachments: ['id', 'franchise_id', 'file_name', 'file_url', 'file_type', 'file_size', 'mime_type', 'uploaded_at'],
  notifications: ['id', 'user_id', 'notification_type', 'message', 'related_module', 'status', 'created_at'],
  inventory_transactions: ['id', 'item_id', 'transaction_type', 'quantity', 'transaction_date', 'related_invoice', 'notes', 'created_at'],
  bank_money_logs: ['id', 'bank_id', 'action_type', 'amount', 'transaction_date', 'remarks', 'created_by', 'created_at', 'updated_at'],
  audit_logs: ['id', 'table_name', 'record_id', 'action', 'old_data', 'new_data', 'changed_by', 'changed_at'],
  ledger_entries: ['id', 'entry_date', 'type', 'debit', 'credit', 'balance', 'description', 'reference_id', 'created_at'],
  price_history: ['id', 'franchise_id', 'effective_date', 'coin_price', 'doll_price', 'electricity_cost', 'vat_percentage', 'created_at'],
  stock_out_history: ['id', 'out_date', 'machine_id', 'item_id', 'quantity', 'remarks', 'handled_by', 'created_at', 'updated_at', 'adjustment_type', 'category', 'item_name', 'unit_price', 'total_price']
};

const validateColumns = (table, columns) => {
  const allowedCols = ALLOWED_COLUMNS[table] || [];
  return columns.every(col => allowedCols.includes(col));
};

// JWT middleware - CRITICAL: This prevents authentication bypass
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('[CRITICAL] JWT_SECRET is not set or too weak');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// Table validation
const validateTable = (req, res, next) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }
  next();
};

// Update password endpoint
app.put('/api/users/:id/password', [
  param('id').isUUID(),
  body('password').isLength({ min: 6 })
], handleValidationErrors, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, name, email, role',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Password update error');
    res.status(500).json({ error: 'Password update failed' });
  }
});

// Register endpoint
app.post('/api/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['user', 'admin', 'spectator'])
], handleValidationErrors, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );

    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Registration error');
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
app.post('/api/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        token: token
      },
      error: null
    });
  } catch (error) {
    console.error('Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

// Employee API proxy
app.get('/api/employees', async (req, res) => {
  const https = require('https');
  https.get('https://emp.sohub.com.bd/api/get_staff_info?staff_ids=10,13,14,17,28', (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        res.json(JSON.parse(data));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }).on('error', (error) => {
    res.status(500).json({ error: error.message });
  });
});

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `https://erp.tolpar.com.bd/uploads/${req.file.filename}`;
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Secure download endpoint
app.get('/api/download', authenticateToken, (req, res) => {
  try {
    const { filename } = req.query;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set headers for download
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Static file serving for uploads
app.use('/uploads', express.static(uploadsDir));

// GET endpoint with table validation
app.get('/api/:table', [
  param('table').custom(value => ALLOWED_TABLES.includes(value))
], handleValidationErrors, authenticateToken, async (req, res) => {
  try {
    const requestedTable = req.params.table;
    const table = TABLE_ALIASES[requestedTable] || requestedTable;

    // Prevent exposing password hashes
    if (table === 'users') {
      const result = await pool.query(`SELECT id, name, email, role, franchise_id, first_name, last_name, username, created_at FROM ${table} ORDER BY created_at DESC`);
      return res.json({ data: result.rows, error: null });
    }

    const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
    res.json({ data: result.rows, error: null });
  } catch (error) {
    console.error('Database error');
    res.status(500).json({ data: null, error: 'Database operation failed' });
  }
});

// POST endpoint with validation
app.post('/api/:table', [
  param('table').custom(value => ALLOWED_TABLES.includes(value))
], handleValidationErrors, authenticateToken, async (req, res) => {
  try {
    const requestedTable = req.params.table;
    const table = TABLE_ALIASES[requestedTable] || requestedTable;
    const data = req.body;

    // Add created_by if user info available AND the table supports it
    if (req.user && req.user.id && ALLOWED_COLUMNS[requestedTable] && ALLOWED_COLUMNS[requestedTable].includes('created_by')) {
      data.created_by = req.user.id;
    }

    const keys = Object.keys(data);

    // Validate column names
    console.log('POST Table:', requestedTable, 'Keys:', keys, 'Allowed:', ALLOWED_COLUMNS[requestedTable]);
    if (!validateColumns(requestedTable, keys)) {
      console.log('Column validation failed for table:', requestedTable, 'Keys:', keys);
      return res.status(400).json({ error: 'Invalid column names' });
    }

    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await pool.query(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Database error');
    res.status(500).json({ data: null, error: 'Database operation failed' });
  }
});

// PUT endpoint with validation
app.put('/api/:table/:id', [
  param('table').custom(value => ALLOWED_TABLES.includes(value)),
  param('id').isUUID()
], handleValidationErrors, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestedTable = req.params.table;
    const table = TABLE_ALIASES[requestedTable] || requestedTable;
    const data = req.body;
    const keys = Object.keys(data);

    // Validate column names
    if (!validateColumns(requestedTable, keys)) {
      return res.status(400).json({ error: 'Invalid column names' });
    }

    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    console.error('Database error');
    res.status(500).json({ data: null, error: 'Database operation failed' });
  }
});

// DELETE endpoint with validation
app.delete('/api/:table/:id', [
  param('table').custom(value => ALLOWED_TABLES.includes(value)),
  param('id').isUUID()
], handleValidationErrors, authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const table = TABLE_ALIASES[req.params.table] || req.params.table;
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ error: null });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Cannot delete: record has related data' });
    }
    console.error('Database error');
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Secure server running at http://0.0.0.0:${port}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});