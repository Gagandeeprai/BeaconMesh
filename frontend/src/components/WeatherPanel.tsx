/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  CloudRain, Wind, Compass, Eye, ShieldAlert, CloudLightning, Sun, 
  CloudDrizzle, Wifi, WifiOff, AlertTriangle, Activity 
} from "lucide-react";
import { WeatherCondition } from "../types";

interface WeatherPanelProps {
  weather: WeatherCondition;
  onViewForecastClick: () => void;
}

interface GeminiWeatherAdvisory {
  advisoryLevel: "Clear" | "Caution" | "Advisory" | "Hazard";
  summary: string;
  recommendations: string[];
  simulated?: boolean;
}

export default function WeatherPanel({ weather, onViewForecastClick }: WeatherPanelProps) {
  const [advisory, setAdvisory] = useState<GeminiWeatherAdvisory | null>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);

  // Auto load weather advisory when weather parameters change (only if online)
  useEffect(() => {
    if (weather.status === "offline") {
      setAdvisory(null);
      return;
    }

    const fetchWeatherAdvisory = async () => {
      setLoadingAdvisory(true);
      try {
        const res = await fetch("/api/gemini/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            condition: weather.condition,
            waveHeight: weather.waveHeight,
            windSpeed: weather.windSpeed,
            windDirection: weather.windDirection,
            visibility: weather.visibility
          })
        });
        if (res.ok) {
          const data = await res.json();
          setAdvisory(data);
        }
      } catch (err) {
        console.error("Gemini advisory error:", err);
      } finally {
        setLoadingAdvisory(false);
      }
    };
    fetchWeatherAdvisory();
  }, [weather.condition, weather.waveHeight, weather.windSpeed, weather.status]);

  // Weather icon picker
  const renderWeatherIcon = () => {
    const cond = weather.condition.toLowerCase();
    const style = "w-10 h-10 text-[#00e5ff] shrink-0 drop-shadow-[0_0_10px_rgba(0,229,255,0.2)]";
    if (cond.includes("storm") || cond.includes("gale") || cond.includes("thunderstorm")) {
      return <CloudLightning className={`${style} text-red-400`} />;
    } else if (cond.includes("rain") || cond.includes("drizzle")) {
      return <CloudRain className={style} />;
    } else if (cond.includes("clear") || cond.includes("sunny") || cond.includes("mainly clear")) {
      return <Sun className={`${style} text-amber-400`} />;
    }
    return <CloudDrizzle className={style} />;
  };

  // Helper to generate local advisory text automatically
  const generateAutoAdvisory = (): string => {
    const dir = weather.windDirection;
    const mapping: Record<string, string> = {
      N: "north", NNE: "north-northeast", NE: "northeast", ENE: "east-northeast",
      E: "east", ESE: "east-southeast", SE: "southeast", SSE: "south-southeast",
      S: "south", SSW: "south-southwest", SW: "southwest", WSW: "west-southwest",
      W: "west", WNW: "west-northwest", NW: "northwest", NNW: "north-northwest"
    };
    const dirName = mapping[dir.toUpperCase()] || dir.toLowerCase();
    
    if (weather.waveHeight > 2.5 || weather.windSpeed > 35) {
      return `Small fishing vessels should remain in harbor due to ${weather.waveHeight.toFixed(1)} m waves and ${weather.windSpeed.toFixed(0)} km/h ${dirName} winds.`;
    } else if (weather.waveHeight > 1.2 || weather.windSpeed > 15) {
      return `Small fishing vessels should exercise caution due to ${weather.waveHeight.toFixed(1)} m waves and ${weather.windSpeed.toFixed(0)} km/h ${dirName} winds.`;
    } else {
      return `Conditions are safe for operations. Wave height is ${weather.waveHeight.toFixed(1)} m and winds are ${weather.windSpeed.toFixed(0)} km/h ${dirName}.`;
    }
  };

  // Determine current weather severity / badge
  const getAdvisoryBadge = () => {
    if (weather.status === "offline") {
      return (
        <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
          <WifiOff className="w-2.5 h-2.5" /> OFFLINE
        </span>
      );
    }

    const lvl = advisory ? advisory.advisoryLevel : (weather.waveHeight > 2.5 || weather.windSpeed > 35 ? "Hazard" : (weather.waveHeight > 1.2 || weather.windSpeed > 15 ? "Advisory" : "Clear"));
    let color = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (lvl === "Hazard") color = "bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse";
    else if (lvl === "Advisory") color = "bg-orange-500/10 text-orange-400 border border-orange-500/20";
    else if (lvl === "Caution" || lvl === "Warning") color = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";

    return (
      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded tracking-wider ${color}`}>
        {lvl.toUpperCase()}
      </span>
    );
  };

  return (
    <div id="weather-panel-card" className="bg-[#020a14] border border-[#0d2238] rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)] flex flex-col">
      {/* Header */}
      <div className="p-6 bg-[#031122] border-b border-[#0d2238] flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 font-sans tracking-wide flex items-center gap-2">
          Weather Overview
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${weather.status === "offline" ? "bg-red-400" : "bg-cyan-400"}`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${weather.status === "offline" ? "bg-red-500" : "bg-cyan-500"}`}></span>
          </span>
        </h3>
        <button
          id="btn-view-weather-forecast"
          onClick={onViewForecastClick}
          className="text-xs text-[#00e5ff] hover:text-cyan-400 font-medium transition-colors cursor-pointer"
        >
          View Forecast
        </button>
      </div>

      {/* Main Condition Block */}
      <div className="p-6 flex items-start gap-5 bg-gradient-to-br from-[#040f1a] to-transparent">
        {renderWeatherIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2.5">
            <h4 className="text-sm font-bold text-slate-200 font-sans">
              {weather.condition}
            </h4>
            {getAdvisoryBadge()}
          </div>
          <p className="text-xs text-slate-300 mt-1 font-sans">
            Temperature: <strong className="text-slate-100 font-mono">{weather.temp}°C</strong>
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Last Telemetry: {weather.updatedAt || "Simulated"}
          </p>
        </div>
      </div>

      {/* Expanded Live Meteorological Details Grid (10 total variables) */}
      <div className="px-6 pb-6 grid grid-cols-2 gap-4 border-b border-[#0d2238]/60 text-[10.5px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Wind Speed: <strong className="text-slate-200">{weather.windSpeed} km/h</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Wind Direction: <strong className="text-slate-200">{weather.windDirection}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Wave Height: <strong className="text-slate-200">{weather.waveHeight} m</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Wave Direction: <strong className="text-slate-200">{weather.waveDirection || 240}°</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Wave Period: <strong className="text-slate-200">{weather.wavePeriod || 8.5} s</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Visibility: <strong className="text-slate-200">{weather.visibility} km</strong></span>
        </div>
        <div className="col-span-2 flex items-center gap-2 text-[10px] bg-[#040f1a] p-2 rounded border border-[#0d2238]/50">
          <Compass className="w-3.5 h-3.5 text-[#00e5ff] shrink-0" />
          <span>Sea State: <strong className="text-[#00e5ff] font-semibold">{weather.seaState}</strong></span>
        </div>
      </div>

      {/* Marine Safety Advisory Text Container */}
      <div className="p-6 bg-[#030d17]/40 flex-1 flex flex-col justify-center min-h-[110px]">
        {weather.status === "offline" ? (
          <div className="space-y-1.5 text-slate-500">
            <div className="flex items-center gap-2 text-red-400 font-bold font-mono text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>OFFLINE WEATHER MONITOR</span>
            </div>
            <p className="text-[10px] font-sans leading-relaxed">
              Telemetry feed disconnected. Displaying cached readings from {weather.updatedAt || "last update"}. Automatic dispatch systems will default to standardized backup safety multipliers.
            </p>
          </div>
        ) : loadingAdvisory ? (
          <div className="text-center py-2 text-[10px] text-slate-500 font-mono flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 bg-[#00e5ff] rounded-full animate-ping"></span>
            <span>AI Radar Assessment...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#00e5ff] font-bold font-mono text-[9.5px] uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Marine Precautionary Advisory</span>
            </div>
            <p className="text-[10.5px] font-sans leading-relaxed text-slate-300 italic">
              "{advisory ? advisory.summary : generateAutoAdvisory()}"
            </p>
            {advisory && advisory.recommendations.length > 0 && (
              <div className="text-[9.5px] font-mono text-cyan-400/90 border-t border-[#0d2238]/40 pt-2">
                OPS: {advisory.recommendations[0]}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
