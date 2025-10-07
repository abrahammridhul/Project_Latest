# FloodSafe — static demo

FloodSafe is a small static website demo that provides a client-side flood warning dashboard. It includes pages for emergency contacts, current weather (uses OpenWeatherMap API optionally), and a flood alerts section backed by localStorage.

Files:
- `index.html` — main dashboard with alert reporting form
- `weather.html` — fetch current weather (requires OpenWeatherMap API key for live data)
- `flood.html` — list of stored flood alerts
- `emergency.html` — emergency numbers and tips
- `styles.css` — styles
- `script.js` — client-side logic



Notes:
- Alerts are stored locally in the browser's localStorage. They are not sent to any server.
- For live weather use an OpenWeatherMap API key on `weather.html`.
