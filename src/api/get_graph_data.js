const { getActiveLocationsDB } = require("../database/queries.js");

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

async function getGraphData() {

}

module.exports = {
    getGraphData
};