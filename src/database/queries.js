const { pool, getFromTable, bulkInsertToTable, validateColumns } = require("./db.js");
const { ErrorMessage, printToLog, printTimerStart, printTimerEnd } = require("../functions/logs.js");
const { DEBUG } = require("../config/env");

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
async function getActiveLocationsDB(groupBy = null) {
    if (groupBy) {
        const valid = validateColumns('gauge_locations', groupBy);
        if (!valid?.valid) {
            throw new ErrorMessage('getActiveLocations - Invalid column groupBy query', valid.errors);
            return;
        }
        
        printToLog("Refreshed active locations");
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
        `gauge_id = ANY($1) AND has_data = TRUE`, 
        '(gauge_id) *', 
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
// getTableOverview
//   gets the raw data for the table overview display. pulls the most recent value
//   for all active gauges and the reading from an hour ago
//   @returns {Object} - {"USGS":["NORTH-SHORE":[{"gauge_id"}]], "UHSLC": []}
// */
async function getTableOverviewDB(locations) { 
    // console.log(locations);
    // const locationsArray = locations.split(',');

    // const [current, hourAgo] = await Promise.all([
    //     getFromTable(
    //         'update_logs',
    //         [locationsArray],
    //         `gauge_id = ANY($1) AND has_data = TRUE`,
    //         'gauge_id',
    //         'gauge_id, reading_datetime DESC'
    //     ),
    //     getFromTable(
    //         'update_logs',
    //         [locationsArray],
    //         'u.has_data = TRUE AND u.reading_datetime <= curr.hour_before',
    //         '(u.gauge_id) u.gauge_id, u.val, u.reading_datetime',
    //         'u.gauge_id, u.reading_datetime DESC',
    //         `(
    //             SELECT DISTINCT ON (gauge_id) gauge_id, reading_datetime - INTERVAL '1 hour' AS hour_before
    //             FROM update_logs
    //             WHERE gauge_id = ANY($1)
    //             AND has_data = TRUE
    //             ORDER BY gauge_id, reading_datetime DESC
    //         ) curr ON u.gauge_id = curr.gauge_id`
    //     )
    // ]);

    // console.log("current");
    // console.log(current);
    // console.log("hour ago");
    // console.log(hourAgo);
    return;
}

/**
// fetchRowsForReport
//   grabs data from the gauge_readings and update_logs tables by date
//   @param {String} table - 'gauge_readings' or 'update_logs'
//   @param {String[]} locations - ['USGS-']
//   @param {Object} - {days = %d, date = dtz, startDate = dtz, endDate = dtz}
//   @returns {Object} - 
// */
async function fetchRowsForReport(table, locations, { days = null, date = null, startDate = null, endDate = null } = {}) {
    let fetchColumn = table == 'gauge_readings' ? 'created_at' : 'fetch_datetime';
    let whereClause;

    if (startDate && endDate) {
        // range between two dates
        whereClause = `
            (reading_datetime >= '${startDate}' AND reading_datetime < '${endDate}'
            OR ${fetchColumn} >= '${startDate}' AND ${fetchColumn} < '${endDate}')
        `;
    } 
    else if (date) {
        // specific date
        whereClause = `
            (reading_datetime >= '${date}' AND reading_datetime < ('${date}'::date + INTERVAL '1 day')
            OR ${fetchColumn} >= '${date}' AND ${fetchColumn} < ('${date}'::date + INTERVAL '1 day'))
        `;
    } 
    else if (days) {
        // days ago
        whereClause = `
            (reading_datetime >= CURRENT_DATE - INTERVAL '${days} days' AND reading_datetime < CURRENT_DATE
            OR ${fetchColumn} >= CURRENT_DATE - INTERVAL '${days} days' AND ${fetchColumn} < CURRENT_DATE)
        `;
    }

    whereClause += ` AND gauge_id = ANY($1)`;
    const rows = await getFromTable(table, [locations], whereClause, null, 'gauge_id, reading_datetime ASC');
    return rows.reduce((acc, row) => {
        if (!acc[row.gauge_id]) acc[row.gauge_id] = [];
        acc[row.gauge_id].push(row);
        return acc;
    }, {});
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
    await bulkInsertToTable('update_logs', ['gauge_id', 'reading_datetime', 'val', 'has_data'], updates);
    printTimerEnd(timerId, `[->] Update_Logs: ${updates.length} rows`, 1, DEBUG);
}

async function addGaugeReadings(updates) {
    const timerId = printTimerStart();
    await bulkInsertToTable('gauge_readings', ['gauge_id', 'reading_datetime', 'val'], updates)
    printTimerEnd(timerId, `[->] Gauge_Readings: ${updates.length} rows`, 1, DEBUG);
}

module.exports = {
    getActiveLocationsDB,
    getCurrentOverview,
    getTableOverviewDB,
    fetchRowsForReport,
    addToUpdateLogs,
    addGaugeReadings
};