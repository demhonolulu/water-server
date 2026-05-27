const { getUSGSGOverview, getUHSLCOverview, getAllUSGS, getAllUHSLC } = require("../functions/api_calls.js");
const { printToLog, printTimerStart, printTimerEnd } = require("../functions/logs.js");
const { getActiveLocations, getCurrentOverview, addToUpdateLogs, addGaugeReadings } = require("../database/queries.js");

const cron = require("node-cron");
const { bulkInsertToTable } = require("../database/db.js");

// global object with comma seperated string of active gauges grouped by gauge_type
let ACTIVE_LOCATIONS = null;

/**
// pullGaugeData
//   calls usgs for latestest entry of each active gauge for gauge table. if entry is new, call again for full data and store
//   @param {string} locations - string of comma seperated list of ids
//   @returns {Object} -
// */
async function pullGaugeData(locations = null) {    
    try {
        const timerId = printTimerStart(`Starting pullGaugeData`);
    
        // if locs have not been initalized
        if (!ACTIVE_LOCATIONS) {
            const activeLocations = await getActiveLocations(['gauge_type']);
            ACTIVE_LOCATIONS = {};

            // maps into comma seperated list by gauge type
            for (const [gaugeType, locationsArray] of Object.entries(activeLocations)) {
                ACTIVE_LOCATIONS[gaugeType] = locationsArray
                    .map(loc => loc.gauge_id)
                    .join(',');
            }
        }

        // gets most recent data point
        const [usgsDataOverview, uhslcDataOverview, currentData] = await Promise.all([
            getUSGSGOverview(ACTIVE_LOCATIONS['USGS']),
            getUHSLCOverview(ACTIVE_LOCATIONS['UHSLC']),
            getCurrentOverview(`${ACTIVE_LOCATIONS['USGS']},${ACTIVE_LOCATIONS['UHSLC']}`)
        ]);

        // gets list of gauges that have updated
        const usgsUpdates = createUpdateList(usgsDataOverview, currentData?.USGS);
        const uhslcUpdates = createUpdateList(uhslcDataOverview, currentData?.UHSLC);
        console.log(uhslcUpdates);

        // gets all data for updated gauges
        const [usgsData, uhslcData] = await Promise.all([
            getAllUSGS(usgsUpdates, usgsDataOverview, currentData?.USGS),
            getAllUHSLC(uhslcUpdates, uhslcDataOverview, currentData?.UHSLC),
        ]);

        // add new data to gauge_readings and update_logs tables
        const [usgsLog, uhslcLog] = await Promise.all([
            addNewData(usgsData, currentData?.USGS),
            addNewData(null, currentData?.UHSLC),
        ]);

        printTimerEnd(timerId, `Finished pullGaugeData`);
    }
    catch (error) {
        console.error(error);
    }
    return;
}

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

async function addNewData(newData, currentData) {
    if (!newData) return;

    const updateLogs = [];
    const gaugeReadings = [];

    Object.entries(newData).forEach(([location, data]) => {
        if (!data || !data.length) return;

        // add first entry to update logs
        const latestReading = data[0];
        updateLogs.push({
            gauge_id: location,
            reading_datetime: latestReading.time,
            val: latestReading.value
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

// runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
    //console.log("pulling new location data at " + getHawaiiTimeNow());
    await pullGaugeData();
});

module.exports = {
    pullGaugeData
};