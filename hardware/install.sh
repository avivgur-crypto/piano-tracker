#!/bin/bash
set -e

echo "🎹 Installing Piano Tracker on Raspberry Pi..."

# Install Python dependencies
pip3 install -r /home/pi/piano-tracker/hardware/requirements.txt

# Copy service file
sudo cp /home/pi/piano-tracker/hardware/piano-tracker.service \
     /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable piano-tracker
sudo systemctl start piano-tracker

echo "✅ Installation complete! Service status:"
sudo systemctl status piano-tracker
