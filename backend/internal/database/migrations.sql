-- SQL Migrations for PostGIS Tables
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS vessel_history (
    id SERIAL PRIMARY KEY,
    vessel_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_vessel_geom ON vessel_history USING gist(geom);
CREATE INDEX IF NOT EXISTS idx_vessel_time ON vessel_history (timestamp DESC);

CREATE TABLE IF NOT EXISTS alerts_history (
    id VARCHAR(100) PRIMARY KEY,
    vessel_id VARCHAR(50) NOT NULL,
    vessel_name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL
);
