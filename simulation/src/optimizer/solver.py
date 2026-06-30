import math
from typing import List, Dict, Any
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from .costs import WeatherCostModel

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Radius of the Earth in km
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

class RescueOptimizer:
    def __init__(self, weather_data: Dict[str, Any]):
        self.cost_model = WeatherCostModel(
            wave_height=weather_data.get("waveHeight", 0.0),
            wind_speed=weather_data.get("windSpeed", 0.0),
            wind_direction=weather_data.get("windDirection", "N"),
            visibility=weather_data.get("visibility", 10.0)
        )

    def optimize(self, sos_coords: Dict[str, float], responders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Selects the optimal responder and route using Google OR-Tools.
        """
        if not responders:
            return {"error": "No available responders."}

        # 1. Filter out responders that cannot travel (e.g. speed <= 0)
        valid_responders = []
        for r in responders:
            base_speed = float(r.get("speed_knots", 20.0))
            if base_speed <= 0:
                continue
            valid_responders.append(r)

        if not valid_responders:
            return {"error": "No valid responders with positive speeds."}

        multiplier = self.cost_model.get_travel_time_multiplier()
        
        # If weather is completely blocked (multiplier is infinity)
        if multiplier == float('inf'):
            return {
                "error": "Rescue operations are currently blocked due to extreme weather conditions.",
                "blocked": True
            }

        # 2. Build cost matrix for travel times (in minutes)
        num_responders = len(valid_responders)
        num_nodes = num_responders + 1  # Responders plus SOS target (at index num_responders)
        sos_idx = num_responders

        # Coordinates lookup
        coords = []
        for r in valid_responders:
            coords.append((r["latitude"], r["longitude"]))
        coords.append((sos_coords["latitude"], sos_coords["longitude"]))

        # Calculate travel time matrix (in minutes * 100 to convert to integers for OR-Tools)
        # travel_time = distance_km / (effective_speed_km_h) * 60
        # effective_speed_km_h = (speed_knots / multiplier) * 1.852
        time_matrix = []
        for i in range(num_nodes):
            row = []
            for j in range(num_nodes):
                if i == j:
                    row.append(0)
                elif i < num_responders:
                    # Traveler is responder i
                    r = valid_responders[i]
                    base_speed = float(r.get("speed_knots", 20.0))
                    effective_speed_knots = base_speed / multiplier
                    effective_speed_kmh = effective_speed_knots * 1.852
                    
                    dist = haversine_distance(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
                    travel_time_min = (dist / effective_speed_kmh) * 60.0
                    # Convert to integer for OR-Tools (representing centiminutes)
                    row.append(int(round(travel_time_min * 100)))
                else:
                    # Node i is SOS. Travel time from SOS is not relevant for the forward paths, set as 0
                    row.append(0)
            time_matrix.append(row)

        # 3. Formulate OR-Tools Routing Model
        # Vehicle starts at its responder index and ends at the SOS index
        starts = list(range(num_responders))
        ends = [sos_idx] * num_responders

        manager = pywrapcp.RoutingIndexManager(num_nodes, num_responders, starts, ends)
        routing = pywrapcp.RoutingModel(manager)

        # Create and register transit callback
        def time_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return time_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(time_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Add time dimension to track ETAs
        routing.AddDimension(
            transit_callback_index,
            0,  # no slack
            1000000,  # max travel time
            True,  # start cumul to zero
            "Time"
        )

        # Solve
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            return {"error": "Failed to find an optimal rescue route."}

        # 4. Parse the optimal solution
        best_responder_idx = -1
        best_time_min = float('inf')
        
        time_dimension = routing.GetDimensionOrDie("Time")

        for vehicle_id in range(num_responders):
            end_index = routing.End(vehicle_id)
            arrival_time_centiminutes = solution.Value(time_dimension.CumulVar(end_index))
            arrival_time_min = arrival_time_centiminutes / 100.0
            
            if arrival_time_min < best_time_min:
                best_time_min = arrival_time_min
                best_responder_idx = vehicle_id

        if best_responder_idx == -1:
            return {"error": "No valid route found."}

        selected_responder = valid_responders[best_responder_idx]
        
        # Calculate intermediate path points (just start and end for straight line route)
        route_points = [
            {"latitude": selected_responder["latitude"], "longitude": selected_responder["longitude"]},
            {"latitude": sos_coords["latitude"], "longitude": sos_coords["longitude"]}
        ]

        # Calculate exact distance
        distance_km = haversine_distance(
            selected_responder["latitude"], selected_responder["longitude"],
            sos_coords["latitude"], sos_coords["longitude"]
        )

        return {
            "vessel_id": selected_responder["id"],
            "vessel_name": selected_responder["name"],
            "eta_minutes": round(best_time_min, 1),
            "distance_km": round(distance_km, 2),
            "route": route_points,
            "weather_multiplier": round(multiplier, 2)
        }
