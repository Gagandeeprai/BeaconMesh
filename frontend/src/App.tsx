/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import SummaryCards from "./components/SummaryCards";
import MapOverview from "./components/MapOverview";
import ActiveMissionPanel from "./components/ActiveMissionPanel";
import RecentAlertsPanel from "./components/RecentAlertsPanel";
import WeatherPanel from "./components/WeatherPanel";
import LiveMapConsole from "./components/LiveMapConsole";

import AlertsView from "./components/AlertsView";
import VesselsView from "./components/VesselsView";
import MissionsView from "./components/MissionsView";
import AnalyticsView from "./components/AnalyticsView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import IngestionPanel from "./components/IngestionPanel";
import ReplayView from "./components/ReplayView";
import AdminView from "./components/AdminView";

import { Vessel, Alert, Mission, WeatherCondition, NetworkTrace } from "./types";
import {
  INITIAL_VESSELS,
  INITIAL_ALERTS,
  INITIAL_MISSIONS,
  DEFAULT_WEATHER,
} from "./data";
import { SimulationEngine, eventBus } from "./simulation";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [mode, setMode] = useState<"live" | "hybrid" | "simulation">("hybrid");
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Auto-login for development integration
  useEffect(() => {
    const login = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "beacon2026" })
        });
        if (res.ok) {
          const data = await res.json();
          setAuthToken(data.token);
          
          // Reset simulation on page refresh (Hackathon specific)
          fetch(`${API_BASE}/api/v1/simulation/reset`, { method: "POST" }).catch(() => {});
        }
      } catch (e) {}
    };
    login();
  }, []);

  // State Management (synced from central SimulationEngine)
  const [engine] = useState(
    () =>
      new SimulationEngine(INITIAL_VESSELS, INITIAL_ALERTS, INITIAL_MISSIONS),
  );
  const [vessels, setVessels] = useState<Vessel[]>(engine.vessels);
  const [alerts, setAlerts] = useState<Alert[]>(engine.alerts);
  const [missions, setMissions] = useState<Mission[]>(engine.missions);
  const [liveAISVessels, setLiveAISVessels] = useState<Vessel[]>([]);

  const [networkTraces, setNetworkTraces] = useState<NetworkTrace[]>([]);

  // Selection Tracking
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(
    INITIAL_ALERTS[0],
  );
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(
    INITIAL_VESSELS[0],
  );

  const [weather, setWeather] = useState<WeatherCondition>({
    ...DEFAULT_WEATHER,
    status: "online",
  });

  // Helper to map sea states from wave heights
  const getSeaState = (waveHeight: number): string => {
    if (waveHeight < 0.1) return "Calm (Glassy)";
    if (waveHeight < 0.5) return "Calm (Rippled)";
    if (waveHeight < 1.25) return "Smooth";
    if (waveHeight < 2.5) return "Moderate";
    if (waveHeight < 4.0) return "Rough";
    return "Very Rough";
  };

  // Synchronized Selection Logic
  const handleSelectAlert = (alert: Alert | null) => {
    setSelectedAlert(alert);
    if (alert) {
      const matchVessel =
        engine.vessels.find((v) => v.id === alert.vesselId) || null;
      setSelectedVessel(matchVessel);
    } else {
      setSelectedVessel(null);
    }
  };

  const handleSelectVessel = (vessel: Vessel | null) => {
    setSelectedVessel(vessel);
    if (vessel) {
      const matchAlert =
        engine.alerts.find((a) => a.vesselId === vessel.id) || null;
      setSelectedAlert(matchAlert);
    } else {
      setSelectedAlert(null);
    }
  };

  // Real-time WebSocket connection to Backend
  useEffect(() => {
    const wsUrl = API_BASE.replace(/^http/, "ws") + "/api/v1/ws";
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "telemetry") {
          if (data.vessels) {
            const mappedVessels = data.vessels.map((v: any) => {
              const isSupport = engine.missions.some(m => (m.responder === v.name || m.responder === v.id) && m.status !== "Completed");
              return {
                ...v,
                status: isSupport ? "Support" : (v.riskLevel === "critical" ? "Distress" : (v.id.startsWith("AIS-") ? "Offline" : "Active")),
                isLiveAIS: v.id.startsWith("AIS-")
              };
            });
            setVessels(mappedVessels);
            // Sync local engine so other frontend features don't break
            engine.vessels = mappedVessels; 
          }
          if (data.alerts) {
            setAlerts(data.alerts);
            engine.alerts = data.alerts;
            // Auto-deselect if the selected alert was resolved by the backend
            setSelectedAlert(prev => {
              if (prev && !data.alerts.find((a: Alert) => a.id === prev.id)) {
                return null;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => ws.close();
  }, [engine]);




  // 5-second poll for backend-triggered emergencies
  useEffect(() => {
    const pollEmergencies = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/emergency/pending`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
        });
        if (!res.ok) return;
        const pending: Array<{ vessel_id: string; type: string; description: string }> = await res.json();
        for (const p of pending) {
          const vessel = engine.vessels.find(v => v.id === p.vessel_id);
          if (vessel && vessel.status !== "Distress") {
            engine.triggerSOS(p.vessel_id, p.type, p.description, weather);
          }
        }
        if (pending.length > 0) {
          setVessels([...engine.vessels]);
          setAlerts([...engine.alerts]);
          setMissions([...engine.missions]);
        }
      } catch {
        // backend offline
      }
    };
    const interval = setInterval(pollEmergencies, 5000);
    return () => clearInterval(interval);
  }, [engine, weather]);

  // 10-minute Weather live fetcher
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/weather`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
        });
        if (res.ok) {
          const data = await res.json();
          setWeather({
            condition: data.weather.condition,
            temp: data.weather.temperature,
            windSpeed: data.weather.windSpeed,
            windDirection: data.weather.windDirection,
            waveHeight: data.marine.waveHeight,
            wavePeriod: data.marine.wavePeriod,
            waveDirection: data.marine.waveDirection,
            visibility: data.weather.visibility,
            seaState: getSeaState(data.marine.waveHeight),
            updatedAt: new Date(data.updatedAt).toLocaleTimeString(),
            advisory: data.advisory,
            status: "online",
          });
        } else {
          setWeather((prev) => ({ ...prev, status: "offline" }));
        }
      } catch (err) {
        console.error("Failed to fetch live weather:", err);
        setWeather((prev) => ({ ...prev, status: "offline" }));
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [authToken]);

  // Listen to SOS Alarms spawned inside the engine to sync selections
  useEffect(() => {
    const sub = eventBus.subscribe("SOSCreated", (newAlert: Alert) => {
      setSelectedAlert(newAlert);
      const matchVessel =
        engine.vessels.find((v) => v.id === newAlert.vesselId) || null;
      setSelectedVessel(matchVessel);

      setAlerts([...engine.alerts]);
      setVessels([...engine.vessels]);
    });
    return sub;
  }, [engine]);

  // Sync network traces started inside engine
  useEffect(() => {
    const sub = eventBus.subscribe("NetworkTraceStarted", () => {
      setNetworkTraces([...engine.networkTraces]);
    });
    return sub;
  }, [engine]);

  // Sync Missions assigned inside engine
  useEffect(() => {
    const sub = eventBus.subscribe("MissionAssigned", (newMission: Mission) => {
      setMissions([...engine.missions]);
      setAlerts([...engine.alerts]);
      setVessels([...engine.vessels]);

      const matchAlert =
        engine.alerts.find((a) => a.id === newMission.alertId) || null;
      if (matchAlert) setSelectedAlert(matchAlert);
    });
    return sub;
  }, [engine]);

  // Combined filters based on the selected mode
  const displayVessels =
    mode === "live"
      ? vessels.filter(v => v.isLiveAIS)
      : mode === "hybrid"
        ? vessels
        : vessels.filter(v => !v.isLiveAIS);

  const displayAlerts = mode === "live" ? [] : alerts;
  const displayMissions = mode === "live" ? [] : missions;

  // State Mutator: Trigger a new distress alert broadcast
  const handleTriggerAlert = (
    newAlertData: Omit<Alert, "id" | "time" | "location">,
  ) => {
    // If the vessel ID doesn't exist in the fleet, create a temporary vessel
    // so engine.triggerSOS() can find it and the full SOS pipeline runs correctly.
    const exists = engine.vessels.some(v => v.id === newAlertData.vesselId);
    if (!exists) {
      const tempVessel = {
        id: newAlertData.vesselId,
        name: newAlertData.vesselName,
        type: "Fishing" as const,
        status: "Active" as const,
        latitude: newAlertData.latitude,
        longitude: newAlertData.longitude,
        speed: 0,
        heading: 0,
        peopleOnboard: newAlertData.peopleOnboard,
        cargo: "Unknown",
        destination: "Unknown",
      };
      engine.vessels = [tempVessel, ...engine.vessels];
    }

    engine.triggerSOS(
      newAlertData.vesselId,
      newAlertData.type,
      newAlertData.description || "",
      weather,
    );
    setVessels([...engine.vessels]);
    setAlerts([...engine.alerts]);
    setMissions([...engine.missions]);

    // Set selection
    const newlyCreatedAlert =
      engine.alerts.find((a) => a.vesselId === newAlertData.vesselId) || null;
    if (newlyCreatedAlert) {
      setSelectedAlert(newlyCreatedAlert);
      setSelectedVessel(
        engine.vessels.find((v) => v.id === newAlertData.vesselId) || null,
      );
    }
    setCurrentTab("dashboard");
  };

  // State Mutator: Trigger network propagation trace from an emergency node
  const handleNetworkPropagation = (vesselId: string) => {
    engine.triggerNetworkPropagation(vesselId);
    setNetworkTraces([...engine.networkTraces]);
  };

  // State Mutator: Assign Responder vessel to a distress target
  const handleAssignResponder = (
    alertId: string,
    responderName: string,
    eta: number,
  ) => {
    const responder = engine.vessels.find(
      (v) => v.name === responderName || v.id === responderName,
    );
    const alert = engine.alerts.find((a) => a.id === alertId);

    if (responder && alert) {
      responder.destination = `${alert.vesselName} Intercept`;
      responder.status = "Support";

      alert.responder = responderName;
      alert.etaMin = eta;
      alert.status = "Acknowledged";

      const missionId = `MSN-2026-${Math.floor(Math.random() * 9000) + 1000}`;
      const newMission: Mission = {
        id: missionId,
        alertId: alert.id,
        vesselId: alert.vesselId,
        vesselName: alert.vesselName,
        type:
          alert.type === "Medical Emergency"
            ? "Medical Evacuation (MEDEVAC)"
            : "Towing & Search-and-Rescue (SAR)",
        status: "Dispatched",
        responder: responderName,
        startTime: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        etaMin: eta,
        peopleOnboard: alert.peopleOnboard,
        logs: [
          {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            text: `Manual assignment: responder '${responderName}' dispatched to distress target.`,
          },
        ],
      };

      engine.missions = [newMission, ...engine.missions];

      setVessels([...engine.vessels]);
      setAlerts([...engine.alerts]);
      setMissions([...engine.missions]);

      setSelectedAlert({ ...alert });
      setSelectedVessel(
        engine.vessels.find((v) => v.id === alert.vesselId) || null,
      );
    }
  };

  // State Mutator: Add log comments to missions
  const handleAddMissionLog = (missionId: string, logText: string) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    engine.missions = engine.missions.map((m) =>
      m.id === missionId
        ? {
            ...m,
            logs: [...m.logs, { time: timestamp, text: logText }],
          }
        : m,
    );
    setMissions([...engine.missions]);
  };

  // State Mutator: Close and Resolve a rescue mission
  const handleCompleteMission = (missionId: string) => {
    const targetMission = engine.missions.find((m) => m.id === missionId);
    if (!targetMission) return;

    engine.missions = engine.missions.map((m) =>
      m.id === missionId ? { ...m, status: "Completed" } : m,
    );
    engine.alerts = engine.alerts.map((a) =>
      a.id === targetMission.alertId
        ? { ...a, status: "Resolved", etaMin: 0 }
        : a,
    );
    engine.vessels = engine.vessels.map((v) =>
      v.id === targetMission.vesselId
        ? {
            ...v,
            status: "Completed",
            speed: 8,
            heading: 90,
            destination: "Mangalore Port",
          }
        : v,
    );

    setMissions([...engine.missions]);
    setAlerts([...engine.alerts]);
    setVessels([...engine.vessels]);

    if (selectedAlert?.id === targetMission.alertId) {
      setSelectedAlert((prev) =>
        prev ? { ...prev, status: "Resolved", etaMin: 0 } : null,
      );
    }
    if (selectedVessel?.id === targetMission.vesselId) {
      setSelectedVessel((prev) =>
        prev
          ? {
              ...prev,
              status: "Completed",
              speed: 8,
              heading: 90,
              destination: "Mangalore Port",
            }
          : null,
      );
    }
  };

  // State Mutator: Manual transponder updates
  const handleUpdateVesselCoords = (
    id: string,
    lat: number,
    lng: number,
    speed: number,
    heading: number,
  ) => {
    engine.vessels = engine.vessels.map((v) =>
      v.id === id
        ? {
            ...v,
            latitude: lat,
            longitude: lng,
            speed,
            heading,
          }
        : v,
    );
    setVessels([...engine.vessels]);

    if (selectedVessel?.id === id) {
      setSelectedVessel((prev) =>
        prev
          ? {
              ...prev,
              latitude: lat,
              longitude: lng,
              speed,
              heading,
            }
          : null,
      );
    }
  };

  // Render Sub-Views
  const renderActiveView = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            {/* Map and Summary Table (Left 70%) */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              <MapOverview
                vessels={displayVessels}
                alerts={displayAlerts}
                selectedVessel={selectedVessel}
                onSelectVessel={handleSelectVessel}
                networkTraces={networkTraces}
                onTriggerPropagation={handleNetworkPropagation}
                onViewDetailsClick={() => setCurrentTab("vessels")}
              />
              <SummaryCards
                alerts={displayAlerts}
                vessels={displayVessels}
                missions={displayMissions}
              />
              <RecentAlertsPanel
                alerts={displayAlerts}
                onSelectAlert={handleSelectAlert}
                selectedAlertId={selectedAlert?.id}
                onViewAllClick={() => setCurrentTab("alerts")}
              />
            </div>

            {/* Side Action Panels (Right 30%) */}
            <div className="lg:col-span-3 flex flex-col gap-8 justify-start">
              <ActiveMissionPanel
                selectedAlert={selectedAlert}
                onAssignResponder={handleAssignResponder}
                supportVessels={vessels.filter((v) => v.status === "Support")}
                onViewMissionDetails={(alert) => {
                  const m = missions.find((ms) => ms.alertId === alert.id);
                  if (m) {
                    setCurrentTab("missions");
                  } else {
                    handleAssignResponder(
                      alert.id,
                      "CGS Samudra Paheredar",
                      25,
                    );
                    setCurrentTab("missions");
                  }
                }}
              />
              <WeatherPanel
                weather={weather}
                onViewForecastClick={() => setCurrentTab("weather")}
              />
            </div>
          </div>
        );

      case "alerts":
        return (
          <AlertsView
            alerts={displayAlerts}
            vessels={displayVessels}
            onTriggerAlert={handleTriggerAlert}
            onSelectAlert={handleSelectAlert}
            setCurrentTab={setCurrentTab}
          />
        );

      case "vessels":
        return (
          <VesselsView
            vessels={displayVessels}
            onUpdateVesselCoords={handleUpdateVesselCoords}
            onSelectVessel={handleSelectVessel}
            selectedVessel={selectedVessel}
          />
        );

      case "missions":
        return (
          <MissionsView
            missions={displayMissions}
            onAddMissionLog={handleAddMissionLog}
            onCompleteMission={handleCompleteMission}
            selectedAlert={selectedAlert}
            onSelectAlert={handleSelectAlert}
            alerts={displayAlerts}
          />
        );

      case "map":
        return (
          <div className="h-full flex flex-col">
            <LiveMapConsole
              vessels={displayVessels}
              alerts={displayAlerts}
              weather={weather}
              mode={mode}
              selectedVessel={selectedVessel}
              onSelectVessel={handleSelectVessel}
              setCurrentTab={setCurrentTab}
            />
          </div>
        );

      case "weather":
        return (
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <WeatherPanel weather={weather} onViewForecastClick={() => {}} />
            </div>
            <div className="md:col-span-2 bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4 text-slate-200">
              <h3 className="text-sm font-bold text-slate-100 font-sans border-b border-[#0d2238] pb-3">
                Mangalore Region Wave Radar (Swell Monitor)
              </h3>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-sans">
                  Live readings from the Malpe Coastal Radar and wave telemetry
                  stations along the West Coast:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-[#05162a] p-3 rounded border border-[#0d2238]">
                    <span className="text-slate-500 text-[10px]">
                      CURRENT WAVE HEIGHT
                    </span>
                    <strong className="text-[#00e5ff] text-base block mt-1">
                      {weather.waveHeight} meters
                    </strong>
                  </div>
                  <div className="bg-[#05162a] p-3 rounded border border-[#0d2238]">
                    <span className="text-slate-500 text-[10px]">
                      WIND VELOCITY
                    </span>
                    <strong className="text-[#00e5ff] text-base block mt-1">
                      {weather.windSpeed} km/h • {weather.windDirection}
                    </strong>
                  </div>
                  <div className="bg-[#05162a] p-3 rounded border border-[#0d2238]">
                    <span className="text-slate-500 text-[10px]">
                      SEA TEMPS
                    </span>
                    <strong className="text-slate-200 text-base block mt-1">
                      {weather.temp}°C
                    </strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs leading-relaxed bg-[#020d1a] border border-blue-900/10 p-4 rounded-xl text-slate-300">
                  <h4
                    className="font-bold
                    ext-slate-200 uppercase tracking-wider text-[10px] text-[#00e5ff]"
                  >
                    Vessel Precautionary Directives
                  </h4>
                  <p>
                    All deep-sea fishing trawlers departing Malpe and Mangalore
                    docks must verify dual VHF transceiver loops are intact. If
                    swells exceed 2.5 meters, local harbor masters will restrict
                    departing transits automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "analytics":
        return <AnalyticsView />;

      case "performance":
        return <IngestionPanel />;

      case "replay":
        return <ReplayView />;

      case "admin":
        return <AdminView />;

      case "reports":
        return <ReportsView alerts={alerts} missions={missions} />;

      case "settings":
        return <SettingsView weather={weather} onUpdateWeather={setWeather} />;

      default:
        return (
          <div className="p-8 text-center text-slate-500 font-mono">
            View coming soon.
          </div>
        );
    }
  };

  // Header Subtitle Resolver
  const getHeaderSubtext = () => {
    switch (currentTab) {
      case "dashboard":
        return "Real-time overview of active maritime emergencies and responses";
      case "alerts":
        return "Log index of Digital Selective Calling signals and distress broadcasts";
      case "vessels":
        return "AIS Transponder Fleet tracking and cargo specification matrix";
      case "missions":
        return "Active Search and Rescue (SAR) incident logs and dispatched responder streams";
      case "map":
        return "Extended tactical geographic visualization grid for maritime sectors";
      case "weather":
        return "Meteorological wave swell vectors and marine safety advisories";
      case "analytics":
        return "Aggregated fleet response performance charts and statistical indexes";
      case "performance":
        return "Live ingestion throughput, p50/p99/max latency, and SAT stress-test controller";
      case "replay":
        return "Historical incident playback with georeferenced vessel track timeline";
      case "admin":
        return "Runtime configuration manager — applies immediately without service restart";
      case "reports":
        return "Compile official naval closeout incident documents powered by Gemini AI";
      case "settings":
        return "Override weather simulators and audit system connectivity structures";
      default:
        return "Maritime Emergency Management OS";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#010811] text-slate-100 font-sans">
      {/* Dynamic Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onSendBroadcastClick={() => setCurrentTab("alerts")}
        activeAlertsCount={alerts.filter((a) => a.status !== "Resolved").length}
      />

      {currentTab === "map" ? (
        <main className="flex-1 overflow-hidden">
          <LiveMapConsole
            vessels={displayVessels}
            alerts={displayAlerts}
            weather={weather}
            mode={mode}
            selectedVessel={selectedVessel}
            onSelectVessel={handleSelectVessel}
            setCurrentTab={setCurrentTab}
          />
        </main>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Header
            title={currentTab.toUpperCase()}
            subtitle={getHeaderSubtext()}
            activeAlerts={displayAlerts}
            onSelectAlert={handleSelectAlert}
            setCurrentTab={setCurrentTab}
            mode={mode}
            onModeChange={setMode}
          />

          {/* Content Viewer */}
          <main
            className="flex-1 overflow-y-auto p-8"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(3,17,34,0.3) 0%, #010811 70%)",
            }}
          >
            {renderActiveView()}
          </main>
        </div>
      )}
    </div>
  );
}
