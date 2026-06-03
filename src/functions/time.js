// ── TIME ──────────────────────────────────────────────────
// functions that deal with time
// ──────────────────────────────────────────────────────────

const cron = require("node-cron");

const timers = {};

cron.schedule('0 * * * *', () => {
    const oneHourAgo = performance.now() - (60 * 60 * 1000);
    Object.entries(timers).forEach(([id, start]) => {
        if (start < oneHourAgo) {
            delete timers[id];
        }
    });
});

function startTimer() {
    const id = crypto.randomUUID();
    const start = performance.now();
    timers[id] = start;
    return id;
}

function endTimer(id) {
    if (!timers[id]) return null;
    const elapsed = performance.now() - timers[id];
    delete timers[id];
    return elapsed;
}

function getHawaiiTimeNow() {
    return new Date().toLocaleString("en-US", {
        timeZone: "Pacific/Honolulu",
        hour12: true,
    });
}

function getUHSLCTimeNow() {
    return new Date().toLocaleString('en-US', {
        timeZone: 'Pacific/Honolulu',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).replace(',', '').replace('at ', '') + ' HST';
}

/**
// getUHSLCDate
//   takes in a time recieved from uhslc and converts it into datetime;
//   new format with date and old format without
//   @param {String} timeString - '%s' 9:45 PM
//   @returns {Date}
// */
function getUHSLCDate(timeString) {
    // new format: "2026-06-01 11:04 AM"
    const fullMatch = timeString.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*(HST)?$/i);
    if (fullMatch) {
        const [, date, hour, minute, meridiem] = fullMatch;
        let hours = parseInt(hour);
        const minutes = parseInt(minute);

        if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
        if (meridiem.toUpperCase() === 'PM' && hours !== 12) hours += 12;

        const utcMs = Date.UTC(
            ...date.split('-').map(Number).map((v, i) => i === 1 ? v - 1 : v),
            hours + 10,
            minutes
        );
        return new Date(utcMs);
    }

    // old format: "9:45 PM"
    const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) throw new Error(`Invalid time format: ${timeString}`);

    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const meridiem = timeMatch[3].toUpperCase();

    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;

    const now = new Date();
    const hawaiiNow = new Date(now.getTime() - 10 * 60 * 60 * 1000);

    let year  = hawaiiNow.getUTCFullYear();
    let month = hawaiiNow.getUTCMonth();
    let day   = hawaiiNow.getUTCDate();

    let utcMs = Date.UTC(year, month, day, hours + 10, minutes);

    if (utcMs > now.getTime()) {
        utcMs -= 24 * 60 * 60 * 1000;
    }

    return new Date(utcMs);
}

/**
// getAllUHSLC
//   takes in a time in hours and returns the time now and before for uhslc data post body
//   @param {Int} time - %d time in hours
//   @returns {Object} - {'startDate': datetimez, 'endDate': datetimez}
// */
function getUHSLCDataDates(time) {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Honolulu" }));
    const end = now.toISOString().split('T')[0];

    const start = new Date(now - time * 60 * 60 * 1000);
    const startDate = start.toISOString().split('T')[0];

    return {
        startDate: startDate,
        endDate: end
    }
}

function timeDifferenceInHours(startDT, endDT, max) {
    if (!endDT) {
        return null
    };

    const end = new Date(endDT);
    const maxDT = new Date(end - (max * 60 * 60 * 1000));
    const start =
        startDT && new Date(startDT) > maxDT
            ? new Date(startDT)
            : maxDT;
    const diff = Math.ceil((end - start) / (1000 * 60 * 60));

    return diff;
}

module.exports = {
    startTimer,
    endTimer,
    getHawaiiTimeNow,
    getUHSLCTimeNow,
    getUHSLCDate,
    getUHSLCDataDates,
    timeDifferenceInHours
};