# Frictionless Piano Tracker

A B2B2C SaaS for piano practice tracking.

## Overview

This project captures MIDI data from a Roland FP-30 piano connected via USB to a Raspberry Pi Zero 2W, and sends practice sessions to the cloud.

## Project Structure

- `hardware/`: Raspberry Pi code for MIDI listening
- `backend/`: Python FastAPI server with PostgreSQL database
- `frontend/`: Web interface for users

## Getting Started

### Hardware Setup

1. Connect Roland FP-30 to Raspberry Pi Zero 2W via USB.
2. Run `midi_listener.py` in `hardware/` to capture MIDI events.

### Backend Setup

1. Install Python dependencies.
2. Set up PostgreSQL database.
3. Run FastAPI server.

### Frontend Setup

1. Install Node.js dependencies.
2. Run development server.

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.