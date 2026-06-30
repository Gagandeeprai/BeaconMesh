import math
import numpy as np

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the great-circle distance between two points on the Earth's surface
    using the Haversine formula. Returns distance in kilometers.
    """
    # Earth radius in kilometers
    R = 6371.0
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return R * c

class RadioModel:
    def __init__(
        self,
        tx_power_dbm: float = 14.0,       # Typical LoRa transmit power
        tx_gain_dbi: float = 2.15,         # Standard dipole antenna
        rx_gain_dbi: float = 2.15,         # Standard dipole antenna
        pl_reference_1km: float = 92.0,    # FSPL at 1km for ~915MHz
        path_loss_exponent: float = 2.5,   # Marine environment path loss coefficient
        shadowing_std_db: float = 3.0,     # Log-normal shadowing standard deviation
        sensitivity_dbm: float = -125.0,   # Typical LoRa receiver sensitivity
        slope_factor: float = 0.5          # Sensitivity curve slope factor
    ):
        self.tx_power_dbm = tx_power_dbm
        self.tx_gain_dbi = tx_gain_dbi
        self.rx_gain_dbi = rx_gain_dbi
        self.pl_reference_1km = pl_reference_1km
        self.path_loss_exponent = path_loss_exponent
        self.shadowing_std_db = shadowing_std_db
        self.sensitivity_dbm = sensitivity_dbm
        self.slope_factor = slope_factor

    def compute_rssi(self, distance_km: float, random_seed: int = None) -> float:
        """
        Calculates RSSI in dBm using the log-distance path loss model with shadowing.
        """
        if distance_km <= 0:
            return self.tx_power_dbm + self.tx_gain_dbi + self.rx_gain_dbi
        
        # Path Loss calculations
        path_loss = (self.pl_reference_1km + 
                     10.0 * self.path_loss_exponent * math.log10(distance_km))
        
        # Shadowing effect (normally distributed)
        rng = np.random.default_rng(random_seed)
        shadowing = rng.normal(0, self.shadowing_std_db)
        
        rssi = self.tx_power_dbm + self.tx_gain_dbi + self.rx_gain_dbi - path_loss + shadowing
        return rssi

    def is_link_successful(self, lat1: float, lon1: float, lat2: float, lon2: float, random_seed: int = None) -> bool:
        """
        Computes link success probability based on RSSI and receiver sensitivity,
        returning True if packet is successfully transmitted.
        """
        dist = haversine_distance(lat1, lon1, lat2, lon2)
        rssi = self.compute_rssi(dist, random_seed)
        
        # Calculate decoding success probability using a sigmoid curve
        # P(success) = 1 / (1 + exp(-k * (RSSI - Sensitivity)))
        margin = rssi - self.sensitivity_dbm
        prob = 1.0 / (1.0 + math.exp(-self.slope_factor * margin))
        
        rng = np.random.default_rng(random_seed)
        return rng.random() < prob
