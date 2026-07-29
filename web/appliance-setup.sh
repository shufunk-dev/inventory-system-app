#!/bin/bash

# ==============================================================================
# Inventory System Appliance Setup Script (Beta 1.0)
# 
# Run this script on a fresh Ubuntu Server installation to turn it into a 
# standalone, persistent Inventory Appliance.
#
# Usage: 
# 1. Boot into your fresh Ubuntu install.
# 2. Copy your 'inventory-system' project folder to the machine.
# 3. CD into the 'inventory-system/web' directory.
# 4. Run: sudo ./appliance-setup.sh
# ==============================================================================

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (use sudo)"
  exit
fi

echo "============================================="
echo "  Starting Appliance Setup...                "
echo "============================================="

# 1. Update and Install Dependencies
echo "[1/6] Updating system and installing dependencies..."
apt-get update
apt-get upgrade -y
apt-get install -y curl nginx ufw build-essential

# 2. Install Node.js (LTS)
echo "[2/6] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g npm@latest

# 3. Install PM2 (Process Manager to run Next.js in the background)
echo "[3/6] Installing PM2..."
npm install -g pm2

# 4. Setup the Web App
echo "[4/6] Installing Web App Dependencies and Building..."
# Ensure we are in the 'web' directory
if [ ! -f "package.json" ]; then
    echo "ERROR: You must run this script from inside the 'web' directory of the project!"
    exit 1
fi

echo ""
read -p "Do you want to WIPE the existing database and uploads for a fresh 'factory' install? (y/N): " factory_reset
if [[ "$factory_reset" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Wiping database and uploads..."
    rm -f inventory.db
    rm -rf public/uploads/*
    echo "Clean slate ready."
fi
echo ""

npm install
echo "Building the Next.js production app (this may take a few minutes)..."
npm run build

# 5. Configure PM2 to start the app on boot
echo "[5/6] Configuring background services..."
pm2 start npm --name "inventory-app" -- run start
pm2 save
# Generate startup script for the current user (using the original user who ran sudo)
env PATH=$PATH:/usr/bin pm2 startup systemd -u ${SUDO_USER:-root} --hp /home/${SUDO_USER:-root}

# 6. Configure Nginx and Firewall
echo "[6/6] Configuring Nginx Reverse Proxy and Firewall..."

# Setup Nginx to forward Port 80 to Port 3000
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    client_max_body_size 500M; # Allow large ZIP uploads on local network

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Restart Nginx
systemctl restart nginx

# Configure Firewall
ufw allow 'Nginx Full'
ufw allow OpenSSH
echo "y" | ufw enable

echo "============================================="
echo "  Appliance Setup Complete!                  "
echo "============================================="
echo ""
echo "Your USB Drive/Machine is now a dedicated Inventory Server."
echo "Whenever you turn this computer on, it will automatically start."
echo ""
echo "You can access it from your phone by typing this machine's IP address into your browser."
ip addr show | grep 'inet ' | awk '{print $2}' | cut -d/ -f1
