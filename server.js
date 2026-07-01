const express = require('express');
const cron = require("node-cron");
const path = require('path');
const cors = require('cors');

// scheduled 
const { createDailyReport } = require("./src/scheduled/create_daily_report");
const { updateLocations } = require("./src/scheduled/update_locations");
const { pullGaugeData } = require("./src/scheduled/pull_new_data");

// apis
const { getActiveLocations } = require('./src/api/get_active_locations');
const { getLocationData } = require("./src/api/get_location_data.js");
const { getTableOverview } = require('./src/api/get_table_overview');
const { getGraphData } = require('./src/api/get_graph_data');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const sanitize = (allowedKeys) => (req, res, next) => {
    req.query = sanitizeQueryParams(req.query, allowedKeys);
    next();
};

// update locations
app.get('/update-locations', async (req, res) => {
    console.log("/update-locations called");
    
    try {
        //await updateLocations(); 
        await pullGaugeData(); 
        
        res.status(200).send("Task completed successfully!");
    } catch (error) {
        res.status(500).send("Task failed: " + error.message);
    }
});

app.get('/get-active-locations', sanitize(['flat']), asyncHandler(async (req, res) => {
    const locations = await getActiveLocations(req?.query?.flat);
    res.status(200).json(locations);
}));

app.get('/get-location-data', sanitize(['locations']), asyncHandler(async (req, res) => {
    const locations = await getLocationData(req?.query?.locations);
    res.status(200).json(locations);
}));

app.get('/get-table-overview', sanitize([]), asyncHandler(async (req, res) => {
    const overview = await getTableOverview();
    res.status(200).json(overview);
}));

app.get('/get-graph-data', sanitize(['gauge_id']), asyncHandler(async (req, res) => {
    const data = await getGraphData(req?.query?.gauge_id);
    res.status(200).json(data);
}));

// testing endpoints only should not be exposed
app.get('/create-daily-report', sanitize([]), asyncHandler(async (req, res) => {
    const ACTIVE_LOCATIONS = await getActiveLocations();
    const date = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const data = await createDailyReport(`${ACTIVE_LOCATIONS['USGS']},${ACTIVE_LOCATIONS['UHSLC']}`, { date });
    // const data = await createDailyReport(`USGS-16200000`, { date });
    res.status(200).json(data);
}));


app.listen(PORT, () => {
    console.log("server running");
});

function sanitizeQueryParams(query, allowedKeys = []) {
    const sanitized = {};

    for (const key of allowedKeys) {
        const value = query[key];
        if (value === undefined) continue;
        if (typeof value !== 'string') continue;

        sanitized[key] = value
            .trim()
            .replace(/[<>'"`;]/g, '')
            .replace(/--/g, '')
            .slice(0, 200);
    }

    if (sanitized.limit) sanitized.limit = Math.abs(parseInt(sanitized.limit)) || 100;
    if (sanitized.offset) sanitized.offset = Math.abs(parseInt(sanitized.offset)) || 0;

    return sanitized;
}

app.use((err, req, res, next) => {
    if (!err.status || err.status === 500) console.error(err);
    res.status(err.status || 500).json({ error: err.message });
});