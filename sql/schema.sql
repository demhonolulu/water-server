-- Locations Table
--   mostly static reference data for gauges, updated every month
CREATE TABLE gauge_locations (
    gauge_id VARCHAR(50) PRIMARY KEY, -- 'USGS-213308158035601'
    gauge_type VARCHAR(10) NOT NULL, -- 'USGS' || 'UHSLC'
    full_name VARCHAR(255),
    short_name VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    area VARCHAR(50), -- 'NORTH SHORE'
    site_type_code VARCHAR(10), -- 'ST'
    site_type VARCHAR(50), -- 'Stream'
    thresholds JSON, -- {"base": 1.2, ...}
    dlnr_link TEXT,
    display_order SERIAL UNIQUE,
    nws_notes TEXT,
    eoc_procedure TEXT,
    active BOOLEAN DEFAULT TRUE,
    last_update TIMESTAMP WITH TIME ZONE
);

-- Gauge Readings Table
--   actual gauge data, new data added every 5 mins, but updated depends on gauge transmission frequency
--   for gauge graph, pull single gauge_id - most recent week
--   data kept for 1 month
CREATE TABLE gauge_readings (
    id SERIAL PRIMARY KEY,
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    reading_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    val DECIMAL(6, 2), -- up to '9999.99'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Logs Table
--   list of all times recieved new data, every ~10-60mins
--   for gauge table, pull all gauge_ids - most recent entry + 1h previous
--   data kept for 1 month
CREATE TABLE update_logs (
    id SERIAL PRIMARY KEY,
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    fetch_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reading_datetime TIMESTAMP WITH TIME ZONE,
    val DECIMAL(6, 2),
    has_data BOOLEAN NOT NULL,
    diff BIGINT
);

-- Daily Summaries Table
--   daily report
--   for detailed view of individual gauge
--   data kept for 1 year
CREATE TABLE daily_summaries (
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    report_date DATE NOT NULL,
    min_val DECIMAL(6, 2),
    max_val DECIMAL(6, 2),
    avg_val DECIMAL(6, 2),
    min_wait DECIMAL(6, 2),
    max_wait DECIMAL(6, 2),
    avg_wait DECIMAL(6, 2),
    report_count INT,
    PRIMARY KEY (gauge_id, report_date)
);

-- Monthly Summaries Table
--   monthly report
--   for detailed view of individual gauge
--   data kept indefinetly
CREATE TABLE monthly_summaries (
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    report_month INT CHECK (report_month BETWEEN 1 AND 12),
    report_year INT,
    min_val DECIMAL(6, 2),
    max_val DECIMAL(6, 2),
    avg_val DECIMAL(6, 2),
    min_wait DECIMAL(6, 2),
    max_wait DECIMAL(6, 2),
    avg_wait DECIMAL(6, 2),
    report_count INT,
    PRIMARY KEY (gauge_id, report_month, report_year)
);

---
-- INDEXES FOR OPTIMIZED SEARCH
---

-- For location info lookups
CREATE INDEX idx_locations_active ON gauge_locations(active);

-- For pulling last week of data (Requirement 2)
CREATE INDEX idx_readings_gauge_time ON gauge_readings(gauge_id, reading_datetime DESC);

-- For update reports (Requirement 3: Most recent + 1 hour previous)
CREATE INDEX idx_updates_gauge_time ON update_logs(gauge_id, reading_datetime DESC);

-- For daily/monthly report lookups
CREATE INDEX idx_daily_gauge_date ON daily_summaries(gauge_id, report_date DESC);