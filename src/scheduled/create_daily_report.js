const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");
const { getActiveLocations } = require("../api/get_active_locations.js");
const { fetchRowsForReport } = require("../database/queries.js");
const { DEBUG } = require("../config/env");

const cron = require("node-cron");

// runs every day at 1:01 AM
cron.schedule("1 1 * * *", async () => {
    const ACTIVE_LOCATIONS = await getActiveLocations();
    await createDailyReport(`${ACTIVE_LOCATIONS['USGS']},${ACTIVE_LOCATIONS['UHSLC']}`);
});

async function createDailyReport(locations, date = null) {
    if (!locations) return;

    const locationsArray = locations.split(',');
    const timerId = printTimerStart(`Starting createDailyReport on ${locationsArray?.length} locations`, 0, DEBUG)
    const logRows = await fetchRowsForReport('update_logs', locationsArray, date);
    const readingRows = await fetchRowsForReport('gauge_readings', locationsArray, date);

    printToLog(`${'Location'.padEnd(22)}| ${printNum('Count')} | ${printNum('Min')} | ${printNum('Max')} | ${printNum('Avg')} | ${printNum('TMin')} | ${printNum('TMax')} | ${printNum('TAvg')}`, 1, DEBUG);
    locationsArray.forEach((location) => {
        const waitReport = countWait(logRows[location]);
        const valReport = countVal(readingRows[location]);

        printToLog(`${location.padEnd(22)}| ${printNum(waitReport.count)} | ${printNum(valReport.min)} | ${printNum(valReport.max)} | ${printNum(valReport.avg)} | ${printNum(waitReport.min)} | ${printNum(waitReport.max)} | ${printNum(waitReport.avg)}`, 1, DEBUG);
    });

    printTimerEnd(timerId, `Finish createDailyReport`, 0, DEBUG);
    return;
}

function printNum(num, padding = 6) {
    return String(num).padEnd(padding);
}

function countWait(updateLogs) {
    if (!updateLogs?.length) return { min: null, max: null, avg: null, count: 0 };

    let min = null;
    let max = null;
    let sum = 0;
    let count = 0;
    let last_report = null;
    updateLogs.forEach((update) => {
        if (!last_report) {
            last_report = update;
            return;
        }

        if (update.has_data) {
            const wait = update.fetch_datetime - last_report.fetch_datetime;
            [min, max, sum, count] = updateCurrentCounts(wait, min, max, sum, count);
            last_report = update;
        }
    });

    min = formatWaitTime(min);
    max = formatWaitTime(max);
    sum = formatWaitTime(sum);
    const avg = count > 0 ? Math.round(sum / count * 100) / 100 : null

    return { min, max, avg, count }
}

function countVal(gaugeReadings) {
    if (!gaugeReadings?.length) return { min: null, max: null, avg: null };

    let min = null;
    let max = null;
    let sum = 0;
    let count = 0;
    gaugeReadings.forEach((reading) => {
        const value = parseFloat(reading.val);
        [min, max, sum, count] = updateCurrentCounts(value, min, max, sum, count);
    });

    const avg = count > 0 ? Math.round(sum / count * 100) / 100 : null;

    return { min, max, avg, count }
}

function updateCurrentCounts(value, min, max, sum, count) {
    if (min === null || value < min) min = value;
    if (max === null || value > max) max = value;
    sum += value;
    count++;

    return [min, max, sum, count];
}

function formatWaitTime(time) {
    if (!time) return null;

    return Math.round(time / (1000 * 60) * 100) / 100;
}

module.exports = {
    createDailyReport
};