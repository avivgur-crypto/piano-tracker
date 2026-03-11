"""
Compare session MIDI events to score JSON and produce structured error report.
Session events: list of { time_offset_ms, note, velocity, type }.
Score JSON: { notes: [{ nameWithOctave, duration, measure, ... }], dynamics: [...] }.
"""

import json
from typing import Any, Dict, List


def _velocity_to_marking(velocity: int) -> str:
    """Map MIDI velocity to rough dynamics marking."""
    if velocity < 40:
        return "p"
    if velocity < 65:
        return "mp"
    if velocity < 95:
        return "mf"
    return "f"


def _normalize_note_name(name: str) -> str:
    """Normalize note string to match score (e.g. 'C4' or 'C#4')."""
    return (name or "").strip().replace(" ", "")


def compare_midi_to_score(
    midi_events: List[Dict[str, Any]],
    score_json: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compare performed MIDI events to the score.
    Returns wrong_notes, rhythm_errors, dynamics_errors.
    """
    wrong_notes: List[Dict[str, Any]] = []
    rhythm_errors: List[Dict[str, Any]] = []
    dynamics_errors: List[Dict[str, Any]] = []

    notes = score_json.get("notes") or []
    dynamics_by_measure: Dict[int, str] = {}
    for d in score_json.get("dynamics") or []:
        m = d.get("measure")
        if m is not None:
            dynamics_by_measure[int(m)] = str(d.get("marking", "mf"))

    if not notes:
        return {
            "wrong_notes": wrong_notes,
            "rhythm_errors": rhythm_errors,
            "dynamics_errors": dynamics_errors,
        }

    # Use only note-on events (or all if type not distinguished) and sort by time
    event_list = [e for e in (midi_events or []) if isinstance(e, dict)]
    note_ons = [
        e
        for e in event_list
        if e.get("type") in ("note_on", "note", "on", None) or "on" in str(e.get("type", "")).lower()
    ]
    if not note_ons and event_list:
        note_ons = event_list
    note_ons = sorted(note_ons, key=lambda e: e.get("time_offset_ms", 0))

    # Build note-off map to get duration (time_offset_ms of next same note off, or estimate)
    note_offs = {i: e for i, e in enumerate(event_list) if e.get("type") in ("note_off", "off") or "off" in str(e.get("type", "")).lower()}
    by_note_time: Dict[int, List[Dict]] = {}
    for i, e in enumerate(event_list):
        t = e.get("time_offset_ms", 0)
        if t not in by_note_time:
            by_note_time[t] = []
        by_note_time[t].append(e)

    # Pair note-on with note-off by matching note name and next off after this on
    def duration_ms_for(on_event: Dict) -> float:
        t_on = on_event.get("time_offset_ms", 0)
        note_name = _normalize_note_name(str(on_event.get("note", "")))
        for e in event_list:
            if e.get("time_offset_ms", 0) <= t_on:
                continue
            if _normalize_note_name(str(e.get("note", ""))) == note_name and (
                e.get("type") in ("note_off", "off") or "off" in str(e.get("type", "")).lower()
            ):
                return e.get("time_offset_ms", t_on) - t_on
        return 0.0  # unknown

    # Align by order: first N performed notes vs first N score notes
    expected = notes
    performed = note_ons[: len(expected) + 50]  # allow some extra performed notes

    for i, exp in enumerate(expected):
        if i >= len(performed):
            break
        perf = performed[i]
        exp_name = _normalize_note_name(str(exp.get("nameWithOctave", "")))
        played_name = _normalize_note_name(str(perf.get("note", "")))
        measure = exp.get("measure")

        if exp_name != played_name:
            wrong_notes.append({
                "measure": measure,
                "expected": exp_name or "?",
                "played": played_name or "?",
            })

        exp_dur = float(exp.get("duration", 0.25))
        perf_dur_ms = duration_ms_for(perf)
        if perf_dur_ms > 0 and exp_dur > 0:
            # Convert expected duration (quarters) to ms: assume 120 BPM = 500 ms per quarter
            exp_ms = exp_dur * 500
            ratio = perf_dur_ms / exp_ms if exp_ms else 0
            if ratio < 0.5 or ratio > 2.0:
                rhythm_errors.append({
                    "measure": measure,
                    "expected": round(exp_dur, 2),
                    "played": round(perf_dur_ms / 500.0, 2),
                })

        vel = perf.get("velocity", 64)
        expected_marking = dynamics_by_measure.get(measure) if measure is not None else None
        if expected_marking:
            actual_marking = _velocity_to_marking(vel)
            if actual_marking != expected_marking.lower().replace(" ", ""):
                dynamics_errors.append({
                    "measure": measure,
                    "expected": expected_marking,
                    "actual_velocity": vel,
                })

    return {
        "wrong_notes": wrong_notes,
        "rhythm_errors": rhythm_errors,
        "dynamics_errors": dynamics_errors,
    }
