const express = require('express');
const cron = require("node-cron");

// scheduled 
const { createDailyReport } = require("./src/scheduled/create_daily_report");
const { updateLocations } = require("./src/scheduled/update_locations");
const { pullGaugeData } = require("./src/scheduled/pull_new_data");

// apis
const { getActiveLocations } = require('./src/api/get_active_locations');
const { getTableOverview } = require('./src/api/get_table_overview');
const { getGraphData } = require('./src/api/get_graph_data');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h1>Water Server</h1>
                <button id="testBtn">Run Update Locations</button>
                <p id="output"></p>

                <script>
                    document.getElementById('testBtn').addEventListener('click', async () => {
                        const output = document.getElementById('output');
                        
                        // Call the server-side function via fetch
                        const response = await fetch('/update-locations', { method: 'GET' });
                        const result = await response.text();
                        
                        output.innerText = "Server says: " + result;
                    });
                </script>
            </body>
        </html>
    `);
});

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.use((err, req, res, next) => {
    res.status(500).send("Task failed: " + err.message);
});

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

app.get('/get-active-locations', async (req, res) => {
    try {
        const locations = await getActiveLocations();
        res.status(200).json(locations);
    } catch (error) {
        res.status(500).send("Task failed: " + error.message);
    }
});

app.get('/get-table-overview', async (req, res) => {
    try {
        const overview = await getTableOverview();
        res.status(200).json(overview);
    } catch (error) {
        res.status(500).send("Task failed: " + error.message);
    }
});

app.get('/get-graph-data', async (req, res) => {
    try {
        const overview = await getGraphData();
        res.status(200).json(overview);
    } catch (error) {
        res.status(500).send("Task failed: " + error.message);
    }
});

// app.get('/get-table-overview', sanitize(['table', 'limit', 'offset']), async (req, res) => {
//     const { table, limit, offset } = req.query; // only these 3 come through
//     ...
// });

// app.get('/other-route', sanitize(['id', 'filter']), async (req, res) => {
//     const { id, filter } = req.query; // only these 2 come through
//     ...
// });

// // After
// app.get('/get-table-overview', sanitize(['table']), asyncHandler(async (req, res) => {
//     const overview = await getTableOverview(req.query.table);
//     res.status(200).json(overview);
// }));

app.listen(PORT, () => {
    console.log("server running");
});

cron.schedule("0 0 1 * *", async () => {
  console.log("Monthly job running");
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