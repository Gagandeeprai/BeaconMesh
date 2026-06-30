/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FileText, Printer, CheckCircle, Brain, RefreshCw, Eye, Download } from "lucide-react";
import { Alert, Mission } from "../types";

interface ReportsViewProps {
  alerts: Alert[];
  missions: Mission[];
}

interface GeminiReport {
  executiveSummary: string;
  rootCauseAnalysis: string;
  responseTimeline: string[];
  recommendationsForVessel: string[];
  signedBy: string;
  simulated?: boolean;
}

export default function ReportsView({ alerts, missions }: ReportsViewProps) {
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<GeminiReport | null>(null);

  // Selected Alert
  const currentAlert = alerts.find(a => a.id === selectedAlertId);

  const handleGenerateReport = async () => {
    if (!selectedAlertId || !currentAlert) return;
    setLoadingReport(true);
    setReportData(null);

    // Grab corresponding mission logs if any
    const mission = missions.find(m => m.alertId === currentAlert.id);
    const logs = mission ? mission.logs : [
      { time: currentAlert.time, text: `Emergency signal registered. Nature: ${currentAlert.type}` },
      { time: "T+15 mins", text: "Assigned Coast Guard patrol responder." },
      { time: "Completed", text: "Vessel successfully assisted. Status closeout." }
    ];

    try {
      const res = await fetch("/api/gemini/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentAlert.id,
          vesselName: currentAlert.vesselName,
          alertType: currentAlert.type,
          time: currentAlert.time,
          location: currentAlert.location,
          status: currentAlert.status,
          severity: currentAlert.severity,
          description: currentAlert.description,
          logs
        })
      });
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error("Failed to compile report", err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="reports-view" className="p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)]">
      {/* Selector Board */}
      <div className="bg-[#020a14] border border-[#0d2238] p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 w-full md:w-auto">
          <h3 className="text-sm font-bold text-slate-200">Incident Closeout Reporting</h3>
          <p className="text-[10px] text-slate-500 font-mono">Select a resolved or pending emergency situation to compile an official Coast Guard debrief</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            id="reports-alert-select"
            value={selectedAlertId}
            onChange={(e) => {
              setSelectedAlertId(e.target.value);
              setReportData(null);
            }}
            className="flex-1 bg-[#05162a] text-xs text-slate-200 border border-[#0d2238] rounded-lg px-3 py-2 focus:outline-none focus:border-[#00e5ff] font-sans"
          >
            <option value="">-- Choose Emergency Log --</option>
            {alerts.map(a => (
              <option key={a.id} value={a.id}>
                [{a.status}] {a.vesselName} - {a.type}
              </option>
            ))}
          </select>

          <button
            id="btn-trigger-report-generation"
            onClick={handleGenerateReport}
            disabled={!selectedAlertId || loadingReport}
            className="py-2 px-5 rounded bg-[#0070f3] hover:bg-[#0070f3]/90 text-white font-bold text-xs uppercase tracking-wide cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
          >
            {loadingReport ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" /> Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Canvas Document */}
      {reportData ? (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Action Row */}
          <div className="flex justify-end gap-3.5">
            <button
              id="reports-btn-print"
              onClick={handlePrint}
              className="py-1.5 px-4 text-xs font-semibold rounded text-slate-300 hover:text-slate-100 bg-[#05162a] border border-[#0d2238] hover:bg-[#0b2240] transition-colors cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>

          {/* Paper Canvas */}
          <div id="printable-report-paper" className="bg-[#030d1a] border-2 border-[#1e3e5c]/40 rounded-xl p-8 shadow-2xl relative space-y-6 text-slate-200 font-sans">
            {/* Stamp Logo overlay */}
            <div className="absolute right-8 top-8 opacity-10 pointer-events-none">
              <FileText className="w-32 h-32 text-[#00e5ff]" />
            </div>

            {/* Document Header */}
            <div className="text-center border-b-2 border-[#0d2238] pb-6 space-y-2">
              <div className="text-[10px] font-bold tracking-widest text-[#00e5ff] font-mono uppercase">
                Official Maritime Safety Commission
              </div>
              <h2 className="text-xl font-extrabold tracking-tight font-sans text-slate-100 uppercase">
                INDIAN COAST GUARD COMMANDS UNIT
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                MANGALORE SUB-STATION • WEST REGION DEFENCE DISTRICT
              </p>
              <div className="inline-block mt-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                Status: Debrief Completed
              </div>
            </div>

            {/* Meta Parameters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono border-b border-[#0d2238] pb-4">
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">CASE REPORT ID</span>
                <span className="text-slate-200 font-bold">{currentAlert?.id}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">INCIDENT VESSEL</span>
                <span className="text-slate-200 font-bold">{currentAlert?.vesselName}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">CASUALTY NATURE</span>
                <span className="text-slate-200 font-bold">{currentAlert?.type}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block text-[10px]">LOCATION SEC</span>
                <span className="text-slate-200 font-bold">{currentAlert?.location}</span>
              </div>
            </div>

            {/* Document Content */}
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              {/* Executive Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-[#00e5ff] font-mono uppercase tracking-wider">I. EXECUTIVE SUMMARY</h4>
                <p className="bg-[#020a14]/50 p-4 rounded border border-[#0d2238]/60 italic">
                  {reportData.executiveSummary}
                </p>
              </div>

              {/* Root Cause Analysis */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-[#00e5ff] font-mono uppercase tracking-wider">II. TECHNICAL ROOT CAUSE ANALYSIS</h4>
                <p className="bg-[#020a14]/20 p-4 rounded border border-[#0d2238]/40">
                  {reportData.rootCauseAnalysis}
                </p>
              </div>

              {/* Action Response Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#00e5ff] font-mono uppercase tracking-wider">III. OPERATIONAL DEPLOYMENT LOGS</h4>
                <div className="space-y-1.5">
                  {reportData.responseTimeline.map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-xs font-mono bg-[#020a14]/40 p-2 rounded border border-[#0d2238]/40">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preventative Recommendations */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#00e5ff] font-mono uppercase tracking-wider">IV. PREVENTATIVE REMEDIAL DIRECTIVES</h4>
                <div className="space-y-1.5 font-sans text-xs">
                  {reportData.recommendationsForVessel.map((rec, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start p-2 rounded bg-red-950/10 border border-red-900/10">
                      <span className="text-red-400 font-bold shrink-0">{idx+1}.</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="text-[9.5px] text-slate-500 leading-normal font-sans pt-4 border-t border-[#0d2238] italic">
              LEGAL NOTICE: This closeout report is generated under maritime security safety code rules of the Indian Coast Guard division. Any unauthorized reproduction, transmittal, or falsification is punishable under regional naval commands legislation.
            </div>

            {/* Signature Block */}
            <div className="flex flex-col items-end pt-4 font-mono text-xs">
              <div className="text-slate-400 italic font-serif">Commanding Officer Signature</div>
              <div className="text-slate-300 font-bold mt-4 border-t border-slate-500 pt-1">
                {reportData.signedBy}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">ICG MANGALORE DIVISION COMMANDS HQ</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#020a14] border border-[#0d2238] rounded-xl p-12 flex flex-col items-center justify-center text-center h-[380px] shadow-lg">
          <FileText className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
          <h3 className="text-slate-300 font-bold text-sm">Incident Reports compiler</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed font-sans">
            Choose any emergency situation from the dropdown above, and trigger the compilation engine to draft a formal naval document utilizing Gemini's intelligence structures.
          </p>
        </div>
      )}
    </div>
  );
}
