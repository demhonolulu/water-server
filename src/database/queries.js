// ── QUERIES ───────────────────────────────────────────────
// public functions that read or modify data in the tables
// ──────────────────────────────────────────────────────────

const { pool, getFromTable, bulkInsertToTable, validateColumns } = require("./db.js");
const { ErrorMessage, printToLog, printTimerStart, printTimerEnd } = require("../functions/logs.js");

// create mapping between gauge_id and gauge_type for quick lookup
const gaugeTypeMap = {};
(async () => {
    const locations = await getFromTable('gauge_locations');
    locations.forEach(loc => {
        gaugeTypeMap[loc.gauge_id] = loc.gauge_type;
    });
})();

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

/**
// getActiveLocations
//   gets active locations and groups locations by array of column names. Grouping will be nested
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
        
        const locations = await getFromTable('gauge_locations', [], 'active = TRUE');
        if (locations.rows < 1) {
            // no active locations
            return;
        }

        return groupLocations(locations, groupBy);
    }
}

/**
// getCurrentOverview
//   gets the latest reading of each gauge from gauge_readings
//   @returns {Object} - {"USGS":["NORTH-SHORE":[{"gauge_id"}]], "UHSLC": []}
// */
async function getCurrentOverview(locations) { 
    const locationsArray = locations.split(',');
    const gauges = await getFromTable(
        'update_logs', 
        [locationsArray], 
        `gauge_id = ANY($1)`, 
        'gauge_id', 
        'gauge_id, reading_datetime DESC'
    );

    const groupedByType = {};
    gauges.forEach((gauge) => {
        const type = gaugeTypeMap[gauge.gauge_id];
        if (!groupedByType[type]) groupedByType[type] = {};
        groupedByType[type][gauge.gauge_id] = gauge;
    });

    return groupedByType;
}

/**
// createGaugeTypeMap
//   creates a lookup map for a gauge_id with their type
// */
async function createGaugeTypeMap() { 
    const locations = await getFromTable('gauge_locations');
    locations.forEach(loc => {
        gaugeTypeMap[loc.gauge_id] = loc.gauge_type;
    });
}

async function addToUpdateLogs(updates) {
    const timerId = printTimerStart();
    await bulkInsertToTable('update_logs', ['gauge_id', 'reading_datetime', 'val'], updates);
    printTimerEnd(timerId, `[->] Update_Logs: ${updates.length} rows`, 1, false);
}

async function addGaugeReadings(updates) {
    const timerId = printTimerStart();
    await bulkInsertToTable('gauge_readings', ['gauge_id', 'reading_datetime', 'val'], updates)
    printTimerEnd(timerId, `[->] Gauge_Readings: ${updates.length} rows`, 1);
}

module.exports = {
    getActiveLocations,
    getCurrentOverview,
    addToUpdateLogs,
    addGaugeReadings
};