import pytest
from src.simulator.radio import haversine_distance, RadioModel
from src.simulator.vessel import VesselNode, Packet
from src.simulator.engine import SimulationEngine

def test_haversine_distance():
    # Boston (42.3601, -71.0589) to Provincetown (42.0584, -70.1787) is ~79.9 km
    dist = haversine_distance(42.3601, -71.0589, 42.0584, -70.1787)
    assert abs(dist - 79.9) < 0.5
    
    # Same point distance should be zero
    assert haversine_distance(42.0, -70.0, 42.0, -70.0) == 0.0

def test_radio_model_propagation():
    rm = RadioModel(shadowing_std_db=0.0) # Disable randomness for deterministic test
    
    # RSSI at 1 km should equal transmit power + gains - pl_reference
    # 14 + 2.15 + 2.15 - 92 = -73.7 dBm
    rssi_1km = rm.compute_rssi(1.0)
    assert abs(rssi_1km - (-73.7)) < 0.1
    
    # RSSI should decrease with distance
    rssi_5km = rm.compute_rssi(5.0)
    assert rssi_5km < rssi_1km
    
    # Test link success at close vs far distances
    # A distance of 0.1km is well within sensitivity (-125dBm)
    assert rm.is_link_successful(42.0, -70.0, 42.001, -70.001, random_seed=42) is True
    # A distance of 500km is way beyond range
    assert rm.is_link_successful(42.0, -70.0, 45.0, -75.0, random_seed=42) is False

def test_vessel_movement():
    # 1. Stationary
    v1 = VesselNode("v1", "Stationary Node", "BASE_STATION", 42.0, -70.0)
    v1.update_position(1.0)
    assert v1.latitude == 42.0
    assert v1.longitude == -70.0

    # 2. Wander
    v2 = VesselNode("v2", "Fishing Boat", "FISHING", 42.0, -70.0, speed_knots=8.0, heading_degrees=90.0, movement_pattern="wander")
    v2.update_position(0.5, random_seed=42)
    # Check that it moved
    assert v2.latitude != 42.0 or v2.longitude != -70.0
    assert v2.battery_level < 100.0

    # 3. Patrol
    waypoints = [
        {"latitude": 42.1, "longitude": -70.0},
        {"latitude": 42.2, "longitude": -70.0}
    ]
    v3 = VesselNode("v3", "Rescue Boat", "RESCUE", 42.0, -70.0, speed_knots=20.0, heading_degrees=0.0, movement_pattern="patrol", waypoints=waypoints)
    v3.update_position(0.1) # Move towards waypoint 1 (42.1, -70.0)
    # Heading should target the waypoint (northward = ~0 degrees)
    assert abs(v3.heading_degrees - 0.0) < 1.0
    assert v3.latitude > 42.0

def test_dtn_epidemic_routing():
    # Configure radio model to guarantee connections for distances under 10 km
    # and fail completely above 12 km
    rm = RadioModel(sensitivity_dbm=-120.0, pl_reference_1km=90.0, path_loss_exponent=4.0, shadowing_std_db=0.0)
    engine = SimulationEngine(radio_model=rm)
    
    # Vessel A (FISHING) - holds an SOS. Location: (42.0, -70.0)
    node_a = VesselNode("node_a", "Boat A", "FISHING", 42.0, -70.0, movement_pattern="stationary")
    
    # Vessel B (FISHING) - intermediate relay. Location: (42.05, -70.0) ~ approx 5.5 km from A
    node_b = VesselNode("node_b", "Boat B", "FISHING", 42.05, -70.0, movement_pattern="stationary")
    
    # Base Station C (BASE_STATION) - gateway. Location: (42.10, -70.0) ~ approx 5.5 km from B, 11 km from A
    node_c = VesselNode("node_c", "Base C", "BASE_STATION", 42.10, -70.0)
    
    engine.add_vessel(node_a)
    engine.add_vessel(node_b)
    engine.add_vessel(node_c)
    
    # Check initial range dynamics:
    # A to B: ~5.5 km (in range)
    # B to C: ~5.5 km (in range)
    # A to C: ~11 km (let's verify the link success logic behaves)
    assert rm.is_link_successful(node_a.latitude, node_a.longitude, node_b.latitude, node_b.longitude, random_seed=42) is True
    assert rm.is_link_successful(node_b.latitude, node_b.longitude, node_c.latitude, node_c.longitude, random_seed=42) is True
    # A to C link should fail or have very low chance
    # Let's adjust node A coordinates slightly further south to ensure it's out of range of C (15 km)
    node_a.latitude = 41.95 # ~16.6 km to C, ~11 km to B
    assert rm.is_link_successful(node_a.latitude, node_a.longitude, node_c.latitude, node_c.longitude, random_seed=42) is False

    # Trigger SOS on A
    msg_id = engine.trigger_sos("node_a", "Leaking hull")
    assert msg_id in node_a.buffer
    assert len(node_b.buffer) == 0
    assert len(engine.delivered_packets) == 0
    
    # Tick 1: A and B in range -> replicates to B. B and C in range -> replicates to C
    engine.tick(delta_time_hours=0.0, random_seed=42) # delta_time_hours = 0 to avoid drift during routing test
    
    # Node B should have received the packet
    assert msg_id in node_b.buffer or msg_id in node_b.acknowledged_ids
    # Node C (Base Station) should have received it and moved it to delivered
    assert msg_id in engine.delivered_packets
    
    # Verify packet metadata
    packet = engine.delivered_packets[msg_id]
    assert packet.origin_id == "node_a"
    assert packet.payload["description"] == "Leaking hull"
    assert packet.is_emergency is True
    # Replicated from A -> B -> C (hops = 2)
    assert packet.hops == 2
    assert packet.route == ["node_a", "node_b", "node_c"]
