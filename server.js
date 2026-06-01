const express = require('express');
const cron = require("node-cron");

const { updateLocations } = require("./src/scheduled/update_locations");
const { pullGaugeData } = require("./src/scheduled/pull_new_data");

// apis
const { getActiveLocations } = require('./src/api/get_active_locations');
const { getTableOverview } = require('./src/api/get_table_overview');

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

app.listen(PORT, () => {
    console.log("server running");
});

cron.schedule("0 0 1 * *", async () => {
  console.log("Monthly job running");
});