package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/beaconmesh/backend/internal/ais/domain"
)

type aishubRawResponse []json.RawMessage

type aishubVessel struct {
	MMSI      string `json:"MMSI"`
	Time      string `json:"TIME"`
	Latitude  string `json:"LATITUDE"`
	Longitude string `json:"LONGITUDE"`
	COG       string `json:"COG"`
	SOG       string `json:"SOG"`
	Heading   string `json:"HEADING"`
	NavStat   string `json:"NAVSTAT"`
	IMO       string `json:"IMO"`
	Name      string `json:"NAME"`
	Callsign  string `json:"CALLSIGN"`
	Type      string `json:"TYPE"`
	A         string `json:"A"`
	B         string `json:"B"`
	C         string `json:"C"`
	D         string `json:"D"`
	Draught   string `json:"DRAUGHT"`
	Dest      string `json:"DEST"`
	ETA       string `json:"ETA"`
}

type AISHubProvider struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewAISHubProvider(cfg Config) *AISHubProvider {
	return &AISHubProvider{
		apiKey:  cfg.AISHubAPIKey,
		baseURL: cfg.AISHubURL,
		client: &http.Client{
			Timeout: cfg.RequestTimeout,
		},
	}
}

func (p *AISHubProvider) Name() string {
	return "aishub"
}

func (p *AISHubProvider) FetchVessels(ctx context.Context) ([]domain.Vessel, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("aishub: API key is empty")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.baseURL, nil)
	if err != nil {
		return nil, fmt.Errorf("aishub: create request: %w", err)
	}

	q := req.URL.Query()
	q.Set("A", p.apiKey)
	q.Set("B", "1")
	q.Set("C", "json")
	q.Set("D", "0")
	req.URL.RawQuery = q.Encode()

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("aishub: http request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("aishub: read body: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("aishub: invalid API key (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("aishub: rate limited (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("aishub: unexpected status %d: %s", resp.StatusCode, string(body))
	}

	return parseAISHubResponse(body)
}

func parseAISHubResponse(body []byte) ([]domain.Vessel, error) {
	var raw aishubRawResponse
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("aishub: parse response: %w", err)
	}

	if len(raw) < 2 {
		return nil, fmt.Errorf("aishub: unexpected format: got %d elements, want 2", len(raw))
	}

	var errInfo struct {
		Error    string `json:"ERROR"`
		ErrorMsg string `json:"ERROR_MSG"`
	}
	if err := json.Unmarshal(raw[0], &errInfo); err != nil {
		return nil, fmt.Errorf("aishub: parse error field: %w", err)
	}
	if strings.ToLower(errInfo.Error) != "false" {
		msg := errInfo.Error
		if errInfo.ErrorMsg != "" {
			msg += " - " + errInfo.ErrorMsg
		}
		return nil, fmt.Errorf("aishub: API error: %s", msg)
	}

	var rawVessels []aishubVessel
	if err := json.Unmarshal(raw[1], &rawVessels); err != nil {
		return nil, fmt.Errorf("aishub: parse vessels: %w", err)
	}

	vessels := make([]domain.Vessel, 0, len(rawVessels))
	for _, rv := range rawVessels {
		v, err := mapAISHubVessel(rv)
		if err != nil {
			continue
		}
		vessels = append(vessels, v)
	}

	return vessels, nil
}

func mapAISHubVessel(rv aishubVessel) (domain.Vessel, error) {
	lat, err := strconv.ParseFloat(strings.TrimSpace(rv.Latitude), 64)
	if err != nil {
		return domain.Vessel{}, fmt.Errorf("parse latitude %q: %w", rv.Latitude, err)
	}
	lon, err := strconv.ParseFloat(strings.TrimSpace(rv.Longitude), 64)
	if err != nil {
		return domain.Vessel{}, fmt.Errorf("parse longitude %q: %w", rv.Longitude, err)
	}

	speed, _ := strconv.ParseFloat(strings.TrimSpace(rv.SOG), 64)
	heading, _ := strconv.ParseFloat(strings.TrimSpace(rv.Heading), 64)

	people := 0
	if dimA, err := strconv.Atoi(strings.TrimSpace(rv.A)); err == nil {
		if dimB, err := strconv.Atoi(strings.TrimSpace(rv.B)); err == nil {
			people = estimatePeople(dimA, dimB)
		}
	}

	vesselType := mapAISTypeCode(rv.Type)
	dest := strings.TrimSpace(rv.Dest)

	name := strings.TrimSpace(rv.Name)
	if name == "" {
		name = "Unknown"
	}

	return domain.Vessel{
		ID:          "AIS-" + rv.MMSI,
		Name:        name,
		Type:        vesselType,
		Latitude:    lat,
		Longitude:   lon,
		Speed:       speed,
		Heading:     heading,
		People:      people,
		Cargo:       inferCargo(vesselType, dest),
		Destination: dest,
		IsLiveAIS:   true,
		MMSI:        rv.MMSI,
		IMO:         strings.TrimSpace(rv.IMO),
		ETA:         strings.TrimSpace(rv.ETA),
		Source:      "aishub",
	}, nil
}

func mapAISTypeCode(codeStr string) string {
	code, err := strconv.Atoi(strings.TrimSpace(codeStr))
	if err != nil {
		return "Unknown"
	}
	switch {
	case code == 30:
		return "Fishing"
	case code >= 31 && code <= 32:
		return "Tug"
	case code == 35:
		return "Military"
	case code >= 36 && code <= 37:
		return "Other"
	case code >= 40 && code <= 49:
		return "Passenger"
	case code == 52:
		return "Tug"
	case code >= 60 && code <= 69:
		return "Passenger"
	case code >= 70 && code <= 79:
		return "Cargo"
	case code >= 80 && code <= 89:
		return "Tanker"
	case code >= 100 && code <= 109:
		return "Fishing"
	case code >= 110 && code <= 119:
		return "Tug"
	case code >= 150 && code <= 159:
		return "Military"
	default:
		return "Other"
	}
}

func inferCargo(vesselType, destination string) string {
	switch vesselType {
	case "Tanker":
		if destination != "" {
			return "Petrochemicals (en route to " + destination + ")"
		}
		return "Petrochemicals"
	case "Cargo":
		if destination != "" {
			return "Containerized cargo (en route to " + destination + ")"
		}
		return "Containerized cargo"
	case "Passenger":
		return "Passengers & vehicles"
	case "Fishing":
		return "Fishing equipment & catch"
	case "Tug":
		return "Towing & rescue equipment"
	case "Military":
		return "Military operations"
	default:
		return "General cargo"
	}
}

func estimatePeople(length, width int) int {
	if length <= 0 || width <= 0 {
		return 10
	}
	approx := (length * width) / 50
	if approx < 5 {
		return 5
	}
	if approx > 500 {
		return 500
	}
	return approx
}
