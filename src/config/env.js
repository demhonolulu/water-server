require("dotenv").config();

// pulls items from .env file and exposes it individually
module.exports = {
    usgsAPIKey: process.env.USGS_API_KEY,
    usgsBaseUrl: process.env.USGS_BASE_URL,
    usgsTableUrl: process.env.USGS_TABLE_URL,
    usgsGraphUrl: process.env.USGS_GRAPH_URL,
    db: {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
    }
};