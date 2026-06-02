const blogData = {
  title: "From Web App to Standalone Desktop Powerhouse",
  content: `Today was a massive leap forward for the Inventory System! We officially converted the application from a Next.js web server requiring command prompt knowledge into a beautifully packaged, fully standalone **Windows Desktop App**.

Here are the major highlights from version 1.3.0 to 1.4.0 (Desktop 1.0.6):
- **Zero Configuration Setup**: Store owners simply run the .exe installer and the app launches. No more Node.js installations or command terminals!
- **Native Database Bundling**: The SQLite native drivers are now compiled and bundled directly into the installer.
- **Over-The-Air (OTA) Updates**: The desktop app now silently checks GitHub for updates in the background. 
- **Admin System Update Panel**: We built a custom bridge between the native desktop engine and the web dashboard, allowing the store owner to safely install downloaded updates directly from the Admin Control Panel with a single click.

This architecture ensures rock-solid stability and zero downtime for the local network!`,
  status: "publish"
};

async function publishBlog() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/blog/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blogData)
    });
    const data = await res.json();
    console.log("Response:", res.status, data);
  } catch (err) {
    console.error("Error publishing:", err.message);
  }
}

publishBlog();
