const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");
const { getTableOverviewDB } = require("../database/queries.js");
const { sanitizeGaugeIds } = require("./sanitizers.js");

let DATA = null;
let DATA_TIME = null;

module.exports = {
    getGraphData
};

async function getGraphData(gauge_id) {
    //sanitizeGaugeIds
    
    if (!gauge_id) {
        const err = new Error('gauge_id is required');
        err.status = 400;
        throw err;
    }

    const now = Date.now();
    if (DATA && DATA_TIME && (now - DATA_TIME) < 4.5 * 60 * 1000) {
        return DATA;
    }
}