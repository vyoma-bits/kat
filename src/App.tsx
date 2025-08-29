import React, { useState, useEffect, useRef } from 'react';

// --- TYPE DECLARATION for LEAFLET ---
// This tells TypeScript that a global variable 'L' will exist,
// which will be loaded from the CDN script.
declare const L: any;

// --- STYLES ---
// CSS is included directly to avoid resolution errors with external files.
const AppStyles = `
  .app {
    text-align: center;
  }

  .main-content {
    position: relative;
    width: 100vw;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  .map-container {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .leaflet-map {
    width: 100%;
    height: 100%;
  }
  
  /* --- UPDATED: Main container for all UI on the right --- */
  .right-ui-container {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end; /* Align items to the right */
  }

  /* --- NEW: Container for the top buttons --- */
  .top-buttons-container {
    display: flex;
    gap: 10px;
  }

  .connect-button, .simulation-button {
    padding: 8px 12px;
    font-size: 14px;
    font-weight: bold;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: background-color 0.3s ease;
    width: 120px;
  }

  .connect-button.connected { background-color: #28a745; }
  .connect-button.disconnected { background-color: #6c757d; }
  .connect-button.error { background-color: #dc3545; }
  .connect-button.simulating { background-color: #17a2b8; }

  .simulation-button { background-color: #007bff; }
  .simulation-button.simulating { background-color: #dc3545; }

  /* --- Left-side panel for flight controls --- */
  .flight-controls-left {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .nav-button {
    background-color: rgba(40, 40, 40, 0.8);
    color: white;
    border: 1px solid #666;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 130px;
    transition: background-color 0.3s, transform 0.1s;
  }

  .nav-button:hover:not(:disabled) { background-color: rgba(60, 60, 60, 0.9); }
  .nav-button:active:not(:disabled) { transform: scale(0.95); }
  .nav-button.disabled { background-color: rgba(80, 80, 80, 0.6); cursor: not-allowed; color: #aaa; }
  .nav-button .nav-symbol { font-size: 20px; margin-right: 10px; width: 24px; text-align: center; }
  .nav-button .nav-text { font-weight: bold; }
  .nav-button.armed { background-color: #c82333; }
  .nav-button.disarmed { background-color: #218838; }

  /* --- Telemetry Panel Styles --- */
  .telemetry-panel {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(20, 20, 20, 0.85);
    border-radius: 10px;
    padding: 10px 15px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .telemetry-grid { display: flex; gap: 20px; color: white; }
  .telemetry-item { text-align: center; }
  .telemetry-label { font-size: 12px; color: #aaa; margin-bottom: 4px; text-transform: uppercase; }
  .telemetry-value { font-size: 20px; font-weight: bold; min-width: 80px; }
  .telemetry-value.purple { color: #b39ddb; }
  .telemetry-value.orange { color: #ffcc80; }
  .telemetry-value.red { color: #ef9a9a; }
  .telemetry-value.green { color: #a5d6a7; }
  .telemetry-value.yellow { color: #fff59d; }
  .telemetry-value.cyan { color: #80deea; }

  /* --- UPDATED: Attitude Panel Styles (positioning removed) --- */
  .attitude-panel {
    width: 250px; /* Wider to match buttons */
    height: 250px;
    background-color: rgba(20, 20, 20, 0.85);
    border-radius: 10px;
    color: white;
    padding: 10px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .attitude-indicator { width: 150px; height: 150px; border-radius: 50%; position: relative; overflow: hidden; border: 2px solid #555; }
  .horizon { width: 200%; height: 200%; position: absolute; left: -50%; top: -50%; transition: transform 0.1s linear; }
  .sky { height: 50%; background-color: #87ceeb; }
  .ground { height: 50%; background-color: #8b4513; }
  .horizon-line { position: absolute; top: 50%; width: 100%; height: 2px; background-color: white; }
  .aircraft-symbol { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 20px; z-index: 2; }
  .aircraft-wing { position: absolute; width: 100%; height: 2px; background-color: yellow; top: 50%; transform: translateY(-1px); }
  .aircraft-center { position: absolute; width: 2px; height: 10px; background-color: yellow; left: 50%; top: 50%; transform: translate(-1px, -5px); }
  .attitude-values { margin-top: 10px; display: flex; justify-content: space-around; width: 100%; }
  .attitude-item { text-align: center; }
  .attitude-label { font-size: 10px; color: #aaa; }
  .attitude-value { font-size: 14px; font-weight: bold; }
`;

// --- TYPE DEFINITIONS ---
interface TelemetryData {
  roll?: number; pitch?: number; yaw?: number; relative_alt?: number;
  ground_speed?: number; airspeed?: number; vertical_speed?: number;
  armed?: boolean; mode?: string; lat?: number; lon?: number;
}
interface TakeoffParams { altitude: number; lat: number; lon: number; }
interface MapViewProps {
  telemetry?: TelemetryData; onTakeoff?: (params: TakeoffParams) => void;
  onLand?: () => void; onReturn?: () => void; onArm?: () => void; onGotoPosition?: () => void;
}
interface PanelTelemetryData {
  altitude?: number; groundSpeed?: number; distToWP?: number;
  yaw?: number; verticalSpeed?: number; distToMAV?: number;
}

// --- UI COMPONENTS ---
const TelemetryPanel: React.FC<{ telemetry: PanelTelemetryData }> = ({ telemetry }) => (
  <div className="telemetry-panel">
    <div className="telemetry-grid">
      {/* I want the following values to start rendering after 15 seconds */}
      <div className="telemetry-item"><div className="telemetry-label">Altitude (m)</div><div className="telemetry-value purple">{(telemetry.altitude ?? 0).toFixed(1)}</div></div>
      <div className="telemetry-item"><div className="telemetry-label">GroundSpeed (m/s)</div><div className="telemetry-value orange">{(telemetry.groundSpeed ?? 0).toFixed(1)}</div></div>
      <div className="telemetry-item"><div className="telemetry-label">Battery</div><div className="telemetry-value red">96</div></div>
      <div className="telemetry-item"><div className="telemetry-label">Yaw (deg)</div><div className="telemetry-value green">{(telemetry.yaw ?? 0).toFixed(0)}</div></div>
      <div className="telemetry-item"><div className="telemetry-label">V. Speed (m/s)</div><div className="telemetry-value yellow">{(telemetry.verticalSpeed ?? 0).toFixed(1)}</div></div>
      {/* <div className="telemetry-item"><div className="telemetry-label">Relative Altitude</div><div className="telemetry-value cyan">{(telemetry.distToMAV ?? 0).toFixed(1)}</div></div> */}
    </div>
  </div>
);

const AttitudePanel: React.FC<{ telemetry: TelemetryData }> = ({ telemetry }) => {
    const { roll = 0, pitch = 0, yaw = 0 } = telemetry;
    return (
        <div className="attitude-panel">
            <div className="attitude-indicator"><div className="horizon" style={{ transform: `rotate(${-roll}deg) translateY(${pitch * 2}px)` }}><div className="sky"></div><div className="ground"></div><div className="horizon-line"></div></div><div className="aircraft-symbol"><div className="aircraft-wing"></div><div className="aircraft-center"></div></div></div>
            <div className="attitude-values"><div className="attitude-item"><div className="attitude-label">ROLL</div><div className="attitude-value">{roll.toFixed(1)}°</div></div><div className="attitude-item"><div className="attitude-label">PITCH</div><div className="attitude-value">{pitch.toFixed(1)}°</div></div><div className="attitude-item"><div className="attitude-label">YAW</div><div className="attitude-value">{yaw.toFixed(1)}°</div></div></div>
        </div>
    );
};

// --- CONSTANTS & HELPERS ---
const uavIconUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath d='M12 2 L2 22 L12 17 L22 22 Z' fill='%2300D9FF' stroke='%23000000' stroke-width='1'/%3E%3C/svg%3E";
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (deg: number) => deg * Math.PI / 180; const toDegrees = (rad: number) => rad * 180 / Math.PI;
    const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) - Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
    return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

// --- MAPVIEW COMPONENT ---
const MapView: React.FC<MapViewProps> = ({ telemetry = {}, onTakeoff, onLand, onReturn, onArm, onGotoPosition, }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null); const markerRef = useRef<any | null>(null); const polylineRef = useRef<any | null>(null);
  const [path, setPath] = useState<[number, number][]>([]); const [heading, setHeading] = useState(0);
  const prevPositionRef = useRef<[number, number] | null>(null); const [isLeafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).L) { setLeafletLoaded(true); return; }
    const cssLink = document.createElement('link'); cssLink.rel = 'stylesheet'; cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(cssLink);
    const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.async = true; script.onload = () => setLeafletLoaded(true); document.body.appendChild(script);
    return () => { document.head.removeChild(cssLink); document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (isLeafletLoaded && mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([28.3639, 75.5880], 17);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' }).addTo(map);
      mapRef.current = map;
    }
  }, [isLeafletLoaded]);

  useEffect(() => {
    if (!mapRef.current || !isLeafletLoaded || !telemetry.lat || !telemetry.lon) return;
    const map = mapRef.current; const newPosition: [number, number] = [telemetry.lat, telemetry.lon];
    if (prevPositionRef.current) {
        const prevPos = prevPositionRef.current;
        if (L.latLng(prevPos).distanceTo(L.latLng(newPosition)) > 0.1) { setHeading(calculateBearing(prevPos[0], prevPos[1], newPosition[0], newPosition[1])); }
    } else if (telemetry.yaw) { setHeading(telemetry.yaw); }
    prevPositionRef.current = newPosition; setPath(currentPath => [...currentPath, newPosition]);
    if (!polylineRef.current) { polylineRef.current = L.polyline([], { color: 'cyan', weight: 3 }).addTo(map); }
    polylineRef.current.addLatLng(newPosition);
    const baseSize = 40; const altitude = telemetry.relative_alt || 0; const iconSize = baseSize + Math.min(altitude, 50) * 0.4;
    const newIcon = L.icon({ iconUrl: uavIconUrl, iconSize: [iconSize, iconSize], iconAnchor: [iconSize / 2, iconSize / 2], popupAnchor: [0, -iconSize / 2], });
    if (!markerRef.current) { markerRef.current = L.marker(newPosition, { icon: newIcon }).addTo(map); } else { markerRef.current.setLatLng(newPosition); markerRef.current.setIcon(newIcon); }
    const markerElement = (markerRef.current as any)._icon as HTMLElement;
    if (markerElement) {
        const existingTransform = markerElement.style.transform; const transformWithoutRotation = existingTransform.replace(/ rotate\([^)]+\)/, '');
        markerElement.style.transformOrigin = 'center center'; markerElement.style.transform = `${transformWithoutRotation} rotate(${heading}deg)`;
    }
    markerRef.current.bindPopup(`<b>Vehicle Position</b><br/>Mode: ${telemetry.mode || 'N/A'}<br/>Armed: ${telemetry.armed ? 'YES' : 'NO'}<br/>Alt: ${(telemetry.relative_alt ?? 0).toFixed(1)}m`);
    map.panTo(newPosition);
  }, [telemetry.lat, telemetry.lon, telemetry.yaw, telemetry.relative_alt, isLeafletLoaded]);

  const handleButtonClick = (action: string, callback?: () => void) => {
    if (['TAKEOFF', 'RETURN', 'GOTO'].includes(action)) { setPath([]); if (polylineRef.current) polylineRef.current.setLatLngs([]); prevPositionRef.current = null; }
    if (callback) callback();
  };
  
  const handleTakeoffClick = () => {
    if (!telemetry.armed) { alert('Vehicle must be armed before takeoff!'); return; }
    const altStr = prompt("Enter Takeoff Altitude (meters):", "10"); if (altStr === null) return;
    const altitude = parseFloat(altStr); if (isNaN(altitude) || altitude <= 0) { alert("Invalid altitude."); return; }
    handleButtonClick('TAKEOFF', () => onTakeoff && onTakeoff({ altitude, lat: 0, lon: 0 }));
  };

  const getButtonStatus = (buttonType: string) => {
    switch (buttonType) {
      case 'ARM': return { className: `nav-button ${telemetry.armed ? 'armed' : 'disarmed'}`, text: telemetry.armed ? 'DISARM' : 'ARM' };
      case 'TAKEOFF': return { disabled: !telemetry.armed, className: `nav-button ${!telemetry.armed ? 'disabled' : ''}`, text: 'TAKEOFF' };
      case 'GOTO': return { disabled: false, className: 'nav-button', text: 'GO TO' }; // Always enabled
      default: return { disabled: false, className: 'nav-button', text: buttonType };
    }
  };

  const armButton = getButtonStatus('ARM'); const takeoffButton = getButtonStatus('TAKEOFF'); const gotoButton = getButtonStatus('GOTO');
  return (
    <div className="map-container">
      <div ref={mapContainerRef} className="leaflet-map" />
      <div className="flight-controls-left">
        <button className={armButton.className} onClick={() => handleButtonClick('ARM', onArm)}><span className="nav-symbol">🔒</span><span className="nav-text">{armButton.text}</span></button>
        <button className={takeoffButton.className} onClick={handleTakeoffClick} disabled={takeoffButton.disabled}><span className="nav-symbol">⬆️</span><span className="nav-text">TAKEOFF</span></button>
        <button className={gotoButton.className} onClick={() => handleButtonClick('GOTO', onGotoPosition)} disabled={gotoButton.disabled}><span className="nav-symbol">📍</span><span className="nav-text">GO TO</span></button>
        <button className="nav-button" onClick={() => handleButtonClick('RETURN', onReturn)}><span className="nav-symbol">↩️</span><span className="nav-text">RETURN</span></button>
        <button className="nav-button" onClick={() => handleButtonClick('LAND', onLand)}><span className="nav-symbol">⬇️</span><span className="nav-text">LAND</span></button>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
const initialTelemetry: TelemetryData = { lat: 28.3639, lon: 75.5880, relative_alt: 0, ground_speed: 0, yaw: 0, mode: 'STABILIZE', armed: false, roll: 0, pitch: 0, vertical_speed: 0, };

function App() {
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [isManualConnect, setIsManualConnect] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationDelay, setSimulationDelay] = useState<number | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flightAngleRef = useRef(0);

  useEffect(() => {
    if (isSimulating) {
      // Start with 15 second delay
      setSimulationDelay(5);
      
      // Start delay countdown
      delayTimerRef.current = setInterval(() => {
        setSimulationDelay(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(delayTimerRef.current!);
            // Start the actual simulation here
            setTelemetry(t => ({ ...t, armed: true, mode: 'GUIDED' })); flightAngleRef.current = 0;
            simulationIntervalRef.current = setInterval(() => {
                setTelemetry(prev => {
                    const centerLat = 28.3639, centerLon = 75.5880, radius = 0.001;
                    flightAngleRef.current += 0.05;
                    const newLat = centerLat + radius * Math.sin(flightAngleRef.current);
                    const newLon = centerLon + radius * Math.cos(flightAngleRef.current);
                    const time = Date.now() / 1000;
                    return {
                      ...prev,
                      lat: newLat,
                      lon: newLon,
                      relative_alt: 25 + Math.sin(time / 2) * 10,
                      ground_speed: 5 + Math.random() * 10,
                      yaw: calculateBearing(prev.lat || centerLat, prev.lon || centerLon, newLat, newLon),
                      armed: true,
                      mode: 'GUIDED',
                      vertical_speed: Math.cos(time / 2) * 5,
                      roll: Math.sin(time) * 15,
                      pitch: Math.cos(time) * 10,
                    };
                });
            }, 500);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (delayTimerRef.current) clearInterval(delayTimerRef.current);
      setSimulationDelay(null);
      setTelemetry(initialTelemetry);
    }

    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (delayTimerRef.current) clearInterval(delayTimerRef.current);
    };
  }, [isSimulating]); // Only depend on isSimulating

  // Modify the panel telemetry to show zeros during delay
  const panelTelemetry: PanelTelemetryData = simulationDelay ? {
    altitude: 0,
    groundSpeed: 0,
    yaw: 0,
    verticalSpeed: 0,
    distToWP: 0,
    distToMAV: 0,
  } : {
    altitude: telemetry.relative_alt,
    groundSpeed: telemetry.ground_speed,
    yaw: telemetry.yaw,
    verticalSpeed: telemetry.vertical_speed,
    distToWP: 0,
    distToMAV: 0,
  };

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8765');
    ws.onopen = () => { setConnectionStatus('Connected'); setWebsocket(ws); };
    ws.onmessage = (event) => { try { const data = JSON.parse(event.data); if (data.type === 'telemetry') setTelemetry(data); } catch (err) { console.error('Error parsing data:', err); } };
    ws.onclose = () => { setConnectionStatus('Disconnected'); setWebsocket(null); if (isManualConnect) setTimeout(connectWebSocket, 3000); };
    ws.onerror = () => setConnectionStatus('Error');
  };

  useEffect(() => {
    if (isManualConnect) {
      connectWebSocket();
    }
    return () => {
      if (websocket) websocket.close();
    };
  }, [isManualConnect]);

  const handleTakeoff = (params: TakeoffParams) => isSimulating ? console.log(`SIM: Takeoff to ${params.altitude}m`) : sendCommand('takeoff', { altitude: params.altitude });
  const handleArmDisarm = () => isSimulating ? setTelemetry(t => ({...t, armed: !t.armed})) : sendCommand(telemetry.armed ? 'disarm' : 'arm');
  const handleLand = () => isSimulating ? setIsSimulating(false) : sendCommand('land');
  const handleReturn = () => isSimulating ? setIsSimulating(false) : sendCommand('return');
  const handleGotoPosition = () => {
    // if (isSimulating) { alert("Go To is not available in simulation."); return; }
    const north = parseFloat(prompt('Enter North position (meters):', '20') || 'NaN'); const east = parseFloat(prompt('Enter East position (meters):', '20') || 'NaN');
    if (!isNaN(north) && !isNaN(east)) sendCommand('goto_position', { north, east, down: -10 }); else alert('Please enter valid numbers.');
  };
  const handleConnectionToggle = () => { if(isSimulating) setIsSimulating(false); setIsManualConnect(prev => !prev); };
  const handleSimulationToggle = () => { const nowSimulating = !isSimulating; setIsSimulating(nowSimulating); if (nowSimulating) setIsManualConnect(false); };
  const currentStatus = isSimulating ? 'Simulating' : connectionStatus;
  return (
    <div className="app">
        <style>{AppStyles}</style>
        <div className="main-content">
            <MapView telemetry={telemetry} onTakeoff={handleTakeoff} onLand={handleLand} onReturn={handleReturn} onArm={handleArmDisarm} onGotoPosition={handleGotoPosition} />
            {/* --- UPDATED: New layout for right-side UI --- */}
            <div className="right-ui-container">
                <div className="top-buttons-container">
                    
                    <button onClick={handleSimulationToggle} className={`simulation-button ${isSimulating ? 'simulating' : ''}`}>
                        {isSimulating ? (simulationDelay ? `Disconnect` : 'Disconnect') : 'Connect'}
                    </button>
                </div>
                <AttitudePanel telemetry={simulationDelay ? { ...telemetry, roll: 0, pitch: 0, yaw: 0 } : telemetry} />
            </div>
            <TelemetryPanel telemetry={panelTelemetry} />
        </div>
    </div>
  );
}

export default App;
