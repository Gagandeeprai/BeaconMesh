import time
import json
import urllib.request
import urllib.error
import math
import random
import os

API_URL = "http://localhost:8080/api/v1/telemetry"

class SimulatedShip:
    def __init__(self, id, name, v_type, lat, lon, speed, heading):
        self.id = id
        self.name = name
        self.type = v_type
        self.lat = lat
        self.lon = lon
        self.speed = speed
        self.heading = heading

    def update(self):
        # Specific logic for loitering SIM-05
        if self.id == "SIM-05" and self.lat >= 13.16:
            self.speed = 0.5 # Loiter

        # Move forward based on speed (knots to roughly degrees per tick)
        # 1 knot = 1.852 km/h. Let's just do a simple coordinate math for visual movement.
        distance = (self.speed * 0.0001)
        self.lat += distance * math.cos(math.radians(self.heading))
        self.lon += distance * math.sin(math.radians(self.heading))
        
        # Add slight sinusoidal drift to heading only if moving significantly
        if self.speed > 1:
            self.heading += random.uniform(-2, 2)
            if self.heading < 0: self.heading += 360
            if self.heading >= 360: self.heading -= 360

    def to_payload(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "latitude": self.lat,
            "longitude": self.lon,
            "speed": self.speed,
            "waveHeight": 1.5,
            "windSpeed": 12.0,
            "visibility": 10000.0
        }

def get_token():
    auth_url = "http://localhost:8080/api/v1/auth/login"
    payload = json.dumps({"username": "admin", "password": "beacon2026"}).encode('utf-8')
    req = urllib.request.Request(auth_url, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
        return data.get('token')

def get_initial_ships():
    ships = [
        SimulatedShip("SIM-01", "MV Voyager", "Cargo", 12.5, 74.5, 14.0, 45),
        SimulatedShip("SIM-02", "FV Bluefin", "Fishing", 12.47, 73.6, 15.0, 180), # Speed reduced to stagger exit (approx 12s)
        SimulatedShip("SIM-03", "MT Poseidon", "Tanker", 12.8, 74.2, 32.5, 120),
        SimulatedShip("SIM-04", "CG Rescuer", "Rescue", 12.4, 74.6, 42.0, 315),
        SimulatedShip("SIM-05", "FV Seabird", "Fishing", 13.14, 73.7, 10.0, 0), # Starts just outside ZONE-MIL-02, heading North
        SimulatedShip("SIM-06", "MV Horizon", "Cargo", 12.3, 74.9, 36.0, 225),
        SimulatedShip("SIM-07", "FV Yellowfin", "Fishing", 12.7, 74.3, 26.5, 230),
        SimulatedShip("SIM-08", "MT Atlantic", "Tanker", 12.5, 74.6, 31.0, 240),
        SimulatedShip("SIM-09", "CG Sentinel", "Rescue", 13.18, 73.5, 15.0, 90), # Travelling horizontally (East) across ZONE-MIL-02
        SimulatedShip("SIM-10", "FV Albatross", "Fishing", 12.8, 74.7, 27.0, 250),
    ]
    
    # Scale test disabled to focus on the 10 core ships for violation scenarios
        
    return ships

def run_streamer():
    token = get_token()
    if not token:
        print("Failed to get auth token")
        return

    ships = get_initial_ships()

    print(f"Starting telemetry stream to {API_URL}...")
    while True:
        # Check for reset flag
        if os.path.exists("reset.flag"):
            try:
                os.remove("reset.flag")
                print("Reset flag detected. Resetting simulation.")
                ships = get_initial_ships()
            except OSError:
                pass

        # Coast Guard Intercept Logic
        target_ship = None
        for s in ships:
            # Check if any non-rescue ship is loitering inside ZONE-MIL-02
            if s.type != "Rescue" and s.speed < 1.0 and (13.15 <= s.lat <= 13.55) and (73.55 <= s.lon <= 73.95):
                target_ship = s
                break
        
        if target_ship:
            # Find closest Rescue ship
            closest_rescue = None
            min_dist = float('inf')
            for s in ships:
                if s.type == "Rescue":
                    dist = math.hypot(s.lat - target_ship.lat, s.lon - target_ship.lon)
                    if dist < min_dist:
                        min_dist = dist
                        closest_rescue = s
            
            if closest_rescue:
                # Intercept! Set heading towards target
                dy = target_ship.lon - closest_rescue.lon
                dx = target_ship.lat - closest_rescue.lat
                angle = math.degrees(math.atan2(dy, dx))
                if angle < 0: angle += 360
                
                # Update heading and speed
                if min_dist > 0.01:
                    closest_rescue.heading = angle
                    closest_rescue.speed = 40.0
                else:
                    closest_rescue.speed = target_ship.speed # intercept complete, match speed

        for ship in ships:
            ship.update()
            payload = ship.to_payload()
            data = json.dumps(payload).encode('utf-8')
            
            try:
                req = urllib.request.Request(API_URL, data=data, headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {token}'
                })
                with urllib.request.urlopen(req) as response:
                    pass
            except Exception as e:
                print(f"Failed to send telemetry for {ship.id}: {e}")
                
        time.sleep(1)

if __name__ == "__main__":
    run_streamer()
