from pymavlink import mavutil
import asyncio
import json
import websockets
import threading
import time
import math

# Shared telemetry store
telemetry_data = {}
clients = set()

# Step 1: Connect to ArduPilot SITL (UDP)
print("🔌 Connecting to ArduPilot SITL on udp:127.0.0.1:14550...")
mav = mavutil.mavlink_connection('udp:127.0.0.1:14550')
mav.wait_heartbeat()
print("✅ Heartbeat received from Flight Controller")

# Step 2: MAVLink Command Functions
def arm_vehicle():
    """Arm the vehicle with position check"""
    print("🔧 Preparing to arm vehicle...")
    
    # First check GPS
    if not wait_for_position():
        print("❌ Cannot arm without position fix")
        return False
    
    # Switch to GUIDED mode
    if not set_mode_and_wait('GUIDED', timeout=10):
        print("❌ Failed to switch to GUIDED mode")
        return False
    
    # Small delay to allow mode switch to complete
    time.sleep(1)
    
    print("🔧 Arming vehicle in GUIDED mode...")
    mav.mav.command_long_send(
        mav.target_system,
        mav.target_component,
        mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM,
        0,  # confirmation
        1,  # arm
        0, 0, 0, 0, 0, 0
    )
    
    # Wait for arm acknowledgment
    start = time.time()
    while time.time() - start < 10:
        msg = mav.recv_match(type=['COMMAND_ACK', 'HEARTBEAT'], blocking=True, timeout=1)
        if msg:
            if msg.get_type() == 'HEARTBEAT' and msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED:
                print("✅ Vehicle armed successfully")
                return True
            elif msg.get_type() == 'COMMAND_ACK' and msg.command == mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM:
                if msg.result != mavutil.mavlink.MAV_RESULT_ACCEPTED:
                    print(f"❌ Arm command failed with result: {msg.result}")
                    return False
    
    print("❌ Arming failed or timed out")
    return False

def disarm_vehicle():
    """Disarm the vehicle"""
    print("🔧 Disarming vehicle...")
    mav.mav.command_long_send(
        mav.target_system,
        mav.target_component,
        mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM,
        0,  # confirmation
        0,  # disarm
        0, 0, 0, 0, 0, 0
    )

# Removed GPS waiting functions - not needed for simple takeoff

def set_mode_and_wait(mode_name, timeout=10):
    """Send set_mode and wait for heartbeat showing the flightmode changed."""
    mode_id = mav.mode_mapping().get(mode_name.upper(), None)
    if not mode_id:
        print(f"❌ Unknown mode {mode_name}")
        return False

    print(f"✈️ Setting mode to {mode_name}...")
    mav.mav.set_mode_send(mav.target_system,
                          mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED,
                          mode_id)

    start = time.time()
    while time.time() - start < timeout:
        hb = mav.recv_match(type='HEARTBEAT', blocking=True, timeout=1)
        if hb:
            try:
                current_mode = mav.flightmode
                print(f"📡 Current mode: {current_mode}")
                if current_mode and current_mode.upper() == mode_name.upper():
                    print(f"✅ Successfully changed to {mode_name} mode")
                    return True
            except Exception as e:
                print(f"⚠️ Mode check error: {e}")
        time.sleep(0.1)
    
    print(f"❌ Failed to change to {mode_name} mode within {timeout} seconds")
    return False

def takeoff(altitude_m=10):
    """Execute takeoff sequence with proper state handling"""
    print(f"🚁 Requesting takeoff to {altitude_m}m")

    # 1) First check if already armed, if so disarm
    if telemetry_data.get('armed', False):
        print("⚠️ Vehicle already armed, disarming first...")
        disarm_vehicle()
        time.sleep(2)  # Wait for disarm to complete

    # 2) Switch to GUIDED mode
    print("✈️ Setting mode to GUIDED...")
    if not set_mode_and_wait('GUIDED', timeout=10):
        print("❌ Failed to switch to GUIDED mode. Takeoff aborted.")
        return False
    
    time.sleep(1)  # Brief pause

    # 3) Arm vehicle
    print("🔧 Arming vehicle...")
    if not arm_vehicle():
        print("❌ Failed to arm vehicle. Takeoff aborted.")
        return False

    time.sleep(2)  # Give more time for arm to stabilize

    # 4) Send takeoff command and wait for ACK
    print("🚀 Sending takeoff command...")
    mav.mav.command_long_send(
        mav.target_system,
        mav.target_component,
        mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,
        0,  # confirmation
        0, 0, 0, 0,  # params 1-4 (pitch, empty, empty, yaw)
        0, 0,  # lat/lon = 0 => use current position
        altitude_m
    )

    # 5) Wait for takeoff acknowledgment
    start = time.time()
    while time.time() - start < 10:
        msg = mav.recv_match(type='COMMAND_ACK', blocking=True, timeout=1)
        if msg and msg.command == mavutil.mavlink.MAV_CMD_NAV_TAKEOFF:
            if msg.result == mavutil.mavlink.MAV_RESULT_ACCEPTED:
                print("✅ Takeoff command accepted")
                return True
            else:
                print(f"❌ Takeoff command failed with result: {msg.result}")
                return False

    print("❌ Takeoff command timed out")
    return False

def land_vehicle():
    """Land the vehicle"""
    print("🛬 Landing vehicle...")
    mav.mav.command_long_send(
        mav.target_system,
        mav.target_component,
        mavutil.mavlink.MAV_CMD_NAV_LAND,
        0,  # confirmation
        0, 0, 0, 0, 0, 0, 0
    )

def return_to_launch():
    """Return to launch position"""
    print("🏠 Returning to launch...")
    # Set mode to RTL
    if not set_mode_and_wait('RTL', timeout=10):
        print("❌ Failed to switch to RTL mode")

def set_mode(mode_name):
    """Set flight mode"""
    print(f"✈️ Setting mode to {mode_name}...")
    set_mode_and_wait(mode_name, timeout=10)

def goto_position_target_local_ned(north, east, down):
    """Move to a local NED position"""
    print(f"📍 Moving to position N:{north}, E:{east}, D:{down}")
    mav.mav.set_position_target_local_ned_send(
        0,  # time_boot_ms
        mav.target_system,
        mav.target_component,
        mavutil.mavlink.MAV_FRAME_LOCAL_NED,
        0b0000111111111000,  # type_mask (only positions enabled)
        north, east, down,
        0, 0, 0,  # velocities
        0, 0, 0,  # accelerations
        0, 0  # yaw, yaw_rate
    )

# Add this function after the other helper functions
def wait_for_position(timeout=30):
    """Wait for GPS position fix"""
    print("🛰️ Waiting for GPS position fix...")
    start = time.time()
    while time.time() - start < timeout:
        if 'gps_fix' in telemetry_data and telemetry_data['gps_fix']:
            print("✅ GPS position fix acquired")
            return True
        time.sleep(1)
    print("❌ Failed to get GPS position fix")
    return False

# Step 3: Handle incoming commands
async def handle_command(command_data):
    """Process commands received from WebSocket"""
    command = command_data.get('command')
    params = command_data.get('params', {})
    
    print(f"🎮 Received command: {command} with params: {params}")
    
    try:
        if command == 'takeoff':
            altitude = params.get('altitude', 10)
            print(f"🚁 Processing takeoff command for {altitude}m")
            result = takeoff(float(altitude))
            await broadcast_status_update(f"Takeoff command {'successful' if result else 'failed'}")
            
        elif command == 'land':
            print("🛬 Processing land command")
            land_vehicle()
            await broadcast_status_update("Landing command sent")
            
        elif command == 'arm':
            print("🔧 Processing arm command")
            result = arm_vehicle()
            await broadcast_status_update(f"Arm command {'successful' if result else 'failed'}")
            
        elif command == 'disarm':
            print("🔧 Processing disarm command") 
            disarm_vehicle()
            await broadcast_status_update("Disarm command sent")
            
        elif command == 'return':
            print("🏠 Processing return to launch command")
            return_to_launch()
            await broadcast_status_update("RTL command sent")
            
        elif command == 'set_mode':
            mode = params.get('mode', 'GUIDED')
            print(f"✈️ Processing mode change to {mode}")
            set_mode(mode)
            await broadcast_status_update(f"Mode change to {mode} requested")
            
        elif command == 'goto_position':
            north = params.get('north', 0)
            east = params.get('east', 0)
            down = params.get('down', -10)  # negative for altitude
            print(f"📍 Processing goto position command: N={north}, E={east}, D={down}")
            goto_position_target_local_ned(float(north), float(east), float(down))
            await broadcast_status_update(f"Moving to position N:{north}, E:{east}, D:{down}")
            
        else:
            print(f"❌ Unknown command: {command}")
            await broadcast_status_update(f"Unknown command: {command}")
            
    except Exception as e:
        print(f"❌ Error executing command {command}: {e}")
        await broadcast_status_update(f"Error executing {command}: {str(e)}")

# Step 4: Background thread to receive MAVLink telemetry
def mavlink_listener():
    global telemetry_data
    while True:
        try:
            msg = mav.recv_match(blocking=True)
            if not msg:
                continue

            msg_type = msg.get_type()
            
            # Parse different message types
            if msg_type == 'ATTITUDE':
                telemetry_data.update({
                    'roll': math.degrees(msg.roll),
                    'pitch': math.degrees(msg.pitch),
                    'yaw': math.degrees(msg.yaw)
                })
            
            elif msg_type == 'GLOBAL_POSITION_INT':
                telemetry_data.update({
                    'lat': msg.lat / 1e7,
                    'lon': msg.lon / 1e7,
                    'alt': msg.alt / 1000.0,
                    'relative_alt': msg.relative_alt / 1000.0,
                    'ground_speed': msg.vx / 100.0,
                    'vertical_speed': msg.vz / 100.0
                })
            
            elif msg_type == 'VFR_HUD':
                telemetry_data.update({
                    'airspeed': msg.airspeed,
                    'groundspeed': msg.groundspeed,
                    'heading': msg.heading,
                    'throttle': msg.throttle,
                    'hud_alt': msg.alt,
                    'climb': msg.climb
                })
            
            elif msg_type == 'GPS_RAW_INT':
                telemetry_data.update({
                    'gps_satellites': msg.satellites_visible,
                    'gps_hdop': msg.eph / 100.0,
                    'gps_fix': msg.fix_type >= 1,  # More lenient for SITL
                    'gps_fix_type': msg.fix_type
                })
            
            elif msg_type == 'BATTERY_STATUS':
                telemetry_data.update({
                    'battery_voltage': msg.voltages[0] / 1000.0 if msg.voltages else 0,
                    'battery_current': msg.current_battery / 100.0 if msg.current_battery != -1 else 0,
                    'battery_percentage': msg.battery_remaining if msg.battery_remaining != -1 else 100  # Default 100% for SITL
                })
            
            elif msg_type == 'HEARTBEAT':
                telemetry_data.update({
                    'armed': bool(msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED),
                    'mode': mav.flightmode or 'UNKNOWN',
                    'system_status': msg.system_status,
                    'timestamp': time.time()
                })
            
        except Exception as e:
            print(f"❌ MAVLink listener error: {e}")
            time.sleep(0.1)

# Step 5: WebSocket server
async def websocket_handler(websocket):
    clients.add(websocket)
    print(f"🔗 New WebSocket client connected. Total clients: {len(clients)}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if 'command' in data:
                    await handle_command(data)
                else:
                    print(f"📨 Received data: {data}")
            except json.JSONDecodeError:
                print(f"❌ Invalid JSON received: {message}")
            except Exception as e:
                print(f"❌ Error handling message: {e}")
    except websockets.exceptions.ConnectionClosed:
        print("🔌 WebSocket client disconnected")
    finally:
        clients.remove(websocket)
        print(f"🔗 Client removed. Total clients: {len(clients)}")

# Step 6: Broadcast telemetry to all connected clients
async def broadcast_status_update(message):
    """Send status message to all clients"""
    if clients:
        status_data = {
            'type': 'status',
            'message': message,
            'timestamp': time.time()
        }
        message_json = json.dumps(status_data)
        disconnected_clients = []
        
        for client in clients.copy():
            try:
                await client.send(message_json)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.append(client)
            except Exception as e:
                print(f"❌ Error sending status to client: {e}")
                disconnected_clients.append(client)
        
        # Remove disconnected clients
        for client in disconnected_clients:
            clients.discard(client)

async def telemetry_broadcaster():
    while True:
        if clients and telemetry_data:
            # Add telemetry type marker
            telemetry_packet = {
                'type': 'telemetry',
                **telemetry_data.copy()
            }
            message = json.dumps(telemetry_packet)
            disconnected_clients = []
            
            for client in clients.copy():
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected_clients.append(client)
                except Exception as e:
                    print(f"❌ Error sending to client: {e}")
                    disconnected_clients.append(client)
            
            # Remove disconnected clients
            for client in disconnected_clients:
                clients.discard(client)
        
        await asyncio.sleep(0.1)  # Send telemetry at 10Hz

# Step 7: Main execution
def main():
    # Start MAVLink listener in background thread
    mavlink_thread = threading.Thread(target=mavlink_listener, daemon=True)
    mavlink_thread.start()
    print("🎯 MAVLink listener started")

    async def start():
        print("🌐 Starting WebSocket server on ws://localhost:8765...")
        server = await websockets.serve(websocket_handler, "localhost", 8765)
        print("✅ WebSocket server ready for connections")
        await asyncio.gather(
            telemetry_broadcaster(),
            server.wait_closed()
        )

    try:
        asyncio.run(start())
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")

if __name__ == "__main__":
    main()