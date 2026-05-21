const { getUSGSGOverview, getUHSLCOverview } = require("../functions/api_calls.js");
const { getHawaiiTimeNow } = require("../functions/time.js");
const { pool, addToTable } = require("../database/db.js");
const { getActiveLocations, getCurrentOverview } = require("../database/queries.js");

const cron = require("node-cron");

// global object with comma seperated string of active gauges grouped by gauge_type
// { "USGS": "a,b,c", "UHSLC": ""}
let ACTIVE_LOCATIONS = null;

// update (gauge_readings) table
//   if parameter passed, only update that location, otherwise update all active locations

/**
// pullGaugeData
//   calls usgs for latestest entry of each active gauge for gauge table. if entry is new, call again for full data
//   @param {string} locations - string of comma seperated list of ids
//   @returns {Object} -
// */
async function pullGaugeData(locations = null) {    
    try {
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

        // gets all data for updated gauges
        const [usgsData, uhslcData] = await Promise.all([
            getAllUSGS(usgsUpdates, usgsDataOverview, currentData?.USGS),
            getAllUHSLC(uhslcUpdates, uhslcDataOverview, currentData?.UHSLC),
        ]);
    }
    catch (error) {
        console.error(error);
    }

    //console.log(`⏰ Updating locations: Started at [${getHawaiiTimeNow()}]`);
    return;
}


function createUpdateList(newData, currentData) {
    const updateList = [];
    if (!newData || !currentData) {
        return updateList;
    }

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
    })

    return updateList;
}


async function processUSGSData(data, usgsIds) {
    // group gauge data by usgs id
    const dataGrouped = groupDataByID(data);

    // pull last reading from update logs
    const gaugeIds = usgsIds.split(",");
    const result = await pool.query(`
        SELECT DISTINCT ON (gauge_id) *
        FROM update_logs
        WHERE gauge_id = ANY($1)
        ORDER BY gauge_id, reading_datetime DESC
    `, [gaugeIds]);

    // converts to object for easier lookup
    const latestByGaugeId = {};
    result.rows.forEach(row => {
        latestByGaugeId[row.gauge_id] = row;
    });

    const columnNames = ['gauge_id', 'reading_datetime', 'val'];
    Object.entries(dataGrouped).forEach(([gauge_id, values]) => {
        const lastReading = latestByGaugeId[gauge_id];

        values.sort((a, b) => {
            return new Date(b.properties.time) - new Date(a.properties.time);
        });

        // no reading, add first entry to tables
        if (!lastReading) {
            // add to update logs
            addToTable('update_logs', columnNames, [gauge_id, values[0].properties.time, values[0].properties.value]); 

            // add to gauge readings

            return;
        }
        

        /*
        console.log("Gauge ID:", key);
        console.log("Values:", values);*/
    });
}

async function processUHSLCData(data) {

}

function groupDataByID(data) {
    if (!Array.isArray(data)) {
        console.error("groupDataByID expected array:", data);
        return {};
    }

    return data.reduce((acc, item) => {
        const id = item?.properties?.monitoring_location_id;

        if (!id) return acc;

        if (!acc[id]) acc[id] = [];

        acc[id].push(item);

        return acc;
    }, {});
}

// runs every 5 minutes
cron.schedule("*/5 * * * *", async () => {
    console.log("pulling new location data at " + getHawaiiTimeNow());
    await pullGaugeData();
});

module.exports = {
    pullGaugeData
};