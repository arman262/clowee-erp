const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const ALLOWED_TABLES = [
    'users', 'franchises', 'machines', 'sales', 'invoices', 'machine_payments',
    'machine_expenses', 'machine_counters', 'banks', 'expense_categories',
    'franchise_agreements', 'attachments', 'notifications', 'inventory_transactions',
    'bank_money_logs', 'audit_logs', 'ledger_entries', 'price_history', 'stock_out_history', 'employees'
];

async function inspect() {
    let output = '';
    try {
        for (const table of ALLOWED_TABLES) {
            const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table]);

            const columns = res.rows.map(r => r.column_name).sort();
            output += `TABLE:${table}\n${JSON.stringify(columns)}\n`;
        }
        fs.writeFileSync('schema_dump.txt', output);
        console.log('Schema dumped to schema_dump.txt');
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

inspect();
