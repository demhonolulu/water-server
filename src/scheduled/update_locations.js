const { getUSGSLocationInfo } = require("../functions/api_calls.js");
const { getHawaiiTimeNow } = require("../functions/time.js");
const pool= require("../database/db.js");

const cron = require("node-cron");

// update (gauge_locations) table
//   if parameter passed, only update that location, otherwise update all active locations
async function updateLocations(locations = null) {
    
    /*
    try {
        
        const result = await pool.query(`
            SELECT * FROM gauge_locations
        `);
        
        console.log(result.rows);
    } catch (error) {
        console.error(error);

        return null;
    }

    //console.log(`⏰ Updating locations: Started at [${getHawaiiTimeNow()}]`);
    let updateLocations = locations;
    if (!locations) {
         
    }

    const output = await getUSGSLocationInfo("USGS-16254000");
    console.log(output);*/
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