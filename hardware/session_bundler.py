#!/usr/bin/env python3
"""
Frictionless Piano Tracker — Phase 2
Session Bundler: listens to MIDI events and bundles them into
structured practice session objects. Sessions end after 5 minutes
of silence and are printed as JSON.
"""

import mido
import sys
import json
import time
from datetime import datetime, timezone
import os
import requests

# ─── MIDI note number → human-readable note name (C4 = middle C = 60) ───────
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

API_ENDPOINT = os.getenv(
    "API_ENDPOINT",
    "https://piano-tracker-api-production-d7b7.up.railway.app/sessions",
)

DEVICE_ID = os.environ.get("DEVICE_ID", "keysight-pi")
FAILED_SESSIONS_PATH = os.path.join(os.path.dirname(__file__), "failed_sessions.jsonl")

def note_number_to_name(note: int) -> str:
    """Convert MIDI note number to name, e.g. 60 → 'C4'"""
    octave = (note // 12) - 1
    name = NOTE_NAMES[note % 12]
    return f"{name}{octave}"


def save_failed_session(session: dict):
    """Persist failed sessions locally so they can be retried later."""
    try:
        with open(FAILED_SESSIONS_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(session, ensure_ascii=False) + "\n")
        print(f"💾 Saved failed session to {FAILED_SESSIONS_PATH}")
    except Exception as e:
        print(f"❌ Failed to save session locally: {e}")


def upload_session(session: dict) -> bool:
    """Upload a session to the API with retries and exponential backoff."""
    for attempt in range(1, 4):
        try:
            response = requests.post(API_ENDPOINT, json=session, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Session uploaded (id: {data.get('id')})")
                return True
            else:
                print(f"⚠️  Upload failed (attempt {attempt}/3): {response.status_code} {response.text}")
        except Exception as e:
            print(f"⚠️  Upload failed (attempt {attempt}/3): {e}")

        if attempt < 3:
            delay = 5 * (2 ** (attempt - 1))
            print(f"⏳ Retrying in {delay}s...")
            time.sleep(delay)

    save_failed_session(session)
    return False


def list_ports():
    """List all available MIDI input ports."""
    ports = mido.get_input_names()
    if not ports:
        print("❌  No MIDI input ports found.")
        print("    Make sure your piano is connected via USB and powered on.")
        sys.exit(1)

    print("\n🎹  Available MIDI Input Ports:")
    for i, port in enumerate(ports):
        print(f"    [{i}] {port}")
    print()
    return ports

def pick_port(ports: list) -> str:
    """Auto-select Roland FP-30 if found, otherwise ask the user."""
    # Try to auto-detect Roland
    for port in ports:
        if "roland" in port.lower() or "fp-30" in port.lower() or "fp30" in port.lower():
            print(f"✅  Auto-detected Roland: '{port}'")
            return port

    # If only one port, use it automatically
    if len(ports) == 1:
        print(f"✅  Using only available port: '{ports[0]}'")
        return ports[0]

    # Ask the user to choose
    while True:
        try:
            choice = int(input("Select port number: "))
            if 0 <= choice < len(ports):
                return ports[choice]
        except (ValueError, KeyboardInterrupt):
            pass
        print("Invalid choice. Try again.")

def bundle_session(port_name: str):
    """Listen to MIDI events and bundle into sessions."""
    print(f"\n🎵  Bundling sessions on '{port_name}' — sessions end after 5 minutes of silence.\n")

    with mido.open_input(port_name) as inport:
        session = None
        start_datetime = None
        total_time = 0.0
        last_msg_time = time.time()
        events = []
        total_notes = 0

        try:
            while True:
                msg = inport.poll()
                if msg:
                    if session is None:
                        # Start new session
                        session = {}
                        start_datetime = datetime.now(timezone.utc)
                        total_time = 0.0
                        events = []
                        total_notes = 0
                        print("🎹  New session started.")

                    total_time += msg.time
                    last_msg_time = time.time()
                    time_offset_ms = total_time * 1000.0

                    if msg.type == 'note_on' and msg.velocity > 0:
                        events.append({
                            "time_offset_ms": time_offset_ms,
                            "note": note_number_to_name(msg.note),
                            "velocity": msg.velocity,
                            "type": "note_on"
                        })
                        total_notes += 1
                    elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                        events.append({
                            "time_offset_ms": time_offset_ms,
                            "note": note_number_to_name(msg.note),
                            "velocity": 0,
                            "type": "note_off"
                        })
                else:
                    time.sleep(0.01)  # Poll every 10ms
                    if time.time() - last_msg_time > 300:  # 5 minutes of silence
                        if session and total_notes > 0:
                            # End session
                            ended_at = datetime.now(timezone.utc)
                            session.update({
                                "device_id": DEVICE_ID,
                                "started_at": start_datetime.isoformat().replace("+00:00", "Z"),
                                "ended_at": ended_at.isoformat().replace("+00:00", "Z"),
                                "duration_seconds": int((ended_at - start_datetime).total_seconds()),
                                "total_notes": total_notes,
                                "events": events
                            })
                            print("🎹  Session ended. JSON output:")
                            print(json.dumps(session, indent=2))
                            print()
                            upload_session(session)
                        elif session:
                            print("🎹  Session discarded (0 notes).")
                        # Reset for next session
                        session = None
                        start_datetime = None
                        total_time = 0.0
                        events = []
                        total_notes = 0
        except KeyboardInterrupt:
            if session and total_notes > 0:
                ended_at = datetime.now(timezone.utc)
                session.update({
                    "device_id": DEVICE_ID,
                    "started_at": start_datetime.isoformat().replace("+00:00", "Z"),
                    "ended_at": ended_at.isoformat().replace("+00:00", "Z"),
                    "duration_seconds": int((ended_at - start_datetime).total_seconds()),
                    "total_notes": total_notes,
                    "events": events
                })
                print("\n🎹  Session interrupted. JSON output:")
                print(json.dumps(session, indent=2))
                upload_session(session)
            print("\nGoodbye! 🎹")

def main():
    print("=" * 65)
    print("  🎹  Frictionless Piano Tracker — Session Bundler (Phase 2)")
    print("=" * 65)

    ports = list_ports()
    port_name = pick_port(ports)
    bundle_session(port_name)

if __name__ == "__main__":
    main()