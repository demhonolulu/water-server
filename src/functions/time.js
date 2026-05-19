// ── TIME ──────────────────────────────────────────────────
// functions that deal with time
// ──────────────────────────────────────────────────────────

function getHawaiiTimeNow() {
    return new Date().toLocaleString("en-US", {
        timeZone: "Pacific/Honolulu",
        hour12: true,
    });
}

module.exports = {
    getHawaiiTimeNow
};