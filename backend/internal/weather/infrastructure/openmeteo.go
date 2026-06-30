package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/beaconmesh/backend/internal/weather/domain"
)

type OpenMeteoProvider struct {
	client *http.Client
}

func NewOpenMeteoProvider() *OpenMeteoProvider {
	return &OpenMeteoProvider{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type weatherResponse struct {
	Current struct {
		Temperature2m    float64 `json:"temperature_2m"`
		WindSpeed10m     float64 `json:"wind_speed_10m"`
		WindDirection10m float64 `json:"wind_direction_10m"`
		Precipitation    float64 `json:"precipitation"`
		Visibility       float64 `json:"visibility"`
		WeatherCode      int     `json:"weather_code"`
	} `json:"current"`
}

type marineResponse struct {
	Current struct {
		WaveHeight    float64 `json:"wave_height"`
		WaveDirection float64 `json:"wave_direction"`
		WavePeriod    float64 `json:"wave_period"`
	} `json:"current"`
}

// FetchWeatherReport coordinates concurrent API calls to Open-Meteo to gather details
func (p *OpenMeteoProvider) FetchWeatherReport(ctx context.Context, lat, lon float64) (*domain.WeatherReport, error) {
	var wg sync.WaitGroup
	var wErr, mErr error
	var wResp weatherResponse
	var mResp marineResponse

	wg.Add(2)

	// Fetch General Weather Details
	go func() {
		defer wg.Done()
		url := fmt.Sprintf("https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,visibility,weather_code", lat, lon)
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			wErr = err
			return
		}
		
		resp, err := p.client.Do(req)
		if err != nil {
			wErr = err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			wErr = fmt.Errorf("weather API returned status: %d", resp.StatusCode)
			return
		}

		wErr = json.NewDecoder(resp.Body).Decode(&wResp)
	}()

	// Fetch Marine Wave Details
	go func() {
		defer wg.Done()
		url := fmt.Sprintf("https://marine-api.open-meteo.com/v1/marine?latitude=%.4f&longitude=%.4f&current=wave_height,wave_direction,wave_period&timezone=auto", lat, lon)
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			mErr = err
			return
		}

		resp, err := p.client.Do(req)
		if err != nil {
			mErr = err
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			mErr = fmt.Errorf("marine API returned status: %d", resp.StatusCode)
			return
		}

		mErr = json.NewDecoder(resp.Body).Decode(&mResp)
	}()

	wg.Wait()

	if wErr != nil {
		return nil, fmt.Errorf("failed to fetch weather details: %w", wErr)
	}
	if mErr != nil {
		return nil, fmt.Errorf("failed to fetch marine details: %w", mErr)
	}

	return &domain.WeatherReport{
		Location: "Mangalore",
		Weather: domain.WeatherData{
			Condition:     domain.MapWeatherCode(wResp.Current.WeatherCode),
			Temperature:   wResp.Current.Temperature2m,
			WindSpeed:     wResp.Current.WindSpeed10m,
			WindDirection: domain.DegreesToCompass(wResp.Current.WindDirection10m),
			Visibility:    wResp.Current.Visibility,
			WeatherCode:   wResp.Current.WeatherCode,
		},
		Marine: domain.MarineData{
			WaveHeight:    mResp.Current.WaveHeight,
			WavePeriod:    mResp.Current.WavePeriod,
			WaveDirection: mResp.Current.WaveDirection,
		},
	}, nil
}
