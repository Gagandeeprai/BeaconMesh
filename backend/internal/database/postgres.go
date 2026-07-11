package database

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

//go:embed migrations.sql
var migrationsSQL string

// DB holds the shared active database connection pool.
var DB *sql.DB

// InitDB initializes PostgreSQL connection pool and runs migrations.
func InitDB(connStr string) (*sql.DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Ping database to confirm connectivity
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connection established. Running migrations...")

	// Execute migrations
	if _, err := db.Exec(migrationsSQL); err != nil {
		return nil, fmt.Errorf("failed to execute migrations: %w", err)
	}

	log.Println("Migrations executed successfully.")
	DB = db
	return db, nil
}

// RecordVesselHistory saves a single vessel coordinate state to vessel_history.
func RecordVesselHistory(db *sql.DB, vesselID, name, vType string, lat, lon, speed float64, riskLevel string) error {
	if db == nil {
		return nil
	}

	query := `
		INSERT INTO vessel_history (vessel_id, name, type, latitude, longitude, speed, risk_level, geom)
		VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($5, $4), 4326))
	`
	_, err := db.Exec(query, vesselID, name, vType, lat, lon, speed, riskLevel)
	return err
}

// RecordAlertHistory saves or updates an active alert state in alerts_history.
func RecordAlertHistory(db *sql.DB, id, vesselID, vesselName, alertType, location, status, severity, description string) error {
	if db == nil {
		return nil
	}

	query := `
		INSERT INTO alerts_history (id, vessel_id, vessel_name, type, location, status, severity, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			status = EXCLUDED.status,
			severity = EXCLUDED.severity,
			description = EXCLUDED.description
	`
	_, err := db.Exec(query, id, vesselID, vesselName, alertType, location, status, severity, description)
	return err
}
