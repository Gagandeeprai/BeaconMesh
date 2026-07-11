/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Settings, Shield, RefreshCw, Key, CloudRain, Sun, Info, Compass, HelpCircle, CheckCircle } from "lucide-react";
import { WeatherCondition } from "../types";

interface SettingsViewProps {
  weather: WeatherCondition;
  onUpdateWeather: (newWeather: WeatherCondition) => void;
}

export default function SettingsView({ weather, onUpdateWeather }: SettingsViewProps) {
  const [apiStatus, setApiStatus] = useState({ active: false, message: "" });
  const [loadingApi, setLoadingApi] = useState(false);

  // Weather local form states
  const [temp, setTemp] = useState(weather.temp);
  const [windSpeed, setWindSpeed] = useState(weather.windSpeed);
  const [windDirection, setWindDirection] = useState(weather.windDirection);
  const [waveHeight, setWaveHeight] = useState(weather.waveHeight);
  const [condition, setCondition] = useState(weather.condition);
  const [visibility, setVisibility] = useState(weather.visibility);
  const [seaState, setSeaState] = useState(weather.seaState);

  const fetchApiStatus = async () => {
    setLoadingApi(true);
    try {
      const res = await fetch("/api/gemini/status");
      const data = await res.json();
      setApiStatus(data);
    } catch (e) {
      setApiStatus({ active: false, message: "Could not contact server API." });
    } finally {
      setLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchApiStatus();
  }, []);

  const handleApplyWeather = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWeather({
      condition,
      temp: Number(temp),
      windSpeed: Number(windSpeed),
      windDirection,
      waveHeight: Number(waveHeight),
      visibility: Number(visibility),
      seaState
    });
  };

  const weatherPresets = [
    {
      name: "Calm Clear Waters",
      config: { condition: "Clear Skies", temp: 31, windSpeed: 6, windDirection: "N", waveHeight: 0.4, visibility: 12, seaState: "Calm" }
    },
    {
      name: "Moderate Monsoon Rain",
      config: { condition: "Moderate Rain", temp: 27, windSpeed: 18, windDirection: "SW", waveHeight: 1.6, visibility: 6, seaState: "Moderate" }
    },
    {
      name: "Cyclone Hazard Warning",
      config: { condition: "Severe Gale Storm", temp: 23, windSpeed: 45, windDirection: "WSW", waveHeight: 4.8, visibility: 1.5, seaState: "Rough Swells" }
    }
  ];

  const applyPreset = (preset: typeof weatherPresets[0]["config"]) => {
    setCondition(preset.condition);
    setTemp(preset.temp);
    setWindSpeed(preset.windSpeed);
    setWindDirection(preset.windDirection);
    setWaveHeight(preset.waveHeight);
    setVisibility(preset.visibility);
    setSeaState(preset.seaState);

    onUpdateWeather(preset);
  };

  return (
    <div id="settings-view" className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* 1. Weather and Environmental Simulators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Environmental Controller */}
        <div className="lg:col-span-2 bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-[#00e5ff]" />
              Meteorological Environmental Simulator
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Override global climate factors to test search & rescue mission ETAs and AI weather advisories</p>
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2 border-b border-[#0d2238]/60 pb-4">
            {weatherPresets.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyPreset(p.config)}
                className="py-1.5 px-3 rounded text-[10px] font-mono font-bold uppercase transition-all bg-[#05162a] text-slate-400 hover:text-slate-100 border border-[#0d2238] hover:bg-[#071d33]"
              >
                {p.name}
              </button>
            ))}
          </div>

          <form onSubmit={handleApplyWeather} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">Weather Condition</label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">Air Temp (°C)</label>
                <input
                  type="number"
                  value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">Sea State Description</label>
                <input
                  type="text"
                  value={seaState}
                  onChange={(e) => setSeaState(e.target.value)}
                  className="w-full bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">Wind Speed (km/h)</label>
                <input
                  type="number"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(Number(e.target.value))}
                  className="w-full bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">Wind Direction</label>
                <input
                  type="text"
                  value={windDirection}
                  onChange={(e) => setWindDirection(e.target.value)}
                  className="w-full bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">Wave Swell Height (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={waveHeight}
                  onChange={(e) => setWaveHeight(Number(e.target.value))}
                  className="w-full bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block mb-1">Visibility (km)</label>
                <input
                  type="number"
                  value={visibility}
                  onChange={(e) => setVisibility(Number(e.target.value))}
                  className="w-full bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-2 px-5 rounded bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-bold text-xs uppercase tracking-wide cursor-pointer"
            >
              Apply Global Climate override
            </button>
          </form>
        </div>

        {/* 2. System credentials / Info box */}
        <div className="lg:col-span-1 bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00e5ff]" />
              Control Center Credentials
            </h4>
            
            <div className="space-y-3 text-xs font-mono">
              <div className="bg-[#05162a] border border-[#0d2238]/60 p-3 rounded">
                <span className="text-slate-500 uppercase block text-[9px] font-bold">OPERATIONS CENTER</span>
                <span className="text-slate-200 font-bold block mt-0.5">ICG MANGALORE DIVISION</span>
              </div>
              <div className="bg-[#05162a] border border-[#0d2238]/60 p-3 rounded">
                <span className="text-slate-500 uppercase block text-[9px] font-bold">REGIONAL ZONE COORD</span>
                <span className="text-slate-200 font-bold block mt-0.5">KARNATAKA SECTOR DISTRICT 3</span>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2 pt-2 border-t border-[#0d2238]/60">
              <Compass className="w-4 h-4 text-[#00e5ff]" />
              Safety Rule Thresholds
            </h4>
            <div className="space-y-2 text-[10.5px] font-mono">
              <div className="bg-[#05162a] border border-[#0d2238]/60 p-2.5 rounded flex justify-between">
                <span className="text-slate-500">PORT SPEED LIMIT</span>
                <span className="text-cyan-400 font-bold">10.0 Kts</span>
              </div>
              <div className="bg-[#05162a] border border-[#0d2238]/60 p-2.5 rounded flex justify-between">
                <span className="text-slate-500">LOITER TIMEOUT</span>
                <span className="text-cyan-400 font-bold">15s</span>
              </div>
              <div className="bg-[#05162a] border border-[#0d2238]/60 p-2.5 rounded flex justify-between">
                <span className="text-slate-500">AIS SILENCE ALARM</span>
                <span className="text-cyan-400 font-bold">45s</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 leading-relaxed font-sans mt-4">
            BeaconMesh system telemetry runs autonomously over global DSC VHF Channel 70.
          </div>
        </div>
      </div>

      {/* 3. Gemini AI Intelligence Center Status */}
      <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-6 shadow-lg space-y-4 max-w-4xl">
        <div className="flex items-start justify-between border-b border-[#0d2238] pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-[#00e5ff]" />
              Gemini AI Integration Core
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Real-time status tracking for large language model operations</p>
          </div>

          <button
            id="settings-btn-status-refresh"
            onClick={fetchApiStatus}
            disabled={loadingApi}
            className="p-1.5 rounded bg-[#05162a] hover:bg-[#0b2240] text-slate-400 hover:text-slate-200 border border-[#0d2238] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingApi ? "animate-spin" : ""}`} />
          </button>
        </div>

        {apiStatus.active ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-mono flex items-start gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-sans">Gemini AI Active</strong>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-300">
                The server has successfully initialized connection to the '@google/genai' SDK using your secret key. Advanced risk assessments, tactical checklisting, and clinical debriefing logs are fully functional under live reasoning.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-xs font-mono flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-yellow-500" />
            <div>
              <strong className="block font-sans">Simulated Intelligence Enabled</strong>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-300">
                {apiStatus.message}
              </p>
              <div className="mt-3 bg-slate-950/80 p-3 rounded border border-slate-900 text-slate-400 text-[10.5px] leading-relaxed space-y-2">
                <span className="text-[#00e5ff] font-bold uppercase block text-[9.5px]">How to configure live AI:</span>
                <p>1. Go to the top right of this web screen, click on the **Settings &gt; Secrets** button.</p>
                <p>2. Add a new secret named `GEMINI_API_KEY` and insert your Gemini API Key from AI Studio.</p>
                <p>3. Refresh the status here. The system will switch dynamically from high-fidelity simulations to live model calculations instantly without any file editing required!</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
