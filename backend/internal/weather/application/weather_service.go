package application

import (
	"context"
	"fmt"
	"strings"

	"github.com/beaconmesh/backend/internal/shared/event"
	"github.com/beaconmesh/backend/internal/weather/domain"
)

type WeatherService struct {
	provider domain.WeatherProvider
	eventBus *event.EventBus
}

func NewWeatherService(provider domain.WeatherProvider, eventBus *event.EventBus) *WeatherService {
	return &WeatherService{
		provider: provider,
		eventBus: eventBus,
	}
}

// GetWeatherReport retrieves the weather report (cached or fresh) and enriches it with advisories
func (s *WeatherService) GetWeatherReport(ctx context.Context, lat, lon float64) (*domain.WeatherReport, error) {
	report, err := s.provider.FetchWeatherReport(ctx, lat, lon)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch weather report: %w", err)
	}

	// Ensure report advisory is generated
	report.Advisory = s.GenerateAdvisory(report.Weather, report.Marine)
	return report, nil
}

// GenerateAdvisory builds marine warnings and delay estimates based on conditions
func (s *WeatherService) GenerateAdvisory(w domain.WeatherData, m domain.MarineData) domain.MarineAdvisory {
	var warnings []string
	delayMinutes := 0
	severity := "info"

	if m.WaveHeight > 2.5 {
		warnings = append(warnings, "High Waves")
		delayMinutes += 12
		severity = "warning"
	}
	if w.WindSpeed > 35.0 {
		warnings = append(warnings, "Strong Winds")
		delayMinutes += 8
		severity = "warning"
	}
	if w.Visibility < 1000.0 {
		warnings = append(warnings, "Low Visibility")
		delayMinutes += 10
		severity = "warning"
	}

	// Critical conditions upgrade alert to danger
	if m.WaveHeight > 4.0 || w.WindSpeed > 50.0 {
		severity = "danger"
	}

	if len(warnings) == 0 {
		return domain.MarineAdvisory{
			Severity: "safe",
			Message:  "Conditions are safe for operations.",
		}
	}

	var sb strings.Builder
	sb.WriteString("⚠ Marine Advisory: ")
	sb.WriteString(strings.Join(warnings, " and "))
	sb.WriteString(". ")

	if severity == "danger" {
		sb.WriteString("Small fishing vessels should remain in harbor. ")
	} else {
		sb.WriteString("Small fishing vessels should exercise caution. ")
	}

	if delayMinutes > 0 {
		sb.WriteString(fmt.Sprintf("Expected rescue delays: +%d minutes.", delayMinutes))
	}

	return domain.MarineAdvisory{
		Severity: severity,
		Message:  sb.String(),
	}
}
