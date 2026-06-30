import time
import math
import uuid
from typing import Dict, Any, List, Set

class Packet:
    def __init__(
        self,
        origin_id: str,
        payload: dict,
        is_emergency: bool = False,
        ttl_ticks: int = 120, # How many simulation steps to live
        message_id: str = None
    ):
        self.message_id = message_id or str(uuid.uuid4())
        self.origin_id = origin_id
        self.timestamp = time.time()
        self.payload = payload
        self.is_emergency = is_emergency
        self.ttl = ttl_ticks
        self.hops = 0
        self.route = [origin_id]

    def to_dict(self) -> dict:
        return {
            "message_id": self.message_id,
            "origin_id": self.origin_id,
            "timestamp": self.timestamp,
            "payload": self.payload,
            "is_emergency": self.is_emergency,
            "ttl": self.ttl,
            "hops": self.hops,
            "route": self.route
        }

class VesselNode:
    def __init__(
        self,
        vessel_id: str,
        name: str,
        vessel_type: str, # FISHING, RESCUE, BASE_STATION
        latitude: float,
        longitude: float,
        speed_knots: float = 0.0,
        heading_degrees: float = 0.0,
        battery_level: float = 100.0,
        movement_pattern: str = "stationary", # stationary, wander, patrol
        waypoints: List[Dict[str, float]] = None
    ):
        self.vessel_id = vessel_id
        self.name = name
        self.vessel_type = vessel_type
        self.latitude = latitude
        self.longitude = longitude
        self.speed_knots = speed_knots
        self.heading_degrees = heading_degrees
        self.battery_level = battery_level
        self.movement_pattern = movement_pattern
        self.waypoints = waypoints or []
        self.current_waypoint_idx = 0
        
        # DTN Epidemic buffer variables
        self.buffer: Dict[str, Packet] = {}
        self.acknowledged_ids: Set[str] = set()
        self.delivered_signals: Dict[str, Packet] = {}
        self.is_distress = False

    def update_position(self, delta_time_hours: float, random_seed: int = None):
        """
        Updates the position of the vessel based on its speed, heading, and movement pattern.
        """
        if self.vessel_type == "BASE_STATION" or self.movement_pattern == "stationary":
            self.speed_knots = 0.0
            return

        # Handle movement patterns
        import numpy as np
        rng = np.random.default_rng(random_seed)

        if self.movement_pattern == "wander":
            # Perturb heading slightly
            self.heading_degrees = (self.heading_degrees + rng.normal(0, 15)) % 360
            # Keep speed floating around typical fishing speeds (4 - 10 knots)
            self.speed_knots = max(2.0, min(12.0, self.speed_knots + rng.normal(0, 0.5)))
            
        elif self.movement_pattern == "patrol" and self.waypoints:
            target = self.waypoints[self.current_waypoint_idx]
            dy = target["latitude"] - self.latitude
            dx = (target["longitude"] - self.longitude) * math.cos(math.radians(self.latitude))
            
            distance = math.sqrt(dx*dx + dy*dy) * 111.0 # approx distance in km
            
            if distance < 0.5: # reached waypoint, cycle next
                self.current_waypoint_idx = (self.current_waypoint_idx + 1) % len(self.waypoints)
                target = self.waypoints[self.current_waypoint_idx]
                dy = target["latitude"] - self.latitude
                dx = (target["longitude"] - self.longitude) * math.cos(math.radians(self.latitude))
            
            # calculate angle
            angle_rad = math.atan2(dx, dy)
            self.heading_degrees = math.degrees(angle_rad) % 360
            # Search & Rescue vessels cruise fast (15 - 25 knots)
            if self.speed_knots == 0:
                self.speed_knots = 20.0

        # Calculate distance traveled
        # 1 knot = 1.852 km/h
        distance_km = self.speed_knots * 1.852 * delta_time_hours
        
        # Convert distance to delta lat/lon
        # 1 degree lat = 111.12 km
        delta_lat = (distance_km * math.cos(math.radians(self.heading_degrees))) / 111.12
        delta_lon = ((distance_km * math.sin(math.radians(self.heading_degrees))) / 
                     (111.12 * math.cos(math.radians(self.latitude))))
        
        self.latitude += delta_lat
        self.longitude += delta_lon
        
        # Decrement battery slowly if moving, base station stays constant
        if self.vessel_type != "BASE_STATION":
            self.battery_level = max(0.0, self.battery_level - (0.01 * distance_km))

    def tick_ttl(self):
        """
        Decrements TTL of all packets in the buffer and removes expired ones.
        """
        expired = []
        for msg_id, packet in self.buffer.items():
            packet.ttl -= 1
            if packet.ttl <= 0:
                expired.append(msg_id)
        for msg_id in expired:
            del self.buffer[msg_id]

    def trigger_sos(self, description: str):
        """
        Sets node to distress and injects an SOS packet into its own buffer.
        """
        self.is_distress = True
        payload = {
            "vessel_id": self.vessel_id,
            "vessel_name": self.name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "severity": 5,
            "description": description
        }
        # Emergency packets have long TTL (e.g. 1000 steps)
        sos_packet = Packet(
            origin_id=self.vessel_id,
            payload=payload,
            is_emergency=True,
            ttl_ticks=1000
        )
        self.buffer[sos_packet.message_id] = sos_packet
        return sos_packet.message_id

    def sync_with_peer(self, peer: 'VesselNode'):
        """
        Exchanges packets and acknowledgment lists between self and peer (Epidemic Routing).
        """
        # 1. Merge vaccination lists (acknowledged IDs) to clear buffers
        merged_acks = self.acknowledged_ids.union(peer.acknowledged_ids)
        self.acknowledged_ids = merged_acks
        peer.acknowledged_ids = merged_acks
        
        # Clean buffers with merged ACKs
        self._prune_buffer()
        peer._prune_buffer()
        
        # 2. Exchange packets from self to peer
        self._replicate_to(peer)
        
        # 3. Exchange packets from peer to self
        peer._replicate_to(self)

    def _replicate_to(self, receiver: 'VesselNode'):
        """
        Sends packets in self buffer to receiver buffer if receiver does not have them.
        """
        for msg_id, packet in list(self.buffer.items()):
            if msg_id not in receiver.buffer and msg_id not in receiver.acknowledged_ids:
                # Create a replica packet
                replica = Packet(
                    origin_id=packet.origin_id,
                    payload=packet.payload,
                    is_emergency=packet.is_emergency,
                    ttl_ticks=packet.ttl,
                    message_id=packet.message_id
                )
                replica.hops = packet.hops + 1
                replica.route = list(packet.route) + [receiver.vessel_id]
                
                # If receiver is base station, mark as delivered and vaccinate
                if receiver.vessel_type == "BASE_STATION":
                    receiver.acknowledged_ids.add(msg_id)
                    receiver.delivered_signals[msg_id] = replica
                else:
                    receiver.buffer[msg_id] = replica

    def _prune_buffer(self):
        """
        Removes any packet from buffer that has been vaccine-acknowledged.
        """
        for ack_id in self.acknowledged_ids:
            if ack_id in self.buffer:
                del self.buffer[ack_id]

    def to_dict(self) -> dict:
        return {
            "vessel_id": self.vessel_id,
            "name": self.name,
            "vessel_type": self.vessel_type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "speed_knots": round(self.speed_knots, 2),
            "heading_degrees": round(self.heading_degrees, 2),
            "battery_level": round(self.battery_level, 1),
            "movement_pattern": self.movement_pattern,
            "is_distress": self.is_distress,
            "buffer_size": len(self.buffer),
            "buffer_message_ids": list(self.buffer.keys())
        }
