const { usgsAPIKey, usgsBaseUrl } = require("../config/env");

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

async function callUSGS() {
    console.log("Updating locations...");
    console.log(usgsAPIKey);
    return;
}

// pulls most recent data for graph every 5m
async function getUSGSGaugeData(locations) {
    const gaugeDataURL = "continuous/items?f=json&lang=en-US&limit=50000&skipGeometry=true&unit_of_measure=ft&time=PT3H&properties=monitoring_location_id,value,time&monitoring_location_id=";
    const url = usgsBaseUrl + gaugeDataURL + locations;
    const output = await fetchData("GET", url, "USGS");

    if (output?.features?.length > 0) {
        return output.features;
    }

    return;
}

// ── UHSLC ─────────────────────────────────────────────────

// pulls most recent data for graph every 5m
async function getUHSLCGaugeData(locations) {

    return;
}


module.exports = {
    getUSGSLocationInfo,
    callUSGS,
    getUSGSGaugeData,
    getUHSLCGaugeData
};