import React, { useState, useEffect } from 'react';

interface TelemetryData {
  roll?: number;
  pitch?: number;
  yaw?: number;
  altitude?: number;
  groundSpeed?: number;
  airSpeed?: number;
  battery?: {
    voltage?: number;
    current?: number;
    percentage?: number;
  };
  gps?: {
    satellites?: number;
    hdop?: number;
    fix?: boolean;
  };
}

interface LeftPanelProps {
  telemetry: TelemetryData;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ telemetry = {} }) => {
  // Dummy data simulation for websocket-like behavior
  const [dummyData, setDummyData] = useState({
    roll: 0,
    pitch: 0,
    yaw: 0,
    altitude: 197.5,
    groundSpeed: 0,
    airSpeed: 0,
    battery: { voltage: 12.4, current: 2.1, percentage: 85 },
    gps: { satellites: 8, hdop: 1.2, fix: true }
  });

  // Simulate varying data like websocket updates
 useEffect(() => {
  const ws = new WebSocket("ws://localhost:8765"); // or your actual server IP/domain

  ws.onopen = () => {
    console.log("✅ WebSocket connected from left panel");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Convert your MAVLink telemetry_data shape into your expected TSX structure
      const mappedData = {
  roll: data.roll ?? 0,
  pitch: data.pitch ?? 0,
  yaw: data.yaw ?? 0,
  altitude: data.alt_agl ?? data.alt ?? 0,
  groundSpeed: data.ground_speed ?? 0,
  airSpeed: data.air_speed ?? 0,
  battery: {
    voltage: data.voltage ?? 0,
    current: data.current ?? 0,
    percentage: data.battery_remaining ?? 0,
  },
  gps: {
    satellites: data.satellites ?? 0,
    hdop: data.hdop ?? 0,
    fix: !!(data.lat && data.lon),
  }
};

      setDummyData(mappedData);
    } catch (err) {
      console.error("❌ WebSocket message error:", err);
    }
  };

  ws.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
  };

  ws.onclose = () => {
    console.log("🔌 WebSocket disconnected");
  };

  return () => {
    ws.close();
  };
}, []);

  // Use dummy data if no telemetry provided
  const currentData = Object.keys(telemetry).length > 0 ? telemetry : dummyData;
  
  const roll = currentData?.roll || 0;
  const pitch = currentData?.pitch || 0;
  const yaw = currentData?.yaw || 0;
  const altitude = currentData?.altitude || 0;
  const groundSpeed = currentData?.groundSpeed || 0;
  const airSpeed = currentData?.airSpeed || 0;
  const batteryVoltage = currentData?.battery?.voltage || 0;
  const batteryCurrent = currentData?.battery?.current || 0;
  const batteryPercentage = currentData?.battery?.percentage || 0;
  const gpsSats = currentData?.gps?.satellites || 0;
  const gpsHdop = currentData?.gps?.hdop || 0;
  const gpsFix = currentData?.gps?.fix || false;

  return (
    <div style={styles.container}>
      {/* Header Tabs */}
      <div style={styles.headerTabs}>
        <div style={styles.tab}>DATA</div>
        {/* <div style={styles.tab}>PLAN</div>
        <div style={styles.tab}>SETUP</div>
        <div style={styles.tab}>CONFIG</div>
        <div style={styles.tab}>SIMULATION</div>
        <div style={styles.tab}>HELP</div> */}
      </div>

      <div style={styles.mainContainer}>
        {/* Top Status Bar */}
        <div style={styles.topStatusBar}>
          {/* <span style={styles.coordinates}>300 NW -99.30 ft 0.0 VDist 345°</span>
          <span style={styles.time}>00:00:00</span> */}
        </div>

        {/* Main Content Area */}
        <div style={styles.contentArea}>
          {/* Left Altitude Strip */}
          <div style={styles.leftAltitudeStrip}>
            <div style={styles.altitudeTick}>15</div>
            <div style={styles.altitudeTick}>10</div>
            <div style={styles.altitudeTick}>5</div>
            <div style={styles.altitudeTick}>0</div>
            <div style={styles.altitudeTick}>-5</div>
            <div style={styles.altitudeTick}>-10</div>
            
            {/* Current Altitude Marker */}
            {/* <div 
              style={{
                ...styles.altitudeMarker,
                top: `${150 - (altitude * 4)}px` // Position based on altitude
              }}
            >
              <div style={styles.altitudeMarkerTriangle}></div>
              <div style={styles.altitudeMarkerValue}>{altitude.toFixed(1)}m</div>
            </div> */}
          </div>

          {/* Center Attitude Indicator */}
          <div style={styles.attitudeIndicator}>
            {/* Compass Ring */}
            <div style={styles.compassRing}>
              <div style={styles.compassMark}>N</div>
              <div style={styles.compassMark}>30</div>
              <div style={styles.compassMark}>60</div>
              <div style={styles.compassMark}>E</div>
              <div style={styles.compassMark}>120</div>
              <div style={styles.compassMark}>150</div>
              <div style={styles.compassMark}>S</div>
              <div style={styles.compassMark}>210</div>
              <div style={styles.compassMark}>240</div>
              <div style={styles.compassMark}>W</div>
              <div style={styles.compassMark}>300</div>
              <div style={styles.compassMark}>330</div>
            </div>

            {/* Compass Needle */}
            <div style={styles.compassNeedle}></div>

            {/* Horizon */}
            <div 
              style={{
                ...styles.horizon,
                transform: `rotate(${-roll}deg) translateY(${pitch * 2}px)`
              }}
            >
              <div style={styles.sky}></div>
              <div style={styles.ground}></div>
              <div style={styles.horizonLine}></div>
              
              {/* Pitch Lines */}
              <div style={styles.pitchLines}>
                <div style={{...styles.pitchLine, top: '20%'}}>
                  <span style={styles.pitchLabel}>20</span>
                  <div style={styles.pitchBar}></div>
                </div>
                <div style={{...styles.pitchLine, top: '30%'}}>
                  <span style={styles.pitchLabel}>10</span>
                  <div style={styles.pitchBar}></div>
                </div>
                <div style={{...styles.pitchLine, top: '70%'}}>
                  <span style={styles.pitchLabel}>-10</span>
                  <div style={styles.pitchBar}></div>
                </div>
                <div style={{...styles.pitchLine, top: '80%'}}>
                  <span style={styles.pitchLabel}>-20</span>
                  <div style={styles.pitchBar}></div>
                </div>
              </div>
            </div>

            {/* Aircraft Symbol */}
            <div style={styles.aircraftSymbol}>
              <div style={styles.aircraftWing}></div>
              <div style={styles.aircraftCenter}></div>
              <div style={styles.aircraftWingRight}></div>
            </div>

            {/* DISARMED Status */}
            <div style={styles.disarmedStatus}>DISARMED</div>
          </div>

          {/* Right Altitude Strip */}
          <div style={styles.rightAltitudeStrip}>
            {/* Generate altitude scale dynamically - only multiples of 5 */}
            {(() => {
              const ticks: React.ReactElement[] = [];
              const baseAlt = Math.floor(altitude / 5) * 5; // Round to nearest 5
              for (let i = -10; i <= 10; i++) {
                const tickAlt = baseAlt + (i * 5);
                const position = 150 - (i * 15) + ((altitude - baseAlt) * 3);
                ticks.push(
                  <div 
                    key={tickAlt}
                    style={{
                      ...styles.altitudeTick,
                      position: 'absolute',
                      top: `${position}px`,
                      right: '15px',
                    }}
                  >
                    {tickAlt}
                  </div>
                );
              }
              return ticks;
            })()}
            
            {/* Current Altitude Marker - Triangle pointer */}
            <div style={styles.currentAltitudeMarker}>
              <div style={styles.altitudePointerTriangle}></div>
              <div style={styles.currentAltitudeValue}>{altitude.toFixed(1)} m</div>
            </div>
          </div>
        </div>

        {/* Speed Display */}
        <div style={styles.speedDisplay}>
          <div style={styles.speedBar}>
            <div style={styles.speedGreen}></div>
            <div style={styles.speedValue}>0</div>
            <div style={styles.speedRed}></div>
          </div>
          <div style={styles.altitudeDisplay}>0 m</div>
        </div>

        {/* Bottom Status */}
        <div style={styles.bottomStatus}>
          <div style={styles.statusLeft}>
            <div>AS {airSpeed.toFixed(1)}m/s</div>
            <div>GS {groundSpeed.toFixed(1)}m/s</div>
            <div style={styles.batteryStatus}>Batt {batteryVoltage.toFixed(2)}v {batteryCurrent.toFixed(1)} A {batteryPercentage.toFixed(0)}%</div>
          </div>
          <div style={styles.statusCenter}>
            {/* <div style={styles.notReady}>Not Ready to Arm</div> */}
          </div>
          <div style={styles.statusRight}>
            {/* <div>Unknown</div>
            <div>0m20</div>
            <div style={styles.gpsStatus}>EKF Vibe GPS: {gpsFix ? `${gpsSats} Sats` : 'No GPS'}</div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '400px',
    background: '#f0f0f0',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
  },

  headerTabs: {
    display: 'flex',
    background: '#e0e0e0',
    borderBottom: '1px solid #ccc',
  },

  tab: {
    padding: '8px 12px',
    background: '#d0d0d0',
    border: '1px solid #999',
    borderBottom: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold' as const,
  },

  mainContainer: {
    background: '#87CEEB',
    position: 'relative' as const,
  },

  topStatusBar: {
    background: '#4682B4',
    color: 'white',
    padding: '4px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
  },

  coordinates: {
    color: 'white',
  },

  time: {
    color: 'white',
  },

  contentArea: {
    display: 'flex',
    height: '300px',
    position: 'relative' as const,
  },

  leftAltitudeStrip: {
    width: '30px',
    background: 'rgba(255,255,255,0.8)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-around',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    position: 'relative' as const,
  },

  altitudeMarker: {
    position: 'absolute' as const,
    left: '0',
    display: 'flex',
    alignItems: 'center',
    zIndex: 10,
    transition: 'top 0.3s ease-out',
  },

  altitudeMarkerTriangle: {
    width: '0',
    height: '0',
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderLeft: '10px solid #4CAF50',
  },

  altitudeMarkerValue: {
    background: '#4CAF50',
    color: 'white',
    padding: '2px 6px',
    fontSize: '9px',
    fontWeight: 'bold' as const,
    borderRadius: '2px',
    marginLeft: '2px',
    whiteSpace: 'nowrap' as const,
  },

  rightAltitudeStrip: {
    width: '60px',
    background: 'rgba(255,255,255,0.9)',
    position: 'relative' as const,
    overflow: 'hidden',
    borderLeft: '1px solid #ccc',
  },

  currentAltitudeMarker: {
    position: 'absolute' as const,
    top: '50%',
    right: '0',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 15,
  },

  altitudePointerTriangle: {
    width: '0',
    height: '0',
    borderTop: '8px solid transparent',
    borderBottom: '8px solid transparent',
    borderRight: '12px solid #ff6600',
    marginRight: '2px',
  },

  currentAltitudeValue: {
    background: '#000',
    color: '#00ff00',
    padding: '2px 4px',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    borderRadius: '2px',
    minWidth: '35px',
    textAlign: 'center' as const,
  },

  altitudeTick: {
    color: '#333',
    fontSize: '9px',
    fontWeight: 'bold' as const,
    textAlign: 'right' as const,
    paddingRight: '15px',
    height: '10px',
    lineHeight: '10px',
  },

  attitudeIndicator: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
  },

  compassRing: {
    position: 'absolute' as const,
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    height: '100px',
    zIndex: 10,
  },

  compassMark: {
    position: 'absolute' as const,
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
  },

  compassNeedle: {
    position: 'absolute' as const,
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '0',
    height: '0',
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '15px solid red',
    zIndex: 15,
  },

  horizon: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    width: '400px',
    height: '400px',
    marginTop: '-200px',
    marginLeft: '-200px',
    transition: 'transform 0.3s ease-out',
    transformOrigin: 'center center',
  },

  sky: {
    height: '50%',
    background: '#87CEEB',
  },

  ground: {
    height: '50%',
    background: '#8B4513',
  },

  horizonLine: {
    position: 'absolute' as const,
    top: '50%',
    left: '0',
    right: '0',
    height: '2px',
    background: 'white',
    transform: 'translateY(-1px)',
  },

  pitchLines: {
    position: 'absolute' as const,
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
  },

  pitchLine: {
    position: 'absolute' as const,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  pitchLabel: {
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold' as const,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  },

  pitchBar: {
    width: '40px',
    height: '1px',
    background: 'white',
  },

  aircraftSymbol: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
  },

  aircraftWing: {
    width: '25px',
    height: '3px',
    background: 'red',
  },

  aircraftCenter: {
    width: '8px',
    height: '8px',
    background: 'red',
    borderRadius: '50%',
  },

  aircraftWingRight: {
    width: '25px',
    height: '3px',
    background: 'red',
  },

  disarmedStatus: {
    position: 'absolute' as const,
    top: '60%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'red',
    color: 'white',
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    borderRadius: '4px',
    zIndex: 25,
  },

  speedDisplay: {
    height: '40px',
    background: '#4682B4',
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
  },

  speedBar: {
    flex: 1,
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    position: 'relative' as const,
  },

  speedGreen: {
    width: '30px',
    height: '8px',
    background: 'green',
  },

  speedValue: {
    margin: '0 10px',
    color: 'white',
    fontWeight: 'bold' as const,
  },

  speedRed: {
    width: '30px',
    height: '8px',
    background: 'red',
  },

  altitudeDisplay: {
    color: 'white',
    fontWeight: 'bold' as const,
    marginLeft: '20px',
  },

  bottomStatus: {
    background: '#2a5a2a',
    color: 'white',
    padding: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
  },

  statusLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },

  statusCenter: {
    display: 'flex',
    alignItems: 'center',
  },

  statusRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    textAlign: 'right' as const,
  },

  batteryStatus: {
    color: '#ffff00',
  },

  notReady: {
    color: 'red',
    fontWeight: 'bold' as const,
  },

  gpsStatus: {
    color: 'red',
  },
};

export default LeftPanel;