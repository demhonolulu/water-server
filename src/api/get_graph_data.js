const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");
const { getTableOverviewDB } = require("../database/queries.js");
const { sanitizeGaugeIds } = require("./sanitizers.js");

let DATA = null;
let DATA_TIME = null;

module.exports = {
    getGraphData
};

async function getGraphData(gauge_id) {
    const sanitizedIds = await sanitizeGaugeIds(gauge_id, true);
    console.log(sanitizedIds);
    return sanitizedIds;

    // const now = Date.now();
    // if (DATA && DATA_TIME && (now - DATA_TIME) < 4.5 * 60 * 1000) {
    //     return DATA;
    // }
}