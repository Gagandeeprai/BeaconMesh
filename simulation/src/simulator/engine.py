from typing import Dict, List, Any
from .vessel import VesselNode, Packet
from .radio import RadioModel

class SimulationEngine:
    def __init__(self, radio_model: RadioModel = None):
        self.vessels: Dict[str, VesselNode] = {}
        self.radio_model = radio_model or RadioModel()
        self.delivered_packets: Dict[str, Packet] = {}
        self.tick_count = 0

    def add_vessel(self, vessel: VesselNode):
        self.vessels[vessel.vessel_id] = vessel

    def remove_vessel(self, vessel_id: str):
        if vessel_id in self.vessels:
            del self.vessels[vessel_id]

    def trigger_sos(self, vessel_id: str, description: str) -> str:
        """
        Triggers emergency SOS on a vessel node and returns the packet's message_id.
        """
        if vessel_id not in self.vessels:
            raise ValueError(f"Vessel with ID {vessel_id} not found in simulation.")
        node = self.vessels[vessel_id]
        msg_id = node.trigger_sos(description)
        return msg_id

    def tick(self, delta_time_hours: float = 0.05, random_seed: int = None):
        """
        Executes a single step in the simulation:
        1. Moves all nodes.
        2. Ticks TTL on all node packets.
        3. Checks pairwise contact links and runs DTN epidemic exchanges.
        4. Captures any packets delivered to base stations.
        """
        self.tick_count += 1
        
        # 1. Move all vessels
        for vessel in self.vessels.values():
            vessel.update_position(delta_time_hours, random_seed)
            
        # 2. Tick TTL on buffers
        for vessel in self.vessels.values():
            vessel.tick_ttl()
            
        # 3. Pairwise contacts check and Epidemic sync
        vessel_ids = list(self.vessels.keys())
        n = len(vessel_ids)
        for i in range(n):
            for j in range(i + 1, n):
                node_a = self.vessels[vessel_ids[i]]
                node_b = self.vessels[vessel_ids[j]]
                
                # Run link probability check
                in_range = self.radio_model.is_link_successful(
                    node_a.latitude, node_a.longitude,
                    node_b.latitude, node_b.longitude,
                    random_seed
                )
                
                if in_range:
                    node_a.sync_with_peer(node_b)
                    
                    # Capture deliveries if either node is a BASE_STATION
                    if node_a.vessel_type == "BASE_STATION":
                        for msg_id, packet in node_a.delivered_signals.items():
                            self.delivered_packets[msg_id] = packet
                                
                    if node_b.vessel_type == "BASE_STATION":
                        for msg_id, packet in node_b.delivered_signals.items():
                            self.delivered_packets[msg_id] = packet

    def get_vessels(self) -> List[VesselNode]:
        return list(self.vessels.values())

    def get_delivered_packets(self) -> List[Packet]:
        return list(self.delivered_packets.values())

    def reset(self):
        self.vessels.clear()
        self.delivered_packets.clear()
        self.tick_count = 0
