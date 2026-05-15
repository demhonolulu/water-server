// ── DB ────────────────────────────────────────────────────
// functions that directly touch the database tables
// should not be called directly other than by queries.js
// ──────────────────────────────────────────────────────────

const config = require("../config/env");

const { Pool } = require("pg");

const pool = new Pool({
    user: config.db.user,
    password: config.db.password,
    host: config.db.host,
    port: config.db.port,
    database: config.db.database
});

// ── SEARCH ────────────────────────────────────────────────
/**
// getter for db records without suffix (ORDER BY, LIMIT, DISTINCT ON)
//   @param {string} table* - Table name
//   @param {string} whereClause - The SQL after WHERE (e.g., "active = $1")
//   @param {any[]} params - Array of values for the placeholders
// */
async function getFromTable(table, whereClause = "1=1", params = []) {
    const queryText = `
        SELECT * FROM ${table}
        WHERE ${whereClause};
    `;

    try {
        const result = await pool.query(queryText, params);
        return result.rows;
    } catch (err) {
        console.error(`Error in getFromTable [${table}]:`, err.message);
        throw err;
    }
}

// ── ADD ───────────────────────────────────────────────────
/**
// add single item to table
//   @param {string}    table*   - 'update_logs'
//   @param {string[]}  columns* - ['gauge_id', 'reading_datetime', 'val']
//   @param {any[]}     data*    - ['USGS-123', 3.62]
// */
async function addToTable(table, columns, data) {
    const columnNames = columns.join(', ');
    const placeholders = data.map((_, i) => `$${i + 1}`).join(', ');

    const queryText = `
        INSERT INTO ${table} (${columnNames})
        VALUES (${placeholders})
        RETURNING *;
    `;

    try {
        const result = await pool.query(queryText, data);
        return; 
    } catch (err) {
        console.error(`Database Error [Table: ${table}]:`, err.message);
        throw err; 
    }
}

/**
// bulk add items to postgres table
//   @param {string}   table*     - 'update_logs'
//   @param {string[]} columns*   - ['gauge_id', 'reading_datetime', 'val']
//   @param {Object[]} dataArray* - [{ id: 'USGS-1', val: 1.2 }, { id: 'USGS-2', val: 3.4 }]
// */
async function bulkInsertToTable(table, columns, dataArray) {
    const columnNames = columnsArray.join(', ');
    const values = [];
    const valuePlaceholders = [];

    // loop through the data to create ($1, $2, $3), ($4, $5, $6) etc.
    dataArray.forEach((row, rowIndex) => {
        const rowPlaceholders = columnsArray.map((col, colIndex) => {
            values.push(row[col]);
            return `$${values.length}`;
        });
        valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const queryText = `
        INSERT INTO ${table} (${columnNames})
        VALUES ${valuePlaceholders.join(', ')}
    `;

    try {
        const result = await pool.query(queryText, values);
        console.log(`Successfully added ${result.rowCount} new rows.`);
        return result.rows;
    } catch (err) {
        console.error("Bulk insert failed:", err.message);
        throw err;
    }
}

module.exports = {
    pool,
    getFromTable,
    addToTable,
    bulkInsertToTable
};