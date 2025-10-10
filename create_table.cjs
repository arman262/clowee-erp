const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'clowee_erp',
  password: 'clowee@erp',
  port: 5432,
});

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE machine_expenses ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES expense_categories(id);
    `);

    await pool.query(`
      INSERT INTO expense_categories (category_name, description, is_active) VALUES
      ('Maintenance', 'Machine maintenance and repairs', true),
      ('Supplies', 'Office and operational supplies', true),
      ('Utilities', 'Electricity, water, and other utilities', true),
      ('Transportation', 'Travel and transportation costs', true),
      ('Marketing', 'Advertising and promotional expenses', true),
      ('Miscellaneous', 'Other general expenses', true)
      ON CONFLICT (category_name) DO NOTHING;
    `);

    console.log('Table created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createTable();