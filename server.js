const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// In-memory driver state (resets on restart, which is fine for demo)
let connectedDrivers = [
    // Pre-populate with our favorite bots for the empty state
    { id: 'bot-1', name: "Peadar (Bot)", car: "Tesla Model 3", active: true },
    { id: 'bot-2', name: "Niamh (Bot)", car: "VW ID.4", active: true }
];

// Get all active drivers
app.get('/api/drivers', (req, res) => {
    res.json(connectedDrivers);
});

// Register/Update driver status
app.post('/api/driver/status', (req, res) => {
    const { id, name, car, active } = req.body;

    // Remove existing entry if exists
    connectedDrivers = connectedDrivers.filter(d => d.id !== id);

    if (active) {
        connectedDrivers.push({ id, name, car, active });
        console.log(`[Server] Driver ${name} is ONLINE`);
    } else {
        console.log(`[Server] Driver ${name} is OFFLINE`);
    }

    res.json({ success: true, count: connectedDrivers.length });
});

// Fallback for SPA
// Fallback for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`FlyCabs Server running on port ${port}`);
});
