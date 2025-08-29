import React from 'react';
import './TelemetryPanel.css';

interface TelemetryData {
  altitude?: number;
  groundSpeed?: number;
  distToWP?: number;
  yaw?: number;
  verticalSpeed?: number;
  distToMAV?: number;
}

interface TelemetryPanelProps {
  telemetry: TelemetryData;
}

const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => {
  return (
    <div className="telemetry-panel">
      <div className="telemetry-grid">
        <div className="telemetry-item">
          <div className="telemetry-label">Altitude (m)</div>
          <div className="telemetry-value purple">{(telemetry.altitude ?? 0).toFixed(2)}</div>
        </div>

        <div className="telemetry-item">
          <div className="telemetry-label">GroundSpee (m/s)</div>
          <div className="telemetry-value orange">{(telemetry.groundSpeed ?? 0).toFixed(2)}</div>
        </div>

        <div className="telemetry-item">
          <div className="telemetry-label">Dist to WP (m)</div>
          <div className="telemetry-value red">{(telemetry.distToWP ?? 0).toFixed(2)}</div>
        </div>

        <div className="telemetry-item">
          <div className="telemetry-label">Yaw (deg)</div>
          <div className="telemetry-value green">{(telemetry.yaw ?? 0).toFixed(2)}</div>
        </div>

        <div className="telemetry-item">
          <div className="telemetry-label">Vertical Speed (m/s)</div>
          <div className="telemetry-value yellow">{(telemetry.verticalSpeed ?? 0).toFixed(2)}</div>
        </div>

        <div className="telemetry-item">
          <div className="telemetry-label">DistToMAV</div>
          <div className="telemetry-value cyan">{(telemetry.distToMAV ?? 0).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryPanel;
