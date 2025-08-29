import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import './MapView.css'; // Make sure you have this CSS file for styling

// --- CONFIGURATION CONSTANTS FOR SIMULATION ---
const SIM_TICK_RATE_MS = 100; // Update simulation 10 times per second
const VERTICAL_SPEED_MPS = 2.0; // Meters per second for ascent/descent
const HORIZONTAL_SPEED_MPS = 15.0; // Meters per second for travel
const YAW_RATE_DPS = 30.0; // Degrees per second for turning

// --- LEAFLET MARKER ICON FIX ---
// This code fixes a common issue with default marker icons in React Leaflet.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- TYPE DEFINITIONS ---
interface TelemetryData {
  lat: number;
  lon: number;
  relative_alt: number;
  ground_speed: number;
  vertical_speed: number;
  airspeed: number;
  battery_percentage: number;
  gps_satellites: number;
  // yaw (heading) is handled by a separate state for smoother rotation
  roll: number;
  pitch: number;
  armed: boolean;
  mode: string;
}

interface FlightTarget {
  altitude?: number;
  position?: [number, number];
  isLanding?: boolean;
  isRtl?: boolean;
}

interface UAVMarkerProps {
    position: [number, number];
    heading: number;
    telemetry: TelemetryData;
}

// --- CUSTOM UAV ICON & MARKER ---
const uavIconBase64 = 'data:image/png;base64,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';

const uavIcon = new L.Icon({
    iconUrl: uavIconBase64,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

const UAVMarker: React.FC<UAVMarkerProps> = ({ position, heading, telemetry }) => {
    const markerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
        const marker = markerRef.current;
        if (marker) {
            const iconElement = (marker as any)._icon as HTMLElement;
            if (iconElement) {
                // Keep existing transforms (like translate) and only update the rotation
                const baseTransform = iconElement.style.transform.replace(/ rotate\([^)]+\)/, '');
                iconElement.style.transform = `${baseTransform} rotate(${heading}deg)`;
            }
        }
    }, [position, heading]);

    return (
        <Marker position={position} icon={uavIcon} ref={markerRef}>
            <Popup>
                <b>Vehicle Position</b><br/>
                Mode: {telemetry.mode}<br/>
                Armed: {telemetry.armed ? 'YES' : 'NO'}<br/>
                Alt: {telemetry.relative_alt.toFixed(1)}m<br/>
                Heading: {heading.toFixed(0)}°
            </Popup>
        </Marker>
    );
};


// --- HELPER FUNCTIONS & COMPONENTS ---

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (deg: number) => deg * Math.PI / 180;
    const toDegrees = (rad: number) => rad * 180 / Math.PI;
    const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
              Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
    const bearing = toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-360
}

function moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(current - target) <= maxDelta) {
        return target;
    }
    return current + Math.sign(target - current) * maxDelta;
}

// MapUpdater component to smoothly fly to the new position
const MapUpdater: React.FC<{ position: [number, number] }> = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        // Only pan the map if the drone's position is not the default initial one
        if (position[0] !== 28.3639 || position[1] !== 75.5880) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

// --- MAIN MAPVIEW COMPONENT ---
const MapView: React.FC = () => {
    const initialPosition: [number, number] = [28.3639, 75.5880]; // Pilani, India
    
    // Simulation mode state
    const [simulationMode, setSimulationMode] = useState(false);
    const [simulationActive, setSimulationActive] = useState(false);
    
    const [telemetry, setTelemetry] = useState<TelemetryData>({
        lat: initialPosition[0],
        lon: initialPosition[1],
        relative_alt: 0.0,
        ground_speed: 0,
        vertical_speed: 0,
        airspeed: 0,
        battery_percentage: 100,
        gps_satellites: 15,
        roll: 0,
        pitch: 0,
        armed: false,
        mode: 'STABILIZE',
    });

    // Base telemetry for simulation (shows zero values initially)
    const getDisplayTelemetry = () => {
        if (simulationMode && !simulationActive) {
            return {
                ...telemetry,
                ground_speed: 0,
                vertical_speed: 0,
                airspeed: 0,
                roll: 0,
                pitch: 0,
            };
        }
        return telemetry;
    };

    const [heading, setHeading] = useState(0);
    const [path, setPath] = useState<[number, number][]>([initialPosition]);
    const [target, setTarget] = useState<FlightTarget | null>(null);
    const [homePosition, setHomePosition] = useState<[number, number]>(initialPosition);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');

    // MODIFICATION: Add state to control path tracing and a ref for the timer
    const [isTracingPath, setIsTracingPath] = useState(false);
    const pathTraceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // MODIFICATION: Add a useEffect to clean up the timer on component unmount
    useEffect(() => {
        return () => {
            if (pathTraceTimerRef.current) {
                clearTimeout(pathTraceTimerRef.current);
            }
        };
    }, []);

    // The main simulation loop
    useEffect(() => {
        const simInterval = setInterval(() => {
            if (connectionStatus !== 'Connected' || !simulationActive) return;

            setTelemetry(currentTelemetry => {
                let next = { ...currentTelemetry };
                let newHeading = heading;

                // 1. Vertical Movement (Altitude)
                if (target?.altitude !== undefined) {
                    const altDiff = target.altitude - next.relative_alt;
                    if (Math.abs(altDiff) < 0.1) {
                        next.relative_alt = target.altitude;
                        next.vertical_speed = 0;
                        if (target.isLanding) { // If we were landing and reached the ground
                             next.armed = false;
                             next.mode = 'STABILIZE';
                             setTarget(null);
                             setSimulationActive(false);
                        } else if (target.isRtl && !target.position) { // If RTL reached home alt, start landing
                             setTarget(t => ({...t, isLanding: true, altitude: 0}));
                        } else if (!target.position) { // If just taking off, switch to guided
                             next.mode = 'GUIDED';
                        }
                    } else {
                        const v_speed = Math.sign(altDiff) * VERTICAL_SPEED_MPS;
                        next.relative_alt += v_speed * (SIM_TICK_RATE_MS / 1000);
                        next.vertical_speed = v_speed;
                    }
                }

                // 2. Horizontal Movement (Lat/Lon)
                if (target?.position) {
                    const currentPos = L.latLng(next.lat, next.lon);
                    const targetPos = L.latLng(target.position[0], target.position[1]);
                    const distanceToTarget = currentPos.distanceTo(targetPos);

                    if (distanceToTarget < 2) { // Reached destination
                        next.ground_speed = 0;
                        next.airspeed = 0;
                        if (target.isRtl) { // If RTL flight is done, set altitude target to land
                             setTarget(t => ({...t, position: undefined, isLanding: true, altitude: 0}));
                        } else {
                             setTarget(t => ({...t, position: undefined}));
                        }
                    } else {
                        // A) Update Heading
                        const targetBearing = calculateBearing(next.lat, next.lon, target.position[0], target.position[1]);
                        newHeading = moveTowards(heading, targetBearing, YAW_RATE_DPS * (SIM_TICK_RATE_MS / 1000));
                        
                        // B) Move forward if facing the right direction
                        const headingDiff = Math.abs(heading - targetBearing);
                        if (headingDiff < 10 || headingDiff > 350) { // Allow movement if roughly facing target
                            const distanceToMove = HORIZONTAL_SPEED_MPS * (SIM_TICK_RATE_MS / 1000);
                            const bearingRad = newHeading * Math.PI / 180;
                            const R = 6378137; // Earth's radius in meters
                            const dLat = (distanceToMove * Math.cos(bearingRad)) / R;
                            const dLon = (distanceToMove * Math.sin(bearingRad)) / (R * Math.cos(next.lat * Math.PI / 180));
                            
                            next.lat += dLat * 180 / Math.PI;
                            next.lon += dLon * 180 / Math.PI;

                            next.ground_speed = HORIZONTAL_SPEED_MPS;
                            next.airspeed = HORIZONTAL_SPEED_MPS + 2; // Simulate wind
                        } else {
                            next.ground_speed = 0;
                            next.airspeed = 2; // Still has airspeed
                        }
                    }
                }
                
                setHeading(newHeading);
                return next;
            });

            // MODIFICATION: Only update the path if tracing is active
            if (isTracingPath) {
                setPath(currentPath => [...currentPath, [telemetry.lat, telemetry.lon]]);
            }

        }, SIM_TICK_RATE_MS);

        return () => clearInterval(simInterval);
        // MODIFICATION: Add isTracingPath to dependency array
    }, [target, connectionStatus, heading, telemetry.lat, telemetry.lon, simulationActive, isTracingPath]);

    // --- BUTTON HANDLERS ---
    const handleConnectionToggle = () => {
        if (connectionStatus === 'Connected') {
            // MODIFICATION: Stop tracing and clear timer on disconnect
            if (pathTraceTimerRef.current) clearTimeout(pathTraceTimerRef.current);
            setIsTracingPath(false);
            setConnectionStatus('Disconnected');
            setSimulationMode(false);
            setSimulationActive(false);
        } else {
            setConnectionStatus('Connected');
        }
    };

    const handleSimulationToggle = () => {
        if (!simulationMode) {
            setSimulationMode(true);
            setSimulationActive(false); // Don't start movement immediately
            // Reset telemetry to show zero values
            setTelemetry(prev => ({
                ...prev,
                ground_speed: 0,
                vertical_speed: 0,
                airspeed: 0,
                roll: 0,
                pitch: 0,
            }));
        } else {
            setSimulationMode(false);
            setSimulationActive(false);
        }
    };

    const handleArm = () => {
        if (connectionStatus !== 'Connected') return alert('Not connected!');
        if (telemetry.relative_alt > 0.5) return alert('Cannot arm/disarm while in the air!');
        setTelemetry(t => ({...t, armed: !t.armed}));
    };

    const handleTakeoff = () => {
        if (connectionStatus !== 'Connected' || !telemetry.armed) return alert('Vehicle must be connected and armed!');
        const altStr = prompt("Enter Takeoff Altitude (meters):", "10");
        if (altStr === null) return;
        const altitude = parseFloat(altStr);
        if (isNaN(altitude) || altitude <= 0) return alert("Invalid altitude.");

        // MODIFICATION: Reset path and start 10-second timer for tracing
        if (pathTraceTimerRef.current) clearTimeout(pathTraceTimerRef.current);
        setPath([[telemetry.lat, telemetry.lon]]);
        setIsTracingPath(false);
        pathTraceTimerRef.current = setTimeout(() => {
            setIsTracingPath(true);
        }, 10000); // 10 seconds
        
        setHomePosition([telemetry.lat, telemetry.lon]); // Set home
        setTelemetry(t => ({...t, mode: 'TAKEOFF'}));
        setTarget({ altitude });
        
        // Activate simulation if in simulation mode
        if (simulationMode) {
            setSimulationActive(true);
        }
    };

    const handleLand = () => {
        if (connectionStatus !== 'Connected' || telemetry.mode === 'STABILIZE') return alert('Not flying!');
        // MODIFICATION: Stop tracing and clear timer on land
        if (pathTraceTimerRef.current) clearTimeout(pathTraceTimerRef.current);
        setIsTracingPath(false);

        setTelemetry(t => ({...t, mode: 'LAND'}));
        setTarget({ altitude: 0, isLanding: true, position: undefined });
        
        // Activate simulation if in simulation mode
        if (simulationMode) {
            setSimulationActive(true);
        }
    };

    const handleReturn = () => {
        if (connectionStatus !== 'Connected' || telemetry.mode === 'STABILIZE') return alert('Not flying!');

        // MODIFICATION: Reset path for return leg and start 10-second timer for tracing
        if (pathTraceTimerRef.current) clearTimeout(pathTraceTimerRef.current);
        setPath([[telemetry.lat, telemetry.lon]]);
        setIsTracingPath(false);
        pathTraceTimerRef.current = setTimeout(() => {
            setIsTracingPath(true);
        }, 10000); // 10 seconds

        setTelemetry(t => ({...t, mode: 'RTL'}));
        setTarget({ altitude: 30, position: homePosition, isRtl: true }); // Fly home at 30m
        
        // Activate simulation if in simulation mode
        if (simulationMode) {
            setSimulationActive(true);
        }
    };
    
    const handleGoto = () => {
        if (connectionStatus !== 'Connected') return alert('Vehicle must be connected!');
        
        // In simulation mode, allow GO TO even when not flying (for initial movement)
        if (!simulationMode && telemetry.relative_alt < 1) {
            return alert('Vehicle must be flying to use Go To!');
        }
        
        const posStr = prompt("Enter Target Latitude,Longitude:", `${initialPosition[0]+0.001},${initialPosition[1]+0.001}`);
        if (!posStr) return;
        const parts = posStr.split(',').map(p => parseFloat(p.trim()));
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return alert('Invalid format. Use "lat,lon".');
        
        // MODIFICATION: Reset path and start 10-second timer for tracing
        if (pathTraceTimerRef.current) clearTimeout(pathTraceTimerRef.current);
        setPath([[telemetry.lat, telemetry.lon]]);
        setIsTracingPath(false);
        pathTraceTimerRef.current = setTimeout(() => {
            setIsTracingPath(true);
        }, 10000); // 10 seconds

        setTelemetry(t => ({...t, mode: 'GUIDED'}));
        setTarget(t => ({...t, position: [parts[0], parts[1]]}));
        
        // Activate simulation if in simulation mode
        if (simulationMode) {
            setSimulationActive(true);
        }
    };

    const position: [number, number] = [telemetry.lat, telemetry.lon];
    const displayTelemetry = getDisplayTelemetry();

    // --- BUTTON STATUS LOGIC ---
    const isConnected = connectionStatus === 'Connected';
    const isAirborne = telemetry.relative_alt > 0.5;
    
    const armButton = { disabled: !isConnected || isAirborne, className: `nav-button ${telemetry.armed ? 'armed' : 'disarmed'}`, text: telemetry.armed ? 'DISARM' : 'ARM' };
    const takeoffButton = { disabled: !isConnected || !telemetry.armed || isAirborne, className: `nav-button ${!telemetry.armed || isAirborne ? 'disabled' : ''}`, text: 'TAKEOFF' };
    
    // In simulation mode, GO TO should be enabled even when not airborne
    const gotoButton = { 
        disabled: !isConnected || (!simulationMode && !isAirborne), 
        className: `nav-button ${(!isConnected || (!simulationMode && !isAirborne)) ? 'disabled' : ''}`, 
        text: 'GO TO' 
    };
    
    const returnButton = { disabled: !isConnected || !isAirborne, className: 'nav-button', text: 'RETURN' };
    const landButton = { disabled: !isConnected || !isAirborne, className: 'nav-button', text: 'LAND' };

    return (
        <div className="map-container">
            <MapContainer center={position} zoom={18} className="leaflet-map" zoomControl={false}>
                <MapUpdater position={position} />
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                />
                {path.length > 1 && (
                    <Polyline pathOptions={{ color: 'cyan', weight: 3 }} positions={path} />
                )}
                <UAVMarker position={position} heading={heading} telemetry={displayTelemetry} />
            </MapContainer>

            <button
                className={`connect-button ${connectionStatus.toLowerCase()}`}
                onClick={handleConnectionToggle}
            >
                {connectionStatus === 'Connected' ? `DISCONNECT` : `CONNECT`}
            </button>

            {/* Simulation Mode Toggle */}
            {isConnected && (
                <button
                    className={`simulation-button ${simulationMode ? 'active' : ''}`}
                    onClick={handleSimulationToggle}
                    style={{
                        position: 'absolute',
                        top: '60px',
                        left: '20px',
                        padding: '10px 20px',
                        backgroundColor: simulationMode ? '#ff6b35' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        zIndex: 1000
                    }}
                >
                    {simulationMode ? 'EXIT SIMULATION' : 'SIMULATION MODE'}
                </button>
            )}

            <div className="side-nav">
                <button className={armButton.className} onClick={handleArm} disabled={armButton.disabled}>
                    <span className="nav-symbol">🔒</span><span className="nav-text">{armButton.text}</span>
                </button>
                <button className={takeoffButton.className} onClick={handleTakeoff} disabled={takeoffButton.disabled}>
                    <span className="nav-symbol">⬆️</span><span className="nav-text">{takeoffButton.text}</span>
                </button>
                <button className={gotoButton.className} onClick={handleGoto} disabled={gotoButton.disabled}>
                    <span className="nav-symbol">📍</span><span className="nav-text">{gotoButton.text}</span>
                </button>
                <button className={returnButton.className} onClick={handleReturn} disabled={returnButton.disabled}>
                    <span className="nav-symbol">↩️</span><span className="nav-text">{returnButton.text}</span>
                </button>
                <button className={landButton.className} onClick={handleLand} disabled={landButton.disabled}>
                    <span className="nav-symbol">⬇️</span><span className="nav-text">{landButton.text}</span>
                </button>
            </div>
            
            {/* Attitude Panel */}
            <div className="attitude-panel" style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '12px',
                zIndex: 1000
            }}>
                Attitude (Roll: {displayTelemetry.roll.toFixed(1)}°, Pitch: {displayTelemetry.pitch.toFixed(1)}°)
                {simulationMode && (
                    <div style={{ marginTop: '5px', color: '#ff6b35', fontWeight: 'bold' }}>
                        {simulationActive ? 'SIMULATION ACTIVE' : 'SIMULATION READY'}
                    </div>
                )}
            </div>

            {/* Telemetry Bar */}
            <div className="telemetry-bar" style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                right: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '14px',
                textAlign: 'center',
                zIndex: 1000
            }}>
                Alt: {displayTelemetry.relative_alt.toFixed(1)}m | 
                GS: {displayTelemetry.ground_speed.toFixed(1)}m/s | 
                VS: {displayTelemetry.vertical_speed.toFixed(1)}m/s | 
                AS: {displayTelemetry.airspeed.toFixed(1)}m/s | 
                Sats: {displayTelemetry.gps_satellites} | 
                Battery: {displayTelemetry.battery_percentage}% | 
                Mode: {displayTelemetry.mode}
            </div>
        </div>
    );
}

export default MapView;