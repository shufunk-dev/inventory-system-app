#!/bin/bash
set -e

echo "=========================================="
echo " Inventory System Appliance Setup Script  "
echo "=========================================="

# Ensure script is run with sudo
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo ./setup-appliance.sh)"
  exit
fi

# Ensure we are inside the web directory
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found."
  echo "Please CD into the 'inventory-system/web' directory and run the script from there!"
  exit
fi

# Store the non-root user who invoked sudo so we can run pm2 under their account
ACTUAL_USER=${SUDO_USER:-$USER}

echo "[1/4] Installing system dependencies (Avahi/mDNS, SQLite, Build Tools)..."
apt-get update
apt-get install -y curl avahi-daemon sqlite3 build-essential git

echo "[2/4] Installing Node.js (v20)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "[3/4] Installing PM2 and application dependencies..."
npm install -g pm2
# Run npm install as the actual user to prevent permission issues
sudo -u $ACTUAL_USER npm install

echo "[4/4] Configuring PM2 to auto-start Next.js..."
# Build the next.js app for production
sudo -u $ACTUAL_USER npm run build

# Start it with PM2 on port 3000
sudo -u $ACTUAL_USER pm2 start npm --name "inventory" -- start

# Save PM2 state and configure startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u $ACTUAL_USER --hp /home/$ACTUAL_USER
sudo -u $ACTUAL_USER pm2 save

echo "=========================================="
echo " Setup Complete! "
echo " Your Inventory Appliance is now running."
echo " You can access it from any device on your WiFi at:"
echo " http://inventory.local:3000"
echo "=========================================="
