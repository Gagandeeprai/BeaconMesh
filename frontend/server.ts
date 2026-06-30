/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Check if Gemini is active
app.get("/api/gemini/status", (req, res) => {
  const client = getGeminiClient();
  res.json({
    active: client !== null,
    message: client 
      ? "Gemini AI assistant fully connected." 
      : "Gemini is currently running in Simulated Intelligence mode. Configure GEMINI_API_KEY in Settings > Secrets to unlock live AI reasoning.",
  });
});

// API endpoint 1: Emergency Situational Assessment Plan
app.post("/api/gemini/assessment", async (req, res) => {
  const { alertType, vesselName, description, coordinates, severity, peopleOnboard, weatherCondition } = req.body;
  const client = getGeminiClient();

  if (!client) {
    // Return high-quality realistic simulated plan if API Key is missing
    const isMedical = alertType.toLowerCase().includes("medical");
    const isEngine = alertType.toLowerCase().includes("engine");
    const isFire = alertType.toLowerCase().includes("fire");

    let riskAnalysis = `High operational risk due to drifting hulls. Swell conditions at 1.6m represent moderate capsizing threat for a ${isEngine ? "disabled fishing trawler" : "compromised vessel"}.`;
    let priorityChecklist = [
      "Maintain continuous VHF Channel 16 communications with vessel captain.",
      "Dispatch duty patrol cutter with proper towing/pumping equipment immediately.",
      "Notify nearby commercial vessels of the drifting hazard via NAVTEX broadcast.",
      "Monitor swell rate and coordinate satellite radar tracking for drift vectors."
    ];
    let responderInstructions = [
      "Approach target vessel from windward to avoid collision on drifting vector.",
      "Conduct visual integrity inspection of hull prior to establishing line-of-contact.",
      "Be prepared to deploy medical teams or boarding officers under active swell.",
      "Deliver secondary generator/pumping lines if hull flooding is suspected."
    ];
    let radioAdvisory = `Coastal Patrol to Captain of ${vesselName}. Copy all, help is underway. Direct all hands to don personal flotation devices (lifejackets) immediately. Prepare your towing bitts and muster on the forecastle deck if stable. We are standing by on VHF Channel 16. Current intercept ETA is approximately 25 minutes.`;

    if (isMedical) {
      riskAnalysis = "Critical threat to human life. Delay in medical evacuation may result in permanent casualty or hemorrhagic shock under maritime isolation conditions.";
      priorityChecklist = [
        "Alert Navy Surgical Medical team on high-priority medevac standby.",
        "Obtain continuous vital updates (pulse, airway, bleeding control) from vessel crew.",
        "Confirm responder vessel speed is maximized and flight decks are ready.",
        "Establish trauma bed booking at Wenlock District Hospital, Mangalore."
      ];
      responderInstructions = [
        "Establish safe boarding or harness lift point. Minimize vessel motion relative to swell.",
        "Deploy on-board Navy trauma doctor directly to the patient's location.",
        "Stabilize cervical spine and maintain tourniquet pressure before shifting patient.",
        "Administer heated IV saline and thermal blankets for hemorrhagic shock control."
      ];
      radioAdvisory = `Coast Guard Operations to Captain of ${vesselName}. Medical team is en route on patrol vessel. Instruct your crew to keep the casualty warm, elevate the injured limb if possible, and do NOT loosen the tourniquet unless instructed by our doctor on the radio. Keep the boarding path on the port side clear. Maintain watch on Channel 16.`;
    } else if (isFire) {
      riskAnalysis = "Severe explosion and structural collapse hazard. High cargo volatility represents catastrophic spill or environmental disaster if fuel tanks breach.";
      priorityChecklist = [
        "Order immediate evacuation of all non-essential personnel to emergency liferafts.",
        "Dispatch Firefighting Support Tug 'Samudra Shanti' with high-capacity foam monitors.",
        "Alert coastal pollution control unit of potential petroleum containment requirement.",
        "Maintain a 500-meter exclusion zone for all local transit vessels."
      ];
    }

    return res.json({
      simulated: true,
      riskAnalysis,
      priorityChecklist,
      responderInstructions,
      radioAdvisory
    });
  }

  try {
    const prompt = `You are the BeaconMesh AI Maritime emergency responder assistant. Evaluate this emergency situation for Coast Guard Ops Mangalore:
Vessel Name: ${vesselName} (carrying ${peopleOnboard} persons)
Emergency Type: ${alertType} (${severity} severity)
Coordinates: ${coordinates}
Current weather: ${weatherCondition}
Detailed distress description: ${description}

Generate a high-fidelity emergency response plan. Return your response strictly in JSON format matching this schema:
{
  "riskAnalysis": "A detailed 1-2 sentence assessment of hull integrity, crew safety risks, and drifting dynamics.",
  "priorityChecklist": ["Immediate command center action 1", "Action 2", "Action 3", "Action 4"],
  "responderInstructions": ["Tactical step for the dispatched ship 1", "Step 2", "Step 3", "Step 4"],
  "radioAdvisory": "Direct script text for the operator to read to the distressed crew via VHF Radio."
}`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskAnalysis: { type: Type.STRING },
            priorityChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            responderInstructions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            radioAdvisory: { type: Type.STRING }
          },
          required: ["riskAnalysis", "priorityChecklist", "responderInstructions", "radioAdvisory"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim());
      res.json({ ...data, simulated: false });
    } else {
      throw new Error("Empty response from Gemini API");
    }
  } catch (error: any) {
    console.error("Gemini assessment error:", error);
    res.status(500).json({ error: "Failed to generate assessment plan", message: error.message });
  }
});

// API endpoint 2: Weather briefing analysis
app.post("/api/gemini/weather", async (req, res) => {
  const { condition, waveHeight, windSpeed, windDirection, visibility } = req.body;
  const client = getGeminiClient();

  if (!client) {
    // Simulated weather advisory
    const alertLvl = waveHeight > 2.0 || windSpeed > 25 ? "Hazard" : (waveHeight > 1.2 || windSpeed > 15 ? "Advisory" : "Clear");
    return res.json({
      simulated: true,
      advisoryLevel: alertLvl,
      summary: `Atmospheric pressure is dropping slightly over the Mangalore coast. Active ${condition} with wave swells of ${waveHeight}m propagating on a ${windDirection} direction will challenge local shallow-draft vessels.`,
      recommendations: [
        "Advise all artisanal fishing craft under 15 meters to remain in harbor or seek immediate shelter.",
        "Ensure commercial cargo vessels secure deck-loaded items and monitor mooring tensions.",
        "Maintain close watch on low-visibility thermal radar channels for un-transponding local nets."
      ]
    });
  }

  try {
    const prompt = `Analyze this current maritime weather state for the Mangalore/Karnataka coastal sector:
Condition: ${condition}
Wave Height: ${waveHeight} meters
Wind Speed: ${windSpeed} km/h
Wind Direction: ${windDirection}
Visibility: ${visibility} kilometers

Provide an official Coast Guard meteorological risk assessment. Return strictly a JSON object with this schema:
{
  "advisoryLevel": "Clear" or "Caution" or "Advisory" or "Hazard",
  "summary": "A concise 2-sentence summary of the weather impact on local maritime traffic.",
  "recommendations": ["Meteorological action item 1", "Action 2", "Action 3"]
}`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            advisoryLevel: { type: Type.STRING },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["advisoryLevel", "summary", "recommendations"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim());
      res.json({ ...data, simulated: false });
    } else {
      throw new Error("Empty weather response");
    }
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate weather analysis", message: error.message });
  }
});

// API endpoint 3: Compile closeout report
app.post("/api/gemini/report", async (req, res) => {
  const { id, vesselName, alertType, time, location, status, severity, description, logs } = req.body;
  const client = getGeminiClient();

  if (!client) {
    // Simulated Closeout Report
    return res.json({
      simulated: true,
      executiveSummary: `This incident report summarizes the Coast Guard rescue operations for the vessel '${vesselName}' which triggered a distress signal at ${time} due to '${alertType}'. Immediate search and rescue efforts were dispatched from Mangalore Command.`,
      rootCauseAnalysis: `Preliminary findings show primary structural failure corresponding to ${alertType}. Drift metrics indicate strong tidal pull was present in coordinates ${location}.`,
      responseTimeline: [
        `${time} - Operational emergency signal logged.`,
        `T+15 mins - Emergency responder assigned to intercept coordinate.`,
        `T+25 mins - Visual contact established under maritime swell.`,
        `T+1 hour - Boarding secure. Patient stabilized / towing established.`
      ],
      recommendationsForVessel: [
        "Conduct complete hull and machinery audit before returning to deep-sea operation.",
        "Refit backup auxiliary communications and reserve safety arrays on main bridge.",
        "Mandate refresher life-saving and damage-control training for all officers."
      ],
      signedBy: "Operations Commander, CGS Mangalore Division"
    });
  }

  try {
    const logsText = logs.map((l: any) => `[${l.time}] ${l.text}`).join("\n");
    const prompt = `You are a Senior Maritime Investigator compiling an official Coast Guard Incident Closeout Report:
Case ID: ${id}
Vessel: ${vesselName}
Incident: ${alertType} (${severity} severity)
Logged Distress Description: ${description}
Response Operations Timeline:
${logsText}

Compile a comprehensive formal report. Return strictly a JSON object with this schema:
{
  "executiveSummary": "A highly formal professional summary paragraph detailing the incident and result.",
  "rootCauseAnalysis": "A clinical root cause breakdown of the mechanical/operational failure based on logs and description.",
  "responseTimeline": ["Key operational milestone 1", "Key operational milestone 2", "Key operational milestone 3"],
  "recommendationsForVessel": ["Safety recommendation 1", "Recommendation 2", "Recommendation 3"],
  "signedBy": "Strictly 'Operations Commander, CGS Mangalore'"
}`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            rootCauseAnalysis: { type: Type.STRING },
            responseTimeline: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendationsForVessel: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            signedBy: { type: Type.STRING }
          },
          required: ["executiveSummary", "rootCauseAnalysis", "responseTimeline", "recommendationsForVessel", "signedBy"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text.trim());
      res.json({ ...data, simulated: false });
    } else {
      throw new Error("Empty report response");
    }
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate incident report", message: error.message });
  }
});

// Configure Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BeaconMesh Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
