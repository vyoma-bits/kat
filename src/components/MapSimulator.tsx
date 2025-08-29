import React, { useState, useEffect, useRef } from 'react';
import MapView from './MapView'; // Import your existing MapView component

// The TelemetryData interface, copied from your MapView file for type safety
interface TelemetryData {
    relative_alt?: number;
    ground_speed?: number;
    lat?: number;
    lon?: number;
    yaw?: number;
    mode?: string;
    armed?: boolean;
    // Add other fields as needed for simulation
}

const MapSimulator: React.FC = () => {
    // State to hold the simulated telemetry data
    const [telemetry, setTelemetry] = useState<TelemetryData>({
        lat: 28.3639, // Starting latitude (Pilani)
        lon: 75.5880, // Starting longitude (Pilani)
        relative_alt: 0,
        ground_speed: 0,
        yaw: 0,
        mode: 'STABILIZE',
        armed: false,
    });

    // State to control the simulation
    const [isSimulating, setIsSimulating] = useState(false);
    
    // useRef to keep track of the simulation interval and current angle for the flight path
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const angleRef = useRef(0);

    // This useEffect hook handles the simulation logic
    useEffect(() => {
        if (isSimulating) {
            // Start the interval when simulation is active
            intervalRef.current = setInterval(() => {
                setTelemetry(prevTelemetry => {
                    const centerLat = 28.3639;
                    const centerLon = 75.5880;
                    const radius = 0.001; // The radius of the circular path
                    
                    // Increment the angle for the next point on the circle
                    angleRef.current += 0.05; // Adjust this value to change speed

                    // Calculate the new lat/lon for a circular path
                    const newLat = centerLat + radius * Math.sin(angleRef.current);
                    const newLon = centerLon + radius * Math.cos(angleRef.current);

                    // Calculate heading based on previous position (from your original logic)
                    const prevLat = prevTelemetry.lat || centerLat;
                    const prevLon = prevTelemetry.lon || centerLon;
                    
                    const toRadians = (deg: number) => deg * Math.PI / 180;
                    const toDegrees = (rad: number) => rad * 180 / Math.PI;

                    const y = Math.sin(toRadians(newLon - prevLon)) * Math.cos(toRadians(newLat));
                    const x = Math.cos(toRadians(prevLat)) * Math.sin(toRadians(newLat)) -
                              Math.sin(toRadians(prevLat)) * Math.cos(toRadians(newLat)) * Math.cos(toRadians(newLon - prevLon));
                    const newYaw = (toDegrees(Math.atan2(y, x)) + 360) % 360;

                    // Return the new, updated telemetry data
                    return {
                        ...prevTelemetry,
                        lat: newLat,
                        lon: newLon,
                        relative_alt: 15.5, // Constant altitude
                        ground_speed: 5.2, // Constant speed
                        yaw: newYaw,
                    };
                });
            }, 500); // Update every 500ms
        } else {
            // If simulation is stopped, clear the interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        // Cleanup function: clear the interval when the component unmounts
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isSimulating]); // This effect re-runs whenever isSimulating changes

    const handleToggleSimulation = () => {
        // When starting, arm the vehicle and set mode to GUIDED
        if (!isSimulating) {
            setTelemetry(prev => ({ ...prev, armed: true, mode: 'GUIDED' }));
        }
        setIsSimulating(!isSimulating);
    };

    // Dummy functions for the props expected by MapView
    const handleArm = () => {
        console.log("ARM/DISARM button clicked");
        setTelemetry(t => ({...t, armed: !t.armed}));
    };
    
    const handleTakeoff = (params: { altitude: number }) => {
        console.log(`Takeoff initiated to ${params.altitude}m`);
        setIsSimulating(true); // Start the simulation on takeoff
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <MapView
                telemetry={telemetry}
                connectionStatus="Connected" // Hardcode as connected for testing
                onConnectionToggle={() => console.log("Connection toggled")}
                onArm={handleArm}
                onTakeoff={handleTakeoff}
                onLand={() => { console.log("Land initiated"); setIsSimulating(false); }}
                onReturn={() => { console.log("Return initiated"); setIsSimulating(false); }}
                onGotoPosition={() => console.log("Go To Position initiated")}
            />
            {/* A simple button to control the simulation */}
            <button
                onClick={handleToggleSimulation}
                style={{
                    position: 'absolute',
                    top: '80px',
                    left: '10px',
                    zIndex: 1000,
                    padding: '10px',
                    backgroundColor: isSimulating ? 'red' : 'green',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
            </button>
        </div>
    );
};

export default MapSimulator;