const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

// 📁 Log-Verzeichnis erstellen
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// 🛡️ Middleware
app.use(express.json());
app.use(express.static('public'));

// 📌 Tracking-Endpoint
app.post('/track', (req, res) => {
    const { lat, lng, accuracy, method, ip } = req.body;
    
    // 🎯 Genauigkeitscheck (min. 2km)
    const isAccurate = (accuracy <= 2000); 
    
    const logData = {
        timestamp: new Date().toISOString(),
        coordinates: { lat, lng },
        accuracy: `${accuracy}m`,
        method,
        ip,
        status: isAccurate ? "✅ ERFOLG" : "❌ UNGENAU"
    };

    // 📝 Log speichern
    fs.appendFileSync(
        path.join(LOG_DIR, 'tracking.log'),
        JSON.stringify(logData) + '\n'
    );

    res.sendStatus(200);
});

// 🚀 Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
