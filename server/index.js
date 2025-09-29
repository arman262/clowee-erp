const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3008;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  database: 'clowee_erp',
  user: 'postgres',
  password: 'postgres',
});

app.get('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
    res.json({ data: result.rows, error: null });
  } catch (error) {
    res.json({ data: null, error: error.message });
  }
});

app.post('/api/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await pool.query(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    res.json({ data: null, error: error.message });
  }
});

app.put('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    res.json({ data: result.rows[0], error: null });
  } catch (error) {
    res.json({ data: null, error: error.message });
  }
});

app.delete('/api/:table/:id', async (req, res) => {
  try {
    const { table, id } = req.params;
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ error: null });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});