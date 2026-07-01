const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");
const { getGraphDataDB } = require("../database/queries.js");
const { sanitizeGaugeIds } = require("./sanitizers.js");

const cron = require("node-cron");

const DATA = {};
const DATA_TIME = {};
const CACHE_TTL = 4.5 * 60 * 1000;

module.exports = {
    getGraphData
};

async function getGraphData(gauge_id) {
    const sanitizedIds = await sanitizeGaugeIds(gauge_id, true);
    console.log('ids : ' + sanitizedIds);
    const output = {};
    const missing = [];
    const now = Date.now();

    // check cache for every gauge return data if exist
    sanitizedIds.forEach((gauge) => {
        if (DATA?.[gauge] && DATA_TIME?.[gauge]) {
            output[gauge] = DATA[gauge];
        }
        else {
            missing.push(gauge);
        }
    });

    // fetch new data
    console.log("missing: " + missing)
    if (missing) {
        const newData = await getGraphDataDB(missing);
        console.log("new data");
        Object.entries(newData).forEach(([gauge_id, data]) => {
            DATA[gauge_id] = data;
            DATA_TIME[gauge_id] = now;
            output[gauge_id] = data;
        });
    }

    return output;
}

function cleanCache() {
    const now = Date.now();
    Object.keys(DATA).forEach((gauge_id) => {
        if (now - DATA_TIME[gauge_id] > CACHE_TTL) {
            delete DATA[gauge_id];
            delete DATA_TIME[gauge_id];
        }
    });
}

cron.schedule('*/5 * * * *', cleanCache);