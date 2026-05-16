// ── QUERIES ───────────────────────────────────────────────
// public functions that read or modify data in the tables
// ──────────────────────────────────────────────────────────

const { pool, getFromTable, addToTable, bulkInsertToTable, validateColumns } = require("./db.js");

/**
// getter for db records without suffix (ORDER BY, LIMIT, DISTINCT ON)
//   @param {string[]} groupBy - ['type', 'area']
//   @returns {Object} - {"USGS":[''], "UHSLC": ['']}
// */
async function getActiveLocations(groupBy = null) {
    if (groupBy) {
        const valid = validateColumns('gauge_locations', groupBy);
    }
    
}