const { usgsAPIKey } = require("../config/env");

async function callUSGS() {
    console.log("Updating locations...");
    console.log(usgsAPIKey);
    return;
}

module.exports = {
    callUSGS
};