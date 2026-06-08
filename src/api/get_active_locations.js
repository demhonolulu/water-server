// const { getActiveLocations } = require("./get_active_locations.js");

const { getActiveLocationsDB } = require("../database/queries.js");

let ACTIVE_LOCATIONS = null;
let ACTIVE_LOCATIONS_FLAT = null;
let ACTIVE_LOCATIONS_DATE = null;

module.exports = {
    getActiveLocations
};

async function getActiveLocations(flat) {
    const today = new Date().toDateString();
    if (ACTIVE_LOCATIONS && ACTIVE_LOCATIONS_DATE == today) {
        return flat ? ACTIVE_LOCATIONS_FLAT : ACTIVE_LOCATIONS;
    }

    const activeLocations = await getActiveLocationsDB(['gauge_type']);
    ACTIVE_LOCATIONS = {};
    ACTIVE_LOCATIONS_FLAT = {};

    for (const [gaugeType, locationsArray] of Object.entries(activeLocations)) {
        ACTIVE_LOCATIONS[gaugeType] = locationsArray
            .map(loc => loc.gauge_id)
            .join(',');
        
        locationsArray.forEach(loc => {
            ACTIVE_LOCATIONS_FLAT[loc.gauge_id] = gaugeType;
        });
    }

    ACTIVE_LOCATIONS_DATE = today;
    return flat ? ACTIVE_LOCATIONS_FLAT : ACTIVE_LOCATIONS;
}