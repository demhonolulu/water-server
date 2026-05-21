const { usgsAPIKey, usgsBaseUrl, usgsTableUrl } = require("../config/env");

async function fetchData(method, url, type, body = null) {
    let data;
    try {
        const headers = {
            "Content-Type": "application/json",
        };
        if (type === "USGS") {
            headers["Authorization"] = `${usgsAPIKey}`;
        }

        const options = {
            method,
            headers,
        };

        if (body !== null) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        data = await response.json();
    }
    catch (error) {

    }

    return data;
}

// ── USGS ──────────────────────────────────────────────────

// calls to usgs for updated location data
async function getUSGSLocationInfo(locations) {
    const locationsURL = "monitoring-locations/items?f=json&lang=en-US&limit=50000&skipGeometry=false&offset=0&id=";
    const url = usgsBaseUrl + locationsURL + locations;
    const output = await fetchData("GET", url, "USGS");

    if (output?.features?.length > 0) {
        return output.features;
    }

    return null;
}

/**
// getUSGSGaugeData
//   calls usgs for latest entry of each active gauge for gauge table
//   @param {string} locations - string of comma seperated list of ids
//   @returns {Object} - {'gauge-id': {'value': 1, 'time': ''}}
// */
async function getUSGSGOverview(locations) {
    const url = usgsTableUrl + locations
    const output = await fetchData("GET", url, "USGS");

    if (output?.features?.length > 0) {
        const featureMap = Object.fromEntries(
            output.features.map(f => [
                f.properties.monitoring_location_id,
                {
                    value: parseFloat(f.properties.value),
                    time: f.properties.time
                }
            ])
        );

        return featureMap;
    }

    // TODO throw error
    return;
}

async function getAllUSGS(locations, newOverview, currOverview) {

}

// ── UHSLC ─────────────────────────────────────────────────

// pulls most recent data for graph every 5m
async function getUHSLCOverview(locations) {

    return;
}

async function getAllUHSLC(locations, newOverview, currOverview) {

}


module.exports = {
    getUSGSLocationInfo,
    getUSGSGOverview,
    getAllUSGS,
    getUHSLCOverview,
    getAllUHSLC
};