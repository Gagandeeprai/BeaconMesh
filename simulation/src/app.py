from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from src.simulator.vessel import VesselNode
from src.simulator.radio import RadioModel
from src.simulator.engine import SimulationEngine

app = FastAPI(title="BeaconMesh Simulation API", version="1.0.0")

# Global simulation engine instance
engine = SimulationEngine()

# Pydantic schemas
class Waypoint(BaseModel):
    latitude: float
    longitude: float

class VesselInitSchema(BaseModel):
    vessel_id: str
    name: str
    vessel_type: str = Field(..., description="FISHING, RESCUE, or BASE_STATION")
    latitude: float
    longitude: float
    speed_knots: float = 0.0
    heading_degrees: float = 0.0
    battery_level: float = 100.0
    movement_pattern: str = "stationary" # stationary, wander, patrol
    waypoints: Optional[List[Waypoint]] = None

class RadioConfigSchema(BaseModel):
    tx_power_dbm: float = 14.0
    tx_gain_dbi: float = 2.15
    rx_gain_dbi: float = 2.15
    pl_reference_1km: float = 92.0
    path_loss_exponent: float = 2.5
    shadowing_std_db: float = 3.0
    sensitivity_dbm: float = -125.0
    slope_factor: float = 0.5

class SimInitRequest(BaseModel):
    vessels: List[VesselInitSchema]
    radio_config: Optional[RadioConfigSchema] = None

class SimTickRequest(BaseModel):
    delta_time_hours: float = 0.05
    steps: int = 1

class EmergencyTriggerRequest(BaseModel):
    vessel_id: str
    description: str

class OptimizeRescueRequest(BaseModel):
    sos_coords: Dict[str, float]
    responders: List[Dict[str, Any]]
    weather: Dict[str, Any]

# API Routes
@app.get("/health")
def health():
    return {"status": "healthy", "service": "simulation-engine"}

@app.post("/api/v1/optimize/rescue")
def optimize_rescue(req: OptimizeRescueRequest):
    try:
        from src.optimizer.solver import RescueOptimizer
        optimizer = RescueOptimizer(req.weather)
        result = optimizer.optimize(req.sos_coords, req.responders)
        if "error" in result:
            if result.get("blocked"):
                return result
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizer error: {str(e)}")

@app.post("/api/v1/sim/init")
def init_simulation(req: SimInitRequest):
    try:
        # Set up radio model if config provided
        if req.radio_config:
            rm = RadioModel(
                tx_power_dbm=req.radio_config.tx_power_dbm,
                tx_gain_dbi=req.radio_config.tx_gain_dbi,
                rx_gain_dbi=req.radio_config.rx_gain_dbi,
                pl_reference_1km=req.radio_config.pl_reference_1km,
                path_loss_exponent=req.radio_config.path_loss_exponent,
                shadowing_std_db=req.radio_config.shadowing_std_db,
                sensitivity_dbm=req.radio_config.sensitivity_dbm,
                slope_factor=req.radio_config.slope_factor
            )
            engine.radio_model = rm
        else:
            engine.radio_model = RadioModel()
            
        # Reset and load vessels
        engine.reset()
        
        for v in req.vessels:
            wps = []
            if v.waypoints:
                wps = [{"latitude": wp.latitude, "longitude": wp.longitude} for wp in v.waypoints]
                
            node = VesselNode(
                vessel_id=v.vessel_id,
                name=v.name,
                vessel_type=v.vessel_type,
                latitude=v.latitude,
                longitude=v.longitude,
                speed_knots=v.speed_knots,
                heading_degrees=v.heading_degrees,
                battery_level=v.battery_level,
                movement_pattern=v.movement_pattern,
                waypoints=wps
            )
            engine.add_vessel(node)
            
        return {
            "status": "INITIALIZED",
            "vessels_loaded": len(engine.vessels),
            "tick_count": engine.tick_count
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to initialize simulation: {str(e)}")

@app.post("/api/v1/sim/tick")
def tick_simulation(req: SimTickRequest):
    try:
        for _ in range(req.steps):
            engine.tick(delta_time_hours=req.delta_time_hours)
            
        return get_simulation_state()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ticking simulation: {str(e)}")

@app.post("/api/v1/sim/emergency")
def trigger_emergency(req: EmergencyTriggerRequest):
    try:
        msg_id = engine.trigger_sos(req.vessel_id, req.description)
        return {
            "status": "SOS_TRIGGERED",
            "vessel_id": req.vessel_id,
            "message_id": msg_id
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error triggering SOS: {str(e)}")

@app.get("/api/v1/sim/state")
def get_simulation_state():
    vessels = [v.to_dict() for v in engine.get_vessels()]
    delivered = [p.to_dict() for p in engine.get_delivered_packets()]
    return {
        "tick_count": engine.tick_count,
        "vessels": vessels,
        "delivered_packets": delivered
    }

@app.post("/api/v1/sim/reset")
def reset_simulation():
    engine.reset()
    return {
        "status": "RESET",
        "tick_count": 0,
        "vessels_loaded": 0
    }
