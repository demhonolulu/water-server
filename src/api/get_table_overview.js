const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");

const { getTableOverviewDB } = require("../database/queries.js");
const { getActiveLocations } = require("./get_active_locations.js");

// async function getActiveLocations() {
//     const today = new Date().toDateString();
//     if (ACTIVE_LOCATIONS && ACTIVE_LOCATIONS_DATE === today) {
//         return ACTIVE_LOCATIONS;
//     }

//     const activeLocations = await getActiveLocationsDB(['gauge_type']);
//     ACTIVE_LOCATIONS = {};

//     for (const [gaugeType, locationsArray] of Object.entries(activeLocations)) {
//         ACTIVE_LOCATIONS[gaugeType] = locationsArray
//             .map(loc => loc.gauge_id)
//             .join(',');
//     }

//     ACTIVE_LOCATIONS_DATE = today;
//     return ACTIVE_LOCATIONS;
// }

async function getTableOverview() {
    const id = printTimerStart("get table overview endpoint");
    const ACTIVE_LOCATIONS = await getActiveLocations();
    const USGS = { locations: ACTIVE_LOCATIONS['USGS'] };
    const UHSLC = { locations: ACTIVE_LOCATIONS['UHSLC'] };
    getTableOverviewDB(`${USGS.locations},${UHSLC.locations}`);
    printTimerEnd(id, "get table overview end")
}

module.exports = {
    getTableOverview
};