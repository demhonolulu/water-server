// ── TIME ──────────────────────────────────────────────────
// functions that deal with time
// ──────────────────────────────────────────────────────────

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
    getHawaiiTimeNow,
    timeDifferenceInHours
};