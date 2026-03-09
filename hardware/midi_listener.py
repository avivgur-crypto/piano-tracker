#!/usr/bin/env python3
"""
Frictionless Piano Tracker — Phase 1 POC
MIDI Listener: connects to Roland FP-30 (or any USB MIDI device)
and prints human-readable events to the console in real-time.
"""

import mido
import sys
from datetime import datetime

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

def listen(port_name: str):
    """Open the MIDI port and print events in real-time."""
    print(f"\n🎵  Listening on '{port_name}' — press Ctrl+C to stop.\n")
    print(f"{'TIME':<12} {'EVENT':<12} {'NOTE':<8} {'VELOCITY':<20} {'CHANNEL'}")
    print("─" * 65)

    session_start = datetime.now()
    note_count = 0

    try:
        with mido.open_input(port_name) as inport:
            for msg in inport:
                now = datetime.now()
                elapsed = (now - session_start).total_seconds()
                timestamp = f"{int(elapsed // 60):02d}:{elapsed % 60:05.2f}"

                # ── Note On ────────────────────────────────────────────────
                if msg.type == 'note_on' and msg.velocity > 0:
                    note_name = note_number_to_name(msg.note)
                    vel_label = velocity_to_label(msg.velocity)
                    print(
                        f"{timestamp:<12} {'NOTE ON':<12} {note_name:<8} "
                        f"{vel_label:<20} ch={msg.channel + 1}"
                    )
                    note_count += 1

                # ── Note Off (or note_on with velocity 0) ──────────────────
                elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                    note_name = note_number_to_name(msg.note)
                    print(
                        f"{timestamp:<12} {'NOTE OFF':<12} {note_name:<8} "
                        f"{'─':<20} ch={msg.channel + 1}"
                    )

                # ── Control Change (sustain pedal, etc.) ───────────────────
                elif msg.type == 'control_change':
                    if msg.control == 64:  # sustain pedal
                        state = "DOWN 🦶" if msg.value >= 64 else "UP"
                        print(f"{timestamp:<12} {'SUSTAIN':<12} {state}")
                    else:
                        print(
                            f"{timestamp:<12} {'CC':<12} ctrl={msg.control:<5} "
                            f"val={msg.value}"
                        )

                # ── Program Change (patch/instrument) ─────────────────────
                elif msg.type == 'program_change':
                    print(f"{timestamp:<12} {'PROG CHG':<12} program={msg.program}")

    except KeyboardInterrupt:
        duration = (datetime.now() - session_start).total_seconds()
        minutes = int(duration // 60)
        seconds = duration % 60
        print(f"\n\n📊  Session Summary")
        print(f"    Duration  : {minutes}m {seconds:.1f}s")
        print(f"    Notes hit : {note_count}")
        print("    Goodbye! 🎹\n")


def main():
    print("=" * 65)
    print("  🎹  Frictionless Piano Tracker — MIDI Listener (Phase 1 POC)")
    print("=" * 65)

    ports = list_ports()
    port_name = pick_port(ports)
    listen(port_name)


if __name__ == "__main__":
    main()
    