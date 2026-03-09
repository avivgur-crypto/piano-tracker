# Hardware / Raspberry Pi Setup

This folder contains the Raspberry Pi code and scripts for running the **Piano Tracker** MIDI session bundler.

## Contents

- `session_bundler.py` — captures MIDI events and uploads sessions to the backend API.
- `requirements.txt` — Python dependencies (requests, mido, python-rtmidi, etc.).
- `piano-tracker.service` — systemd service configuration for running the bundler on boot.
- `install.sh` — install script to configure the service on the Pi.

## Deploying to Raspberry Pi

1. SSH into your Pi and clone the repo:

   ```bash
   git clone <your-repo-url> ~/piano-tracker
   cd ~/piano-tracker/hardware
   ```

2. Run the installer script:

   ```bash
   chmod +x install.sh
   ./install.sh
   ```

This will install Python requirements, copy the systemd service file, and start the `piano-tracker` service.

## Checking Logs

To follow the service logs in real-time:

```bash
journalctl -u piano-tracker -f
```

## Restarting the Service

If you need to restart the bundler:

```bash
sudo systemctl restart piano-tracker
```
