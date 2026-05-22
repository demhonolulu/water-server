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
    timeDifferenceInHours
};