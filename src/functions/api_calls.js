const { usgsAPIKey, usgsBaseUrl, usgsTableUrl, usgsGraphUrl } = require("../config/env");
const { timeDifferenceInHours } = require("./time");
const { printToLog, printTimerStart, printTimerEnd } = require("./logs.js");


const MAX_RESPONSE_ENTRIES = 50000;
const MAX_PULL_HOURS = 2 * 1;

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
    const count = locations.split(',').length;
    const timerId = printTimerStart(`Fetching USGS-Overview: ${count} locations`, 1);
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
        printTimerEnd(timerId, `Recieved USGS-Overview`, 1);

        return featureMap;
    }

    // clear timer
    printTimerEnd(timerId);
    // TODO throw error
    return;
}

async function getAllUSGS(locations, newOverview, currOverview) {
    // groups gauges by time
    const mergedCalls = {};
    locations.forEach((location) => {
        const time = timeDifferenceInHours(
            currOverview?.[location]?.reading_datetime,
            newOverview?.[location]?.time,
            MAX_PULL_HOURS
        );

        const existingKey = Object.keys(mergedCalls)
            .sort((a, b) => b - a)
            .find(k => Math.abs(k - time) <= 3);

        if (existingKey) {
            mergedCalls[existingKey].push(location);
        } else {
            mergedCalls[time] = [location];
        }
    });

    const calls = [];
    // creates calls
    Object.entries(mergedCalls).forEach(([timeKey, gaugeList]) => {
        const pagination = [];
        const responsePerEntry = timeKey * 13;

        let currentCall = 0;
        let currentEntries = MAX_RESPONSE_ENTRIES;
        gaugeList.forEach(gaugeId => {
            if ((currentEntries - responsePerEntry) > 0) {
                currentEntries -= responsePerEntry;
            }
            else {
                currentCall++;
                currentEntries = MAX_RESPONSE_ENTRIES - responsePerEntry;
            }

            // add to array
            if (pagination[currentCall]) {
                pagination[currentCall] += `,${gaugeId}`;
            }
            else {
                pagination[currentCall] = gaugeId;
            }
        });
        pagination.forEach((gauges) => {
            calls.push({
                "time": timeKey,
                "ids": gauges
            });
        })
    });

    // makes call for each item
    const timerId = printTimerStart(`Fetching USGS-Data: ${locations.length} locations in ${calls.length} calls`, 1);
    const results = await Promise.all(
        calls.map(({ time, ids }) => {
            const url = `${usgsGraphUrl}${time}H&monitoring_location_id=${ids}`;
            const callTimerId = printTimerStart();

            return fetchData("GET", url, "USGS").then(result => {
                printTimerEnd(callTimerId, `Received ${result?.numberReturned} items`, 2);
                return result;
            });
        })
    );
    printTimerEnd(timerId, `Recieved USGS-Data`, 1);

    return extractFeatures(results);
}

function extractFeatures(usgsResults) {
    const output = {};

    usgsResults.forEach(result => {
        result.features.forEach(feature => {
            const { monitoring_location_id, time, value } = feature.properties;

            if (!output[monitoring_location_id]) output[monitoring_location_id] = [];
            output[monitoring_location_id].push({
                time,
                value: parseFloat(value)
            });
        });
    });

    // sorts newest value first
    Object.keys(output).forEach(id => {
        output[id].sort((a, b) => new Date(b.time) - new Date(a.time));
    });

    return output;
}

// ── UHSLC ─────────────────────────────────────────────────

// pulls most recent data for graph every 5m
async function getUHSLCOverview(locations) {

    return;
}

async function getAllUHSLC(locations, newOverview, currOverview) {
    locations.forEach((location) => {
        
    })
}


module.exports = {
    getUSGSLocationInfo,
    getUSGSGOverview,
    getAllUSGS,
    getUHSLCOverview,
    getAllUHSLC
};