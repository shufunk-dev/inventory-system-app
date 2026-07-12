# Remote Sync & Cloud Tunnels
 
 To support offsite audits, real-time remote backups, and web-based dashboards, the local register database can be synchronized securely to the cloud.
 
 ---
 
 ## 1. Networking Strategy: Port-Free Tunnels
 
 The system utilizes **Cloudflare Zero Trust Tunnels** to connect your local POS database to the internet. 
 * **No Port Forwarding**: Unlike traditional remote setups, you do not need to open router ports, configure static public IPs, or alter local firewalls.
 * **Asymmetric Security**: The local background process daemon initiates an outbound TCP handshake to Cloudflare's edge network, creating an encrypted, secure web tunnel.
 
 ---
 
 ## 2. Sync Methods
 
 Navigate to **Settings** > **Remote Sync & Dynamic Cloud Tunnels** to configure your sync settings:
 
 ### A. Managed Cloud Sync (Recommended)
 * **Description**: Automatically provisions a subdomain on our sync host (e.g. `https://yourshop.shufunk-sync.com`) and manages all authentication tokens.
 * **Requirements**: Enter a valid SaaS Stripe licensing activation key. The local server contacts our licensing server, verifies signatures, and pulls the secure connection token.
 
 ### B. Self-Hosted Cloud Sync
 * **Description**: Runs the background tunnel over your own domain using your custom Cloudflare account.
 * **Setup**: Enter your Cloudflare Tunnel token key into the settings field.
 
 ### C. Local Only (Sync Disabled)
 * **Description**: Tunnels are completely stopped. Communication is restricted to the local registry database and local Wi-Fi.
 
 ---
 
 ## 3. Spawner Daemon Lifecycle
 
 The server manages the Cloudflare process lifecycle automatically:
 * **Start/Connect**: Click the **Connect** action button. The server spawns the `cloudflared` binary locally using the configured token, writing output streams to `logs/tunnel.log`.
 * **Handshake Checking**: The system reads log streams. Once the connection confirmation handshake is logged, the dashboard card transitions to **Connected & Online** and displays the link URL.
 * **Stop/Disconnect**: Click **Disconnect** to send termination signals to the background process, closing the tunnel and turning the cloud URL link offline.
