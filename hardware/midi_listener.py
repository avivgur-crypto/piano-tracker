#!/usr/bin/env python3
"""
Frictionless Piano Tracker — Phase 1 POC
MIDI Listener: connects to Roland FP-30 (or any USB MIDI device)
and prints human-readable events to the console in real-time.
"""

import mido
import os
import sys
import threading
import time
from datetime import datetime, timezone

import requests

# ─── MIDI note number → human-readable note name (C4 = middle C = 60) ───────
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def note_number_to_name(note: int) -> str:
    """Convert MIDI note number to name, e.g. 60 → 'C4'"""
    octave = (note // 12) - 1
    name = NOTE_NAMES[note % 12]
    return f"{name}{octave}"

def velocity_to_label(velocity: int) -> str:
    """Give a human feel to the velocity value."""
    if velocity == 0:
        return "silent (0)"
    elif velocity < 32:
        return f"very soft ({velocity})"
    elif velocity < 64:
        return f"soft ({velocity})"
    elif velocity < 96:
        return f"medium ({velocity})"
    else:
        return f"strong ({velocity})"

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

API_URL = os.environ.get("API_URL", "https://piano-tracker-backend-production.up.railway.app")
DEVICE_ID = os.environ.get("DEVICE_ID", "keysight-pi")
STUDENT_ID = int(os.environ.get("STUDENT_ID", "2"))
# Session is uploaded to the server after this many seconds with no new notes (or on Ctrl+C).
# Production: set API_URL to your Railway URL (e.g. https://your-app.up.railway.app).
SILENCE_TIMEOUT = 5  # seconds of silence before session auto-ends


def _get_active_session():
    """Fetch the active session for this device. Returns (student_id, piece_id) or None if 404/error."""
    try:
        resp = requests.get(f"{API_URL}/sessions/active/{DEVICE_ID}", timeout=5)
        if resp.ok:
            data = resp.json()
            sid = data.get("student_id", STUDENT_ID)
            pid = data.get("piece_id")
            print(f"    [active] student_id={sid}, piece_id={pid}")
            return sid, pid
        if resp.status_code == 404:
            print("    [active] 404 — Waiting for student to click Start in the app…")
    except Exception as e:
        print(f"    [active] Could not fetch active session: {e}")
    return None


# Cache (student_id, piece_id) when we have an active session so we still have it
# after the student clicks "Stop" (which clears active before the 5s silence fires).
_cached_active: tuple = (None, None)


def _send_session(events, start_perf, end_perf, total_notes):
    """POST collected events to the backend API.

    start_perf / end_perf are time.perf_counter() values.
    Wall-clock ISO timestamps are derived from time.time() for the API payload.
    """
    global _cached_active
    active = _get_active_session()
    if active is not None:
        _cached_active = active
    student_id, piece_id = _cached_active[0], _cached_active[1]
    if student_id is None:
        student_id = STUDENT_ID
        print("\n⚠️ No active session cached — using default STUDENT_ID. Start practicing from the app first.")
    else:
        print(f"\n📤 Sending session (student_id={student_id}, piece_id={piece_id})…")

    now_wall = time.time()
    now_perf = time.perf_counter()
    started_wall = now_wall - (now_perf - start_perf)
    ended_wall = now_wall - (now_perf - end_perf)
    duration = int(end_perf - start_perf)

    started_iso = datetime.fromtimestamp(started_wall, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ended_iso = datetime.fromtimestamp(ended_wall, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "device_id": DEVICE_ID,
        "student_id": student_id,
        "started_at": started_iso,
        "ended_at": ended_iso,
        "duration_seconds": duration,
        "total_notes": total_notes,
        "events": events,
    }
    if piece_id is not None:
        payload["piece_id"] = piece_id
    try:
        resp = requests.post(f"{API_URL}/sessions", json=payload, timeout=10)
        if resp.ok:
            print(f"\n✅  Session sent to server! ({total_notes} notes, {duration}s)")
        else:
            print(f"\n⚠️  Server responded {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"\n⚠️  Failed to send session: {e}")


def listen(port_name: str):
    """Open the MIDI port and print events in real-time."""
    global _cached_active
    print(f"\n🎵  Listening on '{port_name}' — press Ctrl+C to stop.")
    print(f"    Auto-send after {SILENCE_TIMEOUT}s of silence  |  API: {API_URL}  |  device: {DEVICE_ID}  |  default student_id: {STUDENT_ID}\n")
    print(f"{'TIME':<12} {'EVENT':<12} {'NOTE':<8} {'VELOCITY':<20} {'CHANNEL'}")
    print("─" * 65)

    session_start = time.perf_counter()
    note_count = 0
    events = []
    last_note_on_time = time.monotonic()
    silence_timer = None
    session_active = True
    had_cleared_for_current_active = False

    lock = threading.Lock()

    def _on_silence():
        """Called when silence timeout fires (runs in timer thread)."""
        nonlocal session_start, note_count, events, session_active, had_cleared_for_current_active
        print(f"\n⏱  Silence detected ({SILENCE_TIMEOUT}s) — sending session…")
        with lock:
            if not events:
                print("    (no events to send)")
                return
            snapshot = list(events)
            snap_count = note_count
            snap_start = session_start
            end_perf = time.perf_counter()
            events.clear()
            note_count = 0
            session_start = time.perf_counter()
            session_active = True
            had_cleared_for_current_active = False
        _send_session(snapshot, snap_start, end_perf, snap_count)

    def _reset_silence_timer():
        """Restart the silence countdown."""
        nonlocal silence_timer
        if silence_timer is not None:
            silence_timer.cancel()
        silence_timer = threading.Timer(SILENCE_TIMEOUT, _on_silence)
        silence_timer.daemon = True
        silence_timer.start()
        

    try:
        with mido.open_input(port_name) as inport:
            for msg in inport:
                now_perf = time.perf_counter()
                elapsed = now_perf - session_start
                elapsed_ms = elapsed * 1000.0
                timestamp = f"{int(elapsed // 60):02d}:{elapsed % 60:05.2f}"

                # ── Note On ────────────────────────────────────────────────
                if msg.type == 'note_on' and msg.velocity > 0:
                    note_name = note_number_to_name(msg.note)
                    vel_label = velocity_to_label(msg.velocity)
                    print(
                        f"{timestamp:<12} {'NOTE ON':<12} {note_name:<8} "
                        f"{vel_label:<20} ch={msg.channel + 1}"
                    )
                    active = _get_active_session()
                    with lock:
                        if active is not None:
                            _cached_active = active
                            if not had_cleared_for_current_active:
                                events.clear()
                                note_count = 0
                                session_start = now_perf
                                had_cleared_for_current_active = True
                        elapsed_ms = (now_perf - session_start) * 1000.0
                        note_count += 1
                        events.append({
                            "time_offset_ms": elapsed_ms,
                            "note": note_name,
                            "velocity": msg.velocity,
                            "type": "note_on",
                        })
                    last_note_on_time = time.monotonic()
                    _reset_silence_timer()

                # ── Note Off (or note_on with velocity 0) ──────────────────
                elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                    note_name = note_number_to_name(msg.note)
                    print(
                        f"{timestamp:<12} {'NOTE OFF':<12} {note_name:<8} "
                        f"{'─':<20} ch={msg.channel + 1}"
                    )
                    with lock:
                        events.append({
                            "time_offset_ms": elapsed_ms,
                            "note": note_name,
                            "velocity": 0,
                            "type": "note_off",
                        })

                # ── Control Change (sustain pedal, etc.) ───────────────────
                elif msg.type == 'control_change':
                    if msg.control == 64:  # sustain pedal (CC 64)
                        state = "DOWN 🦶" if msg.value >= 64 else "UP"
                        print(f"{timestamp:<12} {'SUSTAIN':<12} {state}")
                        if not had_cleared_for_current_active:
                            active = _get_active_session()
                        with lock:
                            if had_cleared_for_current_active:
                                events.append({
                                    "type": "sustain",
                                    "value": msg.value,
                                    "time": (now_perf - session_start) * 1000.0,
                                })
                            elif not had_cleared_for_current_active and active is not None:
                                _cached_active = active
                                events.clear()
                                note_count = 0
                                session_start = now_perf
                                had_cleared_for_current_active = True
                                events.append({
                                    "type": "sustain",
                                    "value": msg.value,
                                    "time": 0.0,
                                })
                    else:
                        print(
                            f"{timestamp:<12} {'CC':<12} ctrl={msg.control:<5} "
                            f"val={msg.value}"
                        )

                # ── Program Change (patch/instrument) ─────────────────────
                elif msg.type == 'program_change':
                    print(f"{timestamp:<12} {'PROG CHG':<12} program={msg.program}")

    except KeyboardInterrupt:
        if silence_timer is not None:
            silence_timer.cancel()
        with lock:
            snapshot = list(events)
            snap_count = note_count
            snap_start = session_start
        end_perf = time.perf_counter()
        if snapshot:
            print("\n\n📤  Sending remaining events before exit…")
            _send_session(snapshot, snap_start, end_perf, snap_count)
        else:
            print("\n\n    (no unsent events)")
        duration = end_perf - snap_start
        minutes = int(duration // 60)
        seconds = duration % 60
        print(f"\n📊  Session Summary")
        print(f"    Duration  : {minutes}m {seconds:.1f}s")
        print(f"    Notes hit : {snap_count}")
        print("    Goodbye! 🎹\n")


def main():
    print("=" * 65)
    print("  🎹  Frictionless Piano Tracker — MIDI Listener (Phase 1 POC)")
    print("=" * 65)
    print(f"  API_URL  = {API_URL}")
    print(f"  DEVICE_ID = {DEVICE_ID} (GET /sessions/active/{{device_id}} must match student app)")
    print("=" * 65)

    ports = list_ports()
    port_name = pick_port(ports)
    listen(port_name)


if __name__ == "__main__":
    main()
    