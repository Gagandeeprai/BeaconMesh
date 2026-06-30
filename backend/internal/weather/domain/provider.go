package domain

import "context"

type WeatherProvider interface {
	FetchWeatherReport(ctx context.Context, lat, lon float64) (*WeatherReport, error)
}
