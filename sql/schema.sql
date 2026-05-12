-- 1. Locations Table
CREATE TABLE gauge_locations (
    gauge_id VARCHAR(50) PRIMARY KEY,
    gauge_type VARCHAR(10) NOT NULL, -- 'USGS' or 'UHSLC'
    full_name VARCHAR(255),
    short_name VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    area VARCHAR(50),
    site_type_code VARCHAR(10),
    site_type VARCHAR(50),
    thresholds JSON, -- Stores the object: {"base": 1.2, ...}
    dlnr_link TEXT,
    display_order SERIAL UNIQUE, -- Unique number that persists
    nws_notes TEXT,
    eoc_procedure TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- 2. Actual Data Table (High Volume)
CREATE TABLE gauge_readings (
    id SERIAL PRIMARY KEY,
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    reading_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    val DECIMAL(10, 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update Reports Table
CREATE TABLE update_logs (
    id SERIAL PRIMARY KEY,
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    fetch_datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reading_datetime TIMESTAMP WITH TIME ZONE,
    val DECIMAL(10, 3)
);

-- 4. Daily Reports Table
CREATE TABLE daily_summaries (
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    report_date DATE NOT NULL,
    min_val DECIMAL(10, 3),
    max_val DECIMAL(10, 3),
    avg_val DECIMAL(10, 3),
    min_wait DECIMAL(10, 3),
    max_wait DECIMAL(10, 3),
    avg_wait DECIMAL(10, 3),
    report_count INT,
    PRIMARY KEY (gauge_id, report_date)
);

-- 5. Monthly Reports Table
CREATE TABLE monthly_summaries (
    gauge_id VARCHAR(50) REFERENCES gauge_locations(gauge_id),
    report_month INT CHECK (report_month BETWEEN 1 AND 12),
    report_year INT,
    min_val DECIMAL(10, 3),
    max_val DECIMAL(10, 3),
    avg_val DECIMAL(10, 3),
    min_wait DECIMAL(10, 3),
    max_wait DECIMAL(10, 3),
    avg_wait DECIMAL(10, 3),
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