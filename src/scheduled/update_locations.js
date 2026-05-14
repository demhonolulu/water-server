const { callUSGS } = require("../functions/api_calls.js");

const cron = require("node-cron");

// update (gauge_locations) table
//   if parameter passed, only update that location
async function updateLocations(locations = null) {
    console.log("Updating locations...");
    callUSGS();
    return;
}

// Run every day at 2am (example)
cron.schedule("0 0 1 * *", async () => {
    console.log("Running location update job");

    // your logic here
    await updateLocations();
});

module.exports = {
    updateLocations
};