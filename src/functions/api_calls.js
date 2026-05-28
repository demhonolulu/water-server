const { usgsAPIKey, usgsBaseUrl, usgsTableUrl, usgsGraphUrl, uhslcUrl } = require("../config/env");
const { uhslcOverviewBody, uhslcDataBody } = require("./uhslc.js");
const { timeDifferenceInHours, getUHSLCTimeNow, getUHSLCDate, getUHSLCDataDates } = require("./time.js");
const { printToLog, printTimerStart, printTimerEnd } = require("./logs.js");

const MAX_RESPONSE_ENTRIES = 50000;
const MAX_PULL_HOURS = 24 * 30;

/**
// fetchData
//   fetch wrapper that handles calling and errors
//   @param {String} method - 'POST', 'GET', etc
//   @param {String} url - api url
//   @param {String} type - 'USGS' or 'UHSLC'
//   @param {String} body - json body
// */
async function fetchData(method, url, type, body = null) {
    let data;
    try {
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        };
        if (type === "USGS") {
            headers["Authorization"] = `${usgsAPIKey}`;
        }

        const options = {
            method,
            headers,
        };

        if (body !== null) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
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

/**
// getUSGSLocationInfo
//   calls to usgs for updated location data
//   @param {string} locations - "gauge_id,USGS-16208000" string, comma seperated list of ids
// */
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
// getUSGSGOverview
//   calls to usgs for latest entry of each active gauge for gauge overview
//   @param {string} locations - "gauge_id,USGS-16208000" string, comma seperated list of ids
//   @returns {Object} - {'gauge_id': {'value': %f,'time': datetimez}} fetch format
// */
async function getUSGSGOverview(locations) {
    const url = usgsTableUrl + locations
    const count = locations.split(',').length;
    const timerId = printTimerStart(`(->) USGS-Overview: ${count} locations`, 1, false);
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
        printTimerEnd(timerId, `(<-) USGS-Overview`, 1, false);

        return featureMap;
    }

    // clear timer
    printTimerEnd(timerId);
    // TODO throw error
    return;
}

/**
// getAllUSGS
//   gets all data for usgs gauge locations. finds time difference between table entry and new data.
//   groups locations that are within +/- 1 hour into calls. Then checks if calls exceed max entry
//   count for usgs, if so split them into multiple calls. Batch calls usgs for data and runs extract
//   @param {Array[String]} locations - ['gauge_id']
//   @param {Object} newData - {'gauge_id': {'value': %f,'time': datetimez}} fetch format
//   @param {Object} currentData - {'gauge_id': {'id': %d, 'gauge_id': %s, 'fetch_datetime': datetimez, 'reading_datetime': datetimez, 'val': %f}} return from table format
//   @returns {Object} - {'gauge_id': {'response':{}}}
// */
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
    const timerId = printTimerStart(`(->) USGS-Data: ${locations.length} locations in ${calls.length} calls`, 1, false);
    const results = await Promise.all(
        calls.map(({ time, ids }) => {
            const url = `${usgsGraphUrl}${time}H&monitoring_location_id=${ids}`;
            const callTimerId = printTimerStart();

            return fetchData("GET", url, "USGS").then(result => {
                printTimerEnd(callTimerId, `(<-) USGS: ${result?.numberReturned} items`, 2, false);
                return result;
            });
        })
    );
    printTimerEnd(timerId, `(<-) USGS-Data`, 1, false);
    
    return extractFeatures(results);
}

/**
// extractFeatures
//   converts raw usgs data reponse to form that addNewData can process 
//   @param {Object} usgsResults - {'features': {}}
//   @returns {Object} - {'gauge_id': [{'time': datetimez, 'value': %f}]}
// */
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

/**
// getUHSLCOverview
//   calls to uhslc for latest entry of each active gauge for gauge overview
//   @param {string} locations - "gauge_id,OA-0001" string, comma seperated list of ids
//   @returns {Object} - {'gauge_id': {'value': %f,'time': datetimez}} fetch format
// */
async function getUHSLCOverview(locations) {
    const url = uhslcUrl;
    const locs = locations.split(',');
    const timerId = printTimerStart(`(->) UHSLC-Overview: ${locs.length} locations`, 1, false);
    const timeNow = uhslcOverviewBody(getUHSLCTimeNow());
    const output = await fetchData("POST", url, "UHSLC", timeNow);

    if (output?.response?.['station-table']?.data?.length > 0) {
        const dataMap = Object.fromEntries(
            output.response["station-table"].data
                .filter(item => locs.includes(item.id))
                .map(item => [
                    item.id,
                    {
                        value: parseFloat(extractUHSLCData(item["REPORTED LEVEL (ft)"])),
                        time: getUHSLCDate(extractUHSLCData(item["DATA LAST REPORTED (HST)"]))
                    }
                ])
        );
        printTimerEnd(timerId, `(<-) UHSLC-Overview`, 1, false);

        return dataMap;
    }

    // clear timer
    printTimerEnd(timerId);
    // TODO throw error
    return;
}

/**
// extractUHSLCData
//   uhslc returns values wrapped in html, function extracts values
//   @param {string} htmlString - "<i class=\"fa-solid fa-circle no-alert\"></i> 9:40 AM"
//   @returns {string} - "%s"
// */
function extractUHSLCData(htmlString) { 
    return htmlString.replace(/<[^>]*>/g, '').trim(); 
}

/**
// getAllUHSLC
//   gets all data for uhslc gauge locations. finds time difference between table entry and new data.
//   calls uhslc api with that date for new data for gauge graphs. runs process data on results
//   graphs. calls process data on finish
//   @param {Array[String]} locations - ['gauge_id']
//   @param {Object} newData - {'gauge_id': {'value': %f,'time': datetimez}} fetch format
//   @param {Object} currentData - {'gauge_id': {'id': %d, 'gauge_id': %s, 'fetch_datetime': datetimez, 'reading_datetime': datetimez, 'val': %f}} return from table format
//   @returns {Object} - {'gauge_id': {'response':{}}}
// */
async function getAllUHSLC(locations, newOverview, currOverview) {
    // calculate start and end time for each call
    const calls = [];
    locations.forEach((location) => {
        const time = timeDifferenceInHours(
            currOverview?.[location]?.reading_datetime,
            newOverview?.[location]?.time,
            MAX_PULL_HOURS
        ); 
        const args = getUHSLCDataDates(time);
        calls.push({
            start: args.startDate,
            end: args.endDate,
            id: location
        });
    });

    // makes call for each item
    const timerId = printTimerStart(`(->) UHSLC-Data: ${locations.length} locations`, 1, false);
    const resultsArray = await Promise.all(
        calls.map(({ start, end, id }) => {
            const url = uhslcUrl;
            const callTimerId = printTimerStart();

            return fetchData("POST", url, "UHSLC", uhslcDataBody(start, end, id)).then(result => {
                printTimerEnd(callTimerId, `(<-) UHSLC: items`, 2, false);
                return { id, result };
            });
        })
    );
    const results = Object.fromEntries(resultsArray.map(({ id, result }) => [id, result]));

    printTimerEnd(timerId, `(<-) UHSLC-Data`, 1, false);

    return processUHSLCData(results);
}

/**
// getAllUHSLC
//   converts raw uhslc data reponse to form that addNewData can process 
//   @param {Object} results - {'gauge_id': {'response':{}}}
//   @returns {Object} - {'gauge_id': [{'time': datetimez, 'value': %f}]}
// */
function processUHSLCData(results) {
    if (!results) return;

    const output = {};
    Object.entries(results).forEach(([id, result]) => {
        if (!result?.response?.['fig-water-level']?.figure?.data?.length) return;
        const data = result.response['fig-water-level'].figure.data.find(d => d.name == "Water level");
        
        const dataArray = [];
        for (let i = data.x.length - 1; i >= 0; i--) {
            if (data.x[i] && data.y[i]) {
                dataArray.push({
                    time: data.x[i],
                    value: data.y[i]
                });
            }
        }
        output[id] = dataArray;
    });

    return output;
}


module.exports = {
    getUSGSLocationInfo,
    getUSGSGOverview,
    getAllUSGS,
    getUHSLCOverview,
    getAllUHSLC
};