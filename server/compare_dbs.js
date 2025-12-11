const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const prodConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const devConfig = {
    host: 'localhost',
    port: 5433,
    database: 'clowee_erp',
    user: 'postgres',
    password: 'clowee@erp',
};

async function checkDB(name, config) {
    console.log(`--- Checking ${name} DB ---`);
    console.log(`Host: ${config.host}, Port: ${config.port}, DB: ${config.database}`);

    const pool = new Pool(config);
    try {
        const res = await pool.query(`
      SELECT COUNT(*) as count, SUM(sales_amount) as total_sales 
      FROM sales 
      WHERE sales_date >= '2025-11-01' AND sales_date <= '2025-11-30'
    `);
        console.log(`Nov 2025 Sales: Count=${res.rows[0].count}, Total=${res.rows[0].total_sales}`);

        const res3 = await pool.query(`
      SELECT invoice_number, COUNT(*) as count 
      FROM sales 
      GROUP BY invoice_number 
      HAVING COUNT(*) > 1
      LIMIT 5
    `);
        console.log(`Duplicate Invoices: ${res3.rows.length > 0 ? JSON.stringify(res3.rows) : 'None'}`);

        if (res3.rows.length > 0) {
            const res4 = await pool.query(`
         SELECT SUM(sales_amount) as duplicate_amount
         FROM sales
         WHERE invoice_number IN (
            SELECT invoice_number 
            FROM sales 
            GROUP BY invoice_number 
            HAVING COUNT(*) > 1
         )
       `);
            console.log(`Total amount in duplicate invoices: ${res4.rows[0].duplicate_amount}`);
        }

    } catch (e) {
        console.error(`Error connecting to ${name}:`, e.message);
    } finally {
        pool.end();
    }
}

async function run() {
    await checkDB('PROD', prodConfig);
    await checkDB('DEV', devConfig);
}

run();
