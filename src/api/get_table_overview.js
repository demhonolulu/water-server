const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");

const { getTableOverviewDB } = require("../database/queries.js");
const { getActiveLocations } = require("./get_active_locations.js");

async function getTableOverview() {
    const id = printTimerStart("get table overview endpoint");
    const ACTIVE_LOCATIONS = await getActiveLocations();
    const USGS = { locations: ACTIVE_LOCATIONS['USGS'] };
    const UHSLC = { locations: ACTIVE_LOCATIONS['UHSLC'] };
    getTableOverviewDB(`${USGS.locations},${UHSLC.locations}`);
    //printTimerEnd(id, "get table overview end")
}

module.exports = {
    getTableOverview
};