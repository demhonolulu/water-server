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
        //const waitReport = countWait(logRows[location]);
        const waitReport = calculateReportValues(logRows[location], 'diff', 'has_data');
        //const valReport = countVal(readingRows[location]);
        const valReport = calculateReportValues(readingRows[location], 'val');

        printToLog(`${location.padEnd(22)}| ${printNum(waitReport.count)} | ${printNum(valReport.min)} | ${printNum(valReport.max)} | ${printNum(valReport.avg)} | ${printNum(waitReport.min)} | ${printNum(waitReport.max)} | ${printNum(waitReport.avg)}`, 1, DEBUG);
    });

    printTimerEnd(timerId, `Finish createDailyReport`, 0, DEBUG);
    return;
}

function printNum(num, padding = 6) {
    return String(num).padEnd(padding);
}

function countWait(updateLogs) {
    return calculateReportValues(updateLogs, 'diff', 'has_data');
    // if (!updateLogs?.length) return { min: null, max: null, avg: null, count: 0 };

    // let min = null;
    // let max = null;
    // let sum = 0;
    // let count = 0;
    // updateLogs.forEach((update) => {
    //     if (update.has_data) {
    //         [min, max, sum, count] = updateCurrentCounts({val: update.diff, reading_datetime}, min, max, sum, count);
    //     }
    // });

    // const avg = count > 0 ? Math.round(sum / count * 100) / 100 : null

    // return { min, max, avg, count }
}

function countVal(gaugeReadings) {
    return calculateReportValues(gaugeReadings, 'val');
    // if (!gaugeReadings?.length) return { min: null, max: null, avg: null };

    // let min = null;
    // let max = null;
    // let sum = 0;
    // let count = 0;
    // gaugeReadings.forEach((reading) => {
    //     [min, max, sum, count] = updateCurrentCounts(reading, min, max, sum, count);
    // });

    // const avg = count > 0 ? Math.round(sum / count * 100) / 100 : null;

    // return { min, max, avg, count }
}

function calculateReportValues(table, value, filterReading = null) {
    if (!table?.length) return { min: null, min_date: null, max: null, max_date: null, avg: null, count: 0 };

    let min = null;
    let min_date = null;
    let max = null;
    let max_date = null;
    let sum = 0;
    let count = 0;

    table.forEach((reading) => {
        if (!filterReading || (reading[filterReading] && reading[value])) {
            const val = parseFloat(reading[value]);
            if (min === null || val < min) {
                min = val;
                min_date = reading.reading_datetime;
            }
            if (max === null || val > max) {
                max = val;
                max_date = reading.reading_datetime;
            }
            sum += val;
            count++;
        }
    });

    const avg = count > 0 ? Math.round(sum / count * 100) / 100 : null;

    return { min, min_date, max, max_date, avg, count };
}

function updateCurrentCounts(item, min, max, sum, count) {
    if (min === null || item.val < min.val) min = item;
    if (max === null || item.val > max.val) max = item;
    sum += item.val;
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