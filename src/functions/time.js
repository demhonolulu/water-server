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

function getUHSLCDate(timeString) {
    const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) throw new Error(`Invalid time format: ${timeString}`);

    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const meridiem = timeMatch[3].toUpperCase();

    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;

    // Get today's date components in Hawaii time (UTC-10, no DST)
    const now = new Date();
    const hawaiiNow = new Date(now.getTime() - 10 * 60 * 60 * 1000);

    let year  = hawaiiNow.getUTCFullYear();
    let month = hawaiiNow.getUTCMonth();
    let day   = hawaiiNow.getUTCDate();

    // Build the candidate date in UTC
    let utcMs = Date.UTC(year, month, day, hours + 10, minutes);

    // If the result is in the future, the reading must be from yesterday
    if (utcMs > now.getTime()) {
        utcMs -= 24 * 60 * 60 * 1000;
    }

    return new Date(utcMs);
}

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