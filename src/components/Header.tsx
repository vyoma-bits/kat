import React from 'react'
import './Header.css'

const Header: React.FC = () => {
  return (
    <div className="header">
      <div className="header-left">
        <span className="app-title">Mission Planner 1.3.82 build 1.3.8979.17128</span>
      </div>
      <div className="header-center">
        <div className="menu-items">
          <button className="menu-item active">DATA</button>
          {/* <button className="menu-item">PLAN</button>
          <button className="menu-item">SETUP</button>
          <button className="menu-item">CONFIG</button>
          <button className="menu-item">SIMULATION</button>
          <button className="menu-item">HELP</button> */}
        </div>
      </div>
      <div className="header-right">
        {/* <div className="ardupilot-logo">
          <span>ARDUPILOT</span>
          <span className="udp-indicator">UDP</span>
        </div> */}
        <div className="connection-info">
          {/* <span>14500</span> */}
          {/* <button className="connect-btn">CONNECT</button> */}
        </div>
      </div>
    </div>
  )
}

export default Header