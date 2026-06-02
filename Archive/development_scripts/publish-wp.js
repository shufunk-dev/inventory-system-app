const WP_URL = "https://its.shufunk.net";
const WP_USER = "shufunk";
const WP_APP_PASSWORD = "LMKF 9GFi Gzya i60T uXtm ScSh";

const authHeader = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

const htmlContent = `
<blockquote><p>We just rolled out a quick quality-of-life update via the new OTA updater! </p>
<p>Version 1.0.9 introduces a core application lock that prevents the system from accidentally launching multiple background servers if the shortcut is clicked multiple times. </p>
<p>Now, if the application is already running smoothly in your system tray, clicking the shortcut will instantly snap your existing window to the front of your screen. Clean, fast, and optimized!</p></blockquote>
`;

async function publish() {
  try {
    const response = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        title: "Update 1.0.9: Single Instance Lock",
        content: htmlContent,
        status: 'publish'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Published successfully! Link:", data.link);
    } else {
      const err = await response.text();
      console.error("Failed:", err);
    }
  } catch (e) {
    console.error(e);
  }
}

publish();
