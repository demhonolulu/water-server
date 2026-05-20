// ── QUERIES ───────────────────────────────────────────────
// public functions that read or modify data in the tables
// ──────────────────────────────────────────────────────────

const { pool, getFromTable, addToTable, bulkInsertToTable, validateColumns } = require("./db.js");
const { ErrorMessage } = require("../functions/logs.js");

/**
// getActiveLocations
// gets active locations and groups locations by array of column names. Grouping will be nested
//   @param {string[]} groupBy - ['gauge_id', 'area']
//   @returns {Object} - {"USGS":["NORTH-SHORE":[{"gauge_id"}]], "UHSLC": []}
// */
async function getActiveLocations(groupBy = null) {
    if (groupBy) {
        const valid = validateColumns('gauge_locations', groupBy);
        if (!valid?.valid) {
            throw new ErrorMessage('getActiveLocations - Invalid column groupBy query', valid.errors);
            return;
        }
        
        const locations = await getFromTable('gauge_locations', 'active = TRUE');
        if (locations.rows < 1) {
            // no active locations
            return;
        }

        // recursive function to group locations in nested order
        function groupLocations(items, keys) {
            if (keys.length === 0) return items;

            const [currentKey, ...remainingKeys] = keys;
            return items.reduce((acc, location) => {
                const key = location[currentKey];
                if (!acc[key]) acc[key] = [];
                acc[key].push(location);
                return acc;
            }, Object.fromEntries(
                [...new Set(items.map(l => l[currentKey]))].map(k => [k, []])
            ));

            return Object.fromEntries(
                Object.entries(grouped).map(([key, items]) => [key, groupLocations(items, remainingKeys)])
            );
        }

        return groupLocations(locations, groupBy);
    }
}

module.exports = {
    getActiveLocations
};