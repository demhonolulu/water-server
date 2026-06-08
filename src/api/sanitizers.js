const { getActiveLocations } = require("./get_active_locations.js");

module.exports = {
    sanitizeGaugeIds
};

async function sanitizeGaugeIds(gauge_id, require = false) {
    if (!gauge_id) return throwError('gauge_id is required');

    // const ids = gauge_id.split(',');
    const ids = [...new Set(gauge_id.split(',').map(id => id.trim()))];

    // must have at least one id
    if (ids.length === 0 && require) return throwError('min 1 gauge_id required');

    // max 50 ids at once
    if (ids.length > 50) return throwError(`exceeded max gauge count - ${ids.length}`);

    const activeLocations = await getActiveLocations(true);
    const validPattern = /^[A-Za-z0-9\-]+$/;
    for (const id of ids) {
        const trimmed = id.trim();

        // must match valid gauge id pattern
        if (!validPattern.test(trimmed)) return throwError(`invalid gauge_id format - ${trimmed}`);

        // max length per id
        if (trimmed.length > 50) return throwError(`exceeded max gauge_id length - ${trimmed}: ${trimmed.length}`);

        // must not be empty
        if (!trimmed) return throwError(`gauge_id cannot be empty - ${trimmed}`);

        // check if active gauge id
        if (!activeLocations[trimmed]) return throwError(`gauge_id inactive or invalid - ${trimmed}`);
    }

    return ids.map(id => id.trim());
}

function throwError(message, status = 400) {
    const err = new Error(message);
    err.status = status;
    throw err;
}
