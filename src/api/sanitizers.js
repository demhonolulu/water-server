module.exports = {
    sanitizeGaugeIds
};

function sanitizeGaugeIds(gauge_id) {
    if (!gauge_id) return throwError('gauge_id is required');

    const ids = gauge_id.split(',');

    // must have at least one id
    if (ids.length === 0) return throwError('must have at least one id');

    // max 50 ids at once
    if (ids.length > 50) return throwError('maximum of 50 ids at once');

    const validPattern = /^[A-Za-z0-9\-]+$/;
    for (const id of ids) {
        const trimmed = id.trim();

        // must match valid gauge id pattern
        if (!validPattern.test(trimmed)) return null;

        // max length per id
        if (trimmed.length > 50) return null;

        // must not be empty
        if (!trimmed) return null;
    }

    return ids.map(id => id.trim()).join(',');
}

function throwError(message, status = 400) {
    const err = new Error(message);
    err.status = status;
    throw err;
}
