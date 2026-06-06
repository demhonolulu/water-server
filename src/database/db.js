const config = require("../config/env");
const columnsConfig = require("./columns.json");
const { ErrorMessage, printToLog, printTimerStart, printTimerEnd } = require("../functions/logs.js");

const { Pool } = require("pg");

const pool = new Pool({
    user: config.db.user,
    password: config.db.password,
    host: config.db.host,
    port: config.db.port,
    database: config.db.database
});

const MAX_PARAMS = 65535;

// ── SEARCH ────────────────────────────────────────────────
/**
// getFromTable
//   getter for db records without suffix (ORDER BY, LIMIT, DISTINCT ON)
//   @param {string} table - Table name
//   @param {any[]} params* - Array of values for the placeholders
//   @param {string} whereClause* - WHERE 'whereClause'
//   @param {string} distinct* - DISTINCT ON (distinct)
//   @param {string} order* - ORDER BY 'order'
//   @param {string} join* - u JOIN 'join'
// */
async function getFromTable(table, params = [], whereClause = "1=1", distinct = null, order = null, join = null) {
    const distinctClause = distinct ? `DISTINCT ON ${distinct}` : ' *';
    const joinClause = join ? `u JOIN ${join}` : '';
    const orderClause = order ? `ORDER BY ${order}` : '';
    const queryText = `
        SELECT ${distinctClause} 
        FROM ${table} ${joinClause}
        WHERE ${whereClause}
        ${orderClause}
    `;

    //console.log(queryText);

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
// bulkInsertToTable
//   bulk add items to postgres table, chunks them to meet 65k param cap
//   @param {string}   table     - 'update_logs'
//   @param {string[]} columns   - ['gauge_id', 'reading_datetime', 'val']
//   @param {Object[]} dataArray - [{ id: 'USGS-1', val: 1.2 }, { id: 'USGS-2', val: 3.4 }]
//   TODO: validate rows, remove bad rows
// */
async function bulkInsertToTable(table, columns, dataArray) {
    // group data into chunks 
    const chunkSize = Math.floor(MAX_PARAMS / columns.length);
    const chunks = [];
    for (let i = 0; i < dataArray.length; i += chunkSize) {
        chunks.push(dataArray.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
        const columnNames = columns.join(', ');
        const values = [];
        const valuePlaceholders = [];

        chunk.forEach((row) => {
            const rowPlaceholders = columns.map((col) => {
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
        } catch (err) {
            console.error("Bulk insert failed:", err.message);
            throw err;
        }
    }
}

// ── VALIDATION ────────────────────────────────────────────
/**
// validateColumns
//   validate table and with column names
//   @param {string} table
//   @param {string[]} columns
//   @returns {{ valid: boolean, errors: Object[]}}
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

    return {
        valid: true
    }
}

/**
// validate bulk insert payload
//   @param {string} table
//   @param {string[]} columns
//   @param {Object[]} dataArray
//   @returns {{ valid: boolean, errors: Object[], sanitizedRows: Object[] }}
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
    bulkInsertToTable,
    validateBulk,
    validateColumns
};