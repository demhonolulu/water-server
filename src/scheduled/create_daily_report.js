const { getUSGSLocationInfo } = require("../functions/api_calls.js");
const { getHawaiiTimeNow } = require("../functions/time.js");

const cron = require("node-cron");

// Run every day at 2am (example)
cron.schedule("0 0 1 * *", async () => {
    await createDailyReport();
});

async function createDailyReport(locations = null) {

    return;
}

module.exports = {
    createDailyReport
};