const cron = require("node-cron");

async function updateLocations() {
  console.log("Updating locations...");

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