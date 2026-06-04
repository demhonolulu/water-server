const { getUSGSGOverview, getUHSLCOverview, getAllUSGS, getAllUHSLC } = require("../functions/api_calls.js");
const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");
const { getCurrentOverview, addToUpdateLogs, addGaugeReadings } = require("../database/queries.js");
const { getActiveLocations } = require("../api/get_active_locations.js");
const { DEBUG } = require("../config/env");

const cron = require("node-cron");
const { bulkInsertToTable } = require("../database/db.js");

//let ACTIVE_LOCATIONS = null; // global object with comma seperated string of active gauges grouped by gauge_type

// every 5 minutes, call pullGaugeData
cron.schedule("*/5 * * * *", async () => {
    await pullGaugeData();
});

/**
// pullGaugeData
//   calls usgs and uhslc for latest entry of each active gauge for gauge table. 
//   if entry is new, call again for full data and store data in gauge_readings and
//   pull results in update_logs
//   @param {string} locations - "gauge_id,USGS-16208000" string, comma seperated list of ids
// */
async function pullGaugeData(locations = null) {    
    try {
        const timerId = printTimerStart(`Starting pullGaugeData`, 0, DEBUG);

        const ACTIVE_LOCATIONS = await getActiveLocations();
        const USGS = { locations: ACTIVE_LOCATIONS['USGS'] };
        const UHSLC = { locations: ACTIVE_LOCATIONS['UHSLC'] };

        // gets most recent data point
        [USGS.overview, UHSLC.overview, currentData] = await Promise.all([
            getUSGSGOverview(USGS.locations),
            getUHSLCOverview(UHSLC.locations),
            getCurrentOverview(`${USGS.locations},${UHSLC.locations}`)
        ]);
        USGS.current = currentData?.USGS;
        UHSLC.current = currentData?.UHSLC;

        // gets list of gauges that have updated
        USGS.updates = createUpdateList(USGS.overview, USGS.current);
        UHSLC.updates = createUpdateList(UHSLC.overview, UHSLC.current);

        // gets all data for updated gauges
        [USGS.data, UHSLC.data] = await Promise.all([
            getAllUSGS(USGS.updates, USGS.overview, USGS.current),
            getAllUHSLC(UHSLC.updates, UHSLC.overview, UHSLC.current),
        ]);

        // add new data to gauge_readings and update_logs tables
        const [usgsLog, uhslcLog] = await Promise.all([
            addNewData(USGS.data, USGS.overview, USGS.current),
            addNewData(UHSLC.data, UHSLC.overview, UHSLC.current),
        ]);

        // print results
        const gaugeCountUSGS = Object.keys(USGS.data ?? {}).length;
        const gaugeCountUHSLC = Object.keys(UHSLC.data ?? {}).length;
        const totalItemsUSGS = Object.values(USGS.data ?? {}).reduce((sum, arr) => sum + arr.length, 0);
        const totalItemsUHSLC = Object.values(UHSLC.data ?? {}).reduce((sum, arr) => sum + arr.length, 0);
        const elapsed = printTimerEnd(timerId, `Finished pullGaugeData`, 0, DEBUG);
        addToOutputLog(`Pulled ${totalItemsUSGS} points from ${gaugeCountUSGS} USGS gauges and ${totalItemsUHSLC} points from ${gaugeCountUHSLC} UHSLC gauges in ${elapsed}ms`);
    }
    catch (error) {
        console.error(error);
    }
    return;
}

/**
// createUpdateList
//   compares existing data with newly retrieved data to find which gauges had an update
//   @param {Object} newData - {'gauge_id': {'value': %f,'time': datetimez}} fetch format
//   @param {Object} currentData - {'gauge_id': {'id': %d, 'gauge_id': %s, 'fetch_datetime': datetimez, 'reading_datetime': datetimez, 'val': %f}} return from table format
//   @returns {Array[Strings]} - ['gauge_id', 'USGS-16208000']
// */
function createUpdateList(newData, currentData) {
    const updateList = [];
    if (!newData) return updateList;
    if (!currentData) return Object.keys(newData);

    Object.entries(newData).forEach(([location, data]) => {
        const curr = currentData[location];
        if (curr) {
            const currTime = new Date(curr.reading_datetime);
            const newTime = new Date(data.time);

            if (newTime > currTime) {
                updateList.push(location);
            }
        }
        else {
            // gauge_id not in logs, add to list
            updateList.push(location);
        }
    });

    return updateList;
}

/**
// addNewData
//   filters data to only add data that doesnt exist in tables. groups them all into
//   a single call to add to tables.
//   @param {Object} newData - {'gauge_id': [{'time': datetimez, 'value': %f}]}
//   @param {Object} overview - {'gauge_id': {'value': %f,'time': datetimez}} fetch format
//   @param {Object} currentData - {'gauge_id': {'id': %d, 'gauge_id': %s, 'fetch_datetime': datetimez, 'reading_datetime': datetimez, 'val': %f}} return from table format
// */
async function addNewData(newData, overview, currentData) {
    if (!newData) return;
    const updateLogs = [];
    const gaugeReadings = [];

    Object.entries(newData).forEach(([location, data]) => {
        if (!data || !data.length) return;

        // add first entry to update logs
        const latestReading = data[0];

        const hasData = !(latestReading.time < overview[location]?.time);
        if (latestReading.time < overview[location]?.time) {
            console.log("dont add");
            updateLogs.push({
                gauge_id: location,
                reading_datetime: latestReading.time,
                val: latestReading.value,
                has_data: false,
                diff: null
            });
            return;
        }
        const diffSeconds = Math.round((Date.now() - new Date(latestReading.time)) / 1000);
        updateLogs.push({
            gauge_id: location,
            reading_datetime: latestReading.time,
            val: latestReading.value,
            has_data: true,
            diff: diffSeconds
        });

        // filter new entries
        const currReading = currentData?.[location]?.time 
            ? new Date(currentData[location].time) 
            : null;

        const newEntries = currReading
            ? data.filter(entry => new Date(entry.time) > currReading)
            : data;

        newEntries.forEach(entry => {
            gaugeReadings.push({
                gauge_id: location,
                reading_datetime: entry.time,
                val: entry.value
            });
        });
    });

    await Promise.all([
        addToUpdateLogs(updateLogs),
        addGaugeReadings(gaugeReadings)
    ]);
}

module.exports = {
    pullGaugeData
};