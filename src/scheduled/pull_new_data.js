const { getUSGSGaugeData } = require("../functions/api_calls.js");
const { getHawaiiTimeNow } = require("../functions/time.js");
const { pool, addToTable } = require("../database/db.js");
const { getActiveLocations } = require("../database/queries.js");

const cron = require("node-cron");

// update (gauge_readings) table
//   if parameter passed, only update that location, otherwise update all active locations
async function pullGaugeData(locations = null) {
    getActiveLocations('type');
    /*
    try {
        if (locations) {
            return;
        }

        // pulls list of active gauges from db
        const activeLocations = await pool.query(`
            SELECT * FROM gauge_locations
            WHERE active = TRUE
        `);

        if (activeLocations.rows < 1) {
            throw new Error("No active locations");
        }

        const usgsIds = activeLocations.rows
            .filter(row => row.gauge_type === "USGS")
            .map(row => row.gauge_id)
            .join(",");

        const uhsclIds = activeLocations.rows
            .filter(row => row.gauge_type === "UHSLC")
            .map(row => row.gauge_id)
            .join(",");

        const rawUsgsData = await getUSGSGaugeData(usgsIds);
        processUSGSData(rawUsgsData, usgsIds);

    } catch (error) {
        console.error(error);

        return null;
    }*/

    //console.log(`⏰ Updating locations: Started at [${getHawaiiTimeNow()}]`);
    return;
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