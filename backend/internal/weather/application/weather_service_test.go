package application

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/beaconmesh/backend/internal/shared/event"
	"github.com/beaconmesh/backend/internal/weather/domain"
)

type mockProvider struct {
	report *domain.WeatherReport
	err    error
}

func (m *mockProvider) FetchWeatherReport(ctx context.Context, lat, lon float64) (*domain.WeatherReport, error) {
	return m.report, m.err
}

func TestGenerateAdvisory(t *testing.T) {
	eb := event.NewEventBus()
	svc := NewWeatherService(&mockProvider{}, eb)

	tests := []struct {
		name          string
		weather       domain.WeatherData
		marine        domain.MarineData
		expectedSev   string
		expectedDelay string
		containsText  string
	}{
		{
			name: "Safe Conditions",
			weather: domain.WeatherData{
				WindSpeed:  15.0,
				Visibility: 5000.0,
			},
			marine: domain.MarineData{
				WaveHeight: 1.2,
			},
			expectedSev:  "safe",
			containsText: "Conditions are safe for operations",
		},
		{
			name: "Warning - High Waves Only",
			weather: domain.WeatherData{
				WindSpeed:  15.0,
				Visibility: 5000.0,
			},
			marine: domain.MarineData{
				WaveHeight: 3.0,
			},
			expectedSev:  "warning",
			containsText: "High Waves. Small fishing vessels should exercise caution. Expected rescue delays: +12 minutes",
		},
		{
			name: "Warning - Strong Winds Only",
			weather: domain.WeatherData{
				WindSpeed:  40.0,
				Visibility: 5000.0,
			},
			marine: domain.MarineData{
				WaveHeight: 1.2,
			},
			expectedSev:  "warning",
			containsText: "Strong Winds. Small fishing vessels should exercise caution. Expected rescue delays: +8 minutes",
		},
		{
			name: "Warning - Low Visibility Only",
			weather: domain.WeatherData{
				WindSpeed:  15.0,
				Visibility: 800.0,
			},
			marine: domain.MarineData{
				WaveHeight: 1.2,
			},
			expectedSev:  "warning",
			containsText: "Low Visibility. Small fishing vessels should exercise caution. Expected rescue delays: +10 minutes",
		},
		{
			name: "Warning - Combined Waves and Winds",
			weather: domain.WeatherData{
				WindSpeed:  38.0,
				Visibility: 5000.0,
			},
			marine: domain.MarineData{
				WaveHeight: 2.8,
			},
			expectedSev:  "warning",
			containsText: "Expected rescue delays: +20 minutes",
		},
		{
			name: "Danger - Extreme Waves",
			weather: domain.WeatherData{
				WindSpeed:  15.0,
				Visibility: 5000.0,
			},
			marine: domain.MarineData{
				WaveHeight: 4.5,
			},
			expectedSev:  "danger",
			containsText: "Small fishing vessels should remain in harbor",
		},
		{
			name: "Danger - Extreme Winds",
			weather: domain.WeatherData{
				WindSpeed:  55.0,
				Visibility: 5000.0,
			},
			marine: domain.MarineData{
				WaveHeight: 1.2,
			},
			expectedSev:  "danger",
			containsText: "Small fishing vessels should remain in harbor",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adv := svc.GenerateAdvisory(tt.weather, tt.marine)
			if adv.Severity != tt.expectedSev {
				t.Errorf("expected severity %s, got %s", tt.expectedSev, adv.Severity)
			}
			if !strings.Contains(adv.Message, tt.containsText) {
				t.Errorf("expected message to contain %q, got %q", tt.containsText, adv.Message)
			}
		})
	}
}

func TestGetWeatherReport_Success(t *testing.T) {
	eb := event.NewEventBus()
	report := &domain.WeatherReport{
		Location: "Mangalore",
		Weather: domain.WeatherData{
			Temperature: 28.0,
			WindSpeed:   10.0,
			WeatherCode: 0,
			Visibility:  10000.0,
		},
		Marine: domain.MarineData{
			WaveHeight: 0.8,
		},
	}
	provider := &mockProvider{report: report}
	svc := NewWeatherService(provider, eb)

	res, err := svc.GetWeatherReport(context.Background(), 12.91, 74.85)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if res.Location != "Mangalore" {
		t.Errorf("expected location Mangalore, got %s", res.Location)
	}
	if res.Advisory.Severity != "safe" {
		t.Errorf("expected safety severity safe, got %s", res.Advisory.Severity)
	}
}

func TestGetWeatherReport_Error(t *testing.T) {
	eb := event.NewEventBus()
	expectedErr := errors.New("network timeout")
	provider := &mockProvider{err: expectedErr}
	svc := NewWeatherService(provider, eb)

	_, err := svc.GetWeatherReport(context.Background(), 12.91, 74.85)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, expectedErr) {
		t.Errorf("expected error %v, got %v", expectedErr, err)
	}
}
