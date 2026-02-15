const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));
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

// Request Management
let activeRequests = [];

// Get active requests (only pending ones for drivers)
app.get('/api/requests', (req, res) => {
    res.json(activeRequests.filter(r => r.status === 'pending'));
});

// Create a new request
app.post('/api/request', (req, res) => {
    const { from, to, price, passengerId, passengerName, passengerPic } = req.body;
    const newRequest = {
        id: Date.now().toString(), // Simple ID
        from,
        to,
        price,
        passengerId,
        passengerName,
        passengerPic,
        status: 'pending',
        driverName: null,
        timestamp: Date.now()
    };
    activeRequests.push(newRequest);

    // Cleanup old requests (> 10 mins)
    const tenMinutesAgo = Date.now() - 600000;
    activeRequests = activeRequests.filter(r => r.timestamp > tenMinutesAgo);

    console.log(`[Server] New Request: ${from} -> ${to} (€${price})`);
    res.json({ success: true, requestId: newRequest.id });
});

// Check status of a specific request
app.get('/api/request/:id/status', (req, res) => {
    const reqId = req.params.id;
    const request = activeRequests.find(r => r.id === reqId);
    if (request) {
        res.json({ status: request.status, driverName: request.driverName, driverPic: request.driverPic });
    } else {
        res.json({ status: 'not_found' });
    }
});

// Accept a request
app.post('/api/request/accept', (req, res) => {
    const { id, driverName, driverPic } = req.body;
    const request = activeRequests.find(r => r.id === id);

    if (request && request.status === 'pending') {
        request.status = 'accepted';
        request.driverName = driverName;
        request.driverPic = driverPic;
        console.log(`[Server] Request ${id} accepted by ${driverName}`);
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Request not available" });
    }
});

// Cancel a request (Passenger side)
app.post('/api/request/cancel', (req, res) => {
    const { id } = req.body;
    const index = activeRequests.findIndex(r => r.id === id);
    if (index !== -1) {
        activeRequests.splice(index, 1); // Remove it completely
        console.log(`[Server] Request ${id} cancelled by passenger`);
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Fallback for SPA
// Fallback for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`FlyCabs Server running on port ${port}`);
});
