// const { getLocationData } = require("./get_location_data.js");

const { getLocationDataDB } = require("../database/queries.js");

module.exports = {
    getLocationData
};

async function getLocationData(locations) {
    // const today = new Date().toDateString();
    // if (ACTIVE_LOCATIONS && ACTIVE_LOCATIONS_DATE == today) {
    //     return flat ? ACTIVE_LOCATIONS_FLAT : ACTIVE_LOCATIONS;
    // }

    const locationsData = await getLocationDataDB(locations);
    return locationsData;
    // ACTIVE_LOCATIONS = {};
    // ACTIVE_LOCATIONS_FLAT = {};

    // for (const [gaugeType, locationsArray] of Object.entries(activeLocations)) {
    //     ACTIVE_LOCATIONS[gaugeType] = locationsArray
    //         .map(loc => loc.gauge_id)
    //         .join(',');
        
    //     locationsArray.forEach(loc => {
    //         ACTIVE_LOCATIONS_FLAT[loc.gauge_id] = gaugeType;
    //     });
    // }

    // ACTIVE_LOCATIONS_DATE = today;
    // return flat ? ACTIVE_LOCATIONS_FLAT : ACTIVE_LOCATIONS;
}