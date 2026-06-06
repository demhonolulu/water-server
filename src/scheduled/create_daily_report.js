const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");
const { getActiveLocations } = require("../api/get_active_locations.js");
const { fetchRowsForReport, addSummaryReport } = require("../database/queries.js");
const { DEBUG } = require("../config/env");

const cron = require("node-cron");

// runs every day at 1:01 AM
cron.schedule("1 1 * * *", async () => {
    const ACTIVE_LOCATIONS = await getActiveLocations();
    const date = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const data = await createDailyReport(`${ACTIVE_LOCATIONS['USGS']},${ACTIVE_LOCATIONS['UHSLC']}`, { date });
});

async function createDailyReport(locations, date = null) {
    if (!locations) return;
    const reports = [];
    const locationsArray = locations.split(',');
    const timerId = printTimerStart(`Starting createDailyReport on ${locationsArray?.length} locations`, 0, DEBUG)
    const logRows = await fetchRowsForReport('update_logs', locationsArray, date);
    const readingRows = await fetchRowsForReport('gauge_readings', locationsArray, date);

    printToLog(`${'Location'.padEnd(22)}| ${printNum('Count')} | ${printNum('Min')} | ${printNum('Max')} | ${printNum('Avg')} | ${printNum('TMin')} | ${printNum('TMax')} | ${printNum('TAvg')}`, 1, DEBUG);
    locationsArray.forEach((location) => {
        const waitReport = calculateReportValues(logRows[location], 'diff', 0, 'has_data');
        const valReport = calculateReportValues(readingRows[location], 'val', 2);

        reports.push({
            gauge_id: location,
            report_count: waitReport.count,
            min_val: valReport.min,
            min_date: valReport.min_date,
            max_val: valReport.max,
            max_date: valReport.max_date,
            avg_val: valReport.avg,
            min_wait: waitReport.min,
            min_wait_date: waitReport.min_date,
            max_wait: waitReport.max,
            max_wait_date: waitReport.max_date,
            avg_wait: waitReport.avg,
            report_date: date.date,
        });
        printToLog(`${location.padEnd(22)}| ${printNum(waitReport.count)} | ${printNum(valReport.min)} | ${printNum(valReport.max)} | ${printNum(valReport.avg)} | ${printNum(waitReport.min)} | ${printNum(waitReport.max)} | ${printNum(waitReport.avg)}`, 1, DEBUG);
    });
    await addSummaryReport('daily_summaries', reports);

    printTimerEnd(timerId, `Finish createDailyReport`, 0, DEBUG);
    return;
}

function printNum(num, padding = 6) {
    return String(num).padEnd(padding);
}

function calculateReportValues(table, value, round, filterReading = null) {
    if (!table?.length) return { min: null, min_date: null, max: null, max_date: null, avg: null, count: 0 };

    const roundTo = (value, decimals) => {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    };

    let min = null;
    let min_date = null;
    let max = null;
    let max_date = null;
    let sum = 0;
    let count = 0;

    table.forEach((reading) => {
        if (!filterReading || (reading[filterReading] && reading[value])) {
            const val = roundTo(parseFloat(reading[value]), round);
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

    const avg = count > 0 ? roundTo(sum / count, round) : null;

    return { min, min_date, max, max_date, avg, count };
}

module.exports = {
    createDailyReport
};