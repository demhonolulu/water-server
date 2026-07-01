const { printToLog, printTimerStart, printTimerEnd, addToOutputLog } = require("../functions/logs.js");
const { getTableOverviewDB } = require("../database/queries.js");
const { getActiveLocations } = require("./get_active_locations.js");

let OVERVIEW = null;
let OVERVIEW_TIME = null;

module.exports = {
    getTableOverview
};

async function getTableOverview() {
    const now = Date.now();
    if (OVERVIEW && OVERVIEW_TIME && (now - OVERVIEW_TIME) < 4.5 * 60 * 1000) {
        return OVERVIEW;
    }

    const ACTIVE_LOCATIONS = await getActiveLocations();
    const readings = await getTableOverviewDB(`${ACTIVE_LOCATIONS['USGS']},${ACTIVE_LOCATIONS['UHSLC']}`);
    //const readings = await getTableOverviewDB(locations);
    const overview = [];

    Object.entries(readings).forEach(([type, gaugeList]) => {
        Object.entries(gaugeList).forEach(([id, data]) => {
            if (!data?.length) {
                overview.push({ type, gauge_id: id, current_val: null, current_date: null, past_val: null, past_date: null });
                return;
            }

            const newest = data[0];
            const oneHourBefore = new Date(new Date(newest.reading_datetime) - 60 * 60 * 1000);
            const past = data.reduce((closest, entry) => {
                const entryTime = new Date(entry.reading_datetime);
                if (entryTime >= oneHourBefore) return closest;
                if (!closest) return entry;
                return Math.abs(entryTime - oneHourBefore) < Math.abs(new Date(closest.reading_datetime) - oneHourBefore) ? entry : closest;
            }, null);

            const gaugeItem = {
                type,
                gauge_id: id,
                current_val: parseFloat(newest.val),
                current_date: newest.reading_datetime,
                past_val: past ? parseFloat(past.val) : null,
                past_date: past ? past.reading_datetime : null
            };

            overview.push(gaugeItem);
        });
    });

    OVERVIEW = overview;
    OVERVIEW_TIME = now;

    return OVERVIEW;
}