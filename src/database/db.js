// ── DB ────────────────────────────────────────────────────
// functions that directly touch the database tables
// should not be called directly other than by queries.js
// ──────────────────────────────────────────────────────────

const config = require("../config/env");
const columnsConfig = require("./columns.json");

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
    const columnNames = columns.join(', ');
    const values = [];
    const valuePlaceholders = [];

    // loop through the data to create ($1, $2, $3), ($4, $5, $6) etc.
    dataArray.forEach((row, rowIndex) => {
        const rowPlaceholders = columns.map((col, colIndex) => {
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

// ── VALIDATION ────────────────────────────────────────────
/**
// validate table and with column names
//   @param {string} table
//   @param {string[]} columns
//   
//   @returns {{
//     valid: boolean,
//     errors: Object[]
//   }}
//  */
function validateColumns(table, columns) {
    const errors = [];

    const tableConfig = columnsConfig[table];
    if (!tableConfig) {
        return {
            valid: false,
            errors: [{ error: `Invalid table: ${table}` }],
        };
    }

    for (const column of columns) {
        if (!tableConfig[column]) {
            errors.push({ column, error: `Invalid column` });
        }
    }

    if (errors.length > 0) {
        return {
            valid: false,
            errors,
        };
    }
}

/**
// validate bulk insert payload
//   @param {string} table
//   @param {string[]} columns
//   @param {Object[]} dataArray
//   
//   @returns {{
//     valid: boolean,
//     errors: Object[],
//     sanitizedRows: Object[]
//   }}
//  */
function validateBulk(table, columns, dataArray) {
    const errors = [];
    const sanitizedRows = [];

    const tableConfig = columnsConfig[table];
    if (!tableConfig) {
        return {
            valid: false,
            errors: [{ error: `Invalid table: ${table}` }],
            sanitizedRows: []
        };
    }

    for (const column of columns) {
        if (!tableConfig[column]) {
            errors.push({ column, error: `Invalid column` });
        }
    }

    if (errors.length > 0) {
        return {
            valid: false,
            errors,
            sanitizedRows: []
        };
    }

    dataArray.forEach((row, rowIndex) => {
        const sanitizedRow = {};
        for (const column of columns) {
            const rules = tableConfig[column];
            const value = row[column];

            if (rules.required && (value === undefined || value === null || value === "")) {
                errors.push({
                    row: rowIndex,
                    column,
                    error: "Required value missing"
                });

                continue;
            }

            // allow nullable
            if (value === undefined || value === null) {
                sanitizedRow[column] = null;
                continue;
            }

            switch (rules.type) {
                case "string":
                    if (typeof value !== "string") {
                        errors.push({row: rowIndex, column, value, error: "Must be string"});
                        continue;
                    }
                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push({row: rowIndex, column, value, error: `Exceeds max length ${rules.maxLength}`});
                        continue;
                    }
                    break;
                case "number":
                    if (typeof value !== "number" || Number.isNaN(value)) {
                        errors.push({row: rowIndex, column, value, error: "Must be number"});
                        continue;
                    }
                    break;
                case "integer":
                    if (!Number.isInteger(value)) {
                        errors.push({row: rowIndex, column, value, error: "Must be integer"});
                        continue;
                    }
                    break;
                case "boolean":
                    if (typeof value !== "boolean") {
                        errors.push({row: rowIndex, column, value, error: "Must be boolean"});
                        continue;
                    }
                    break;
                case "datetime":
                    if (isNaN(Date.parse(value))) {
                        errors.push({row: rowIndex, column, value, error: "Invalid datetime"});
                        continue;
                    }
                    break;
                case "date":
                    if (isNaN(Date.parse(value))) {
                        errors.push({row: rowIndex, column, value, error: "Invalid date"});
                        continue;
                    }
                    break;
                case "object":
                    if (typeof value !== "object" || Array.isArray(value)) {
                        errors.push({row: rowIndex, column, value, error: "Must be object"});
                        continue;
                    }
                    break;
            }
            if (rules.min !== undefined && value < rules.min) {
                errors.push({row: rowIndex, column, value, error: `Below minimum ${rules.min}`});
                continue;
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push({row: rowIndex, column, value, error: `Above maximum ${rules.max}`});
                continue;
            }
            if (rules.allowedValues && !rules.allowedValues.includes(value)) {
                errors.push({row: rowIndex, column, value, error: `Invalid value`});
                continue;
            }
            // passed validation
            sanitizedRow[column] = value;
        }
        sanitizedRows.push(sanitizedRow);
    });

    return {
        valid: errors.length === 0,
        errors,
        sanitizedRows
    };
}

module.exports = {
    pool,
    getFromTable,
    addToTable,
    bulkInsertToTable,
    validateBulk,
    validateColumns
};