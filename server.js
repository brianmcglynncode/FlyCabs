const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '.')));

// In-memory driver state (resets on restart, which is fine for demo)
// In-memory driver state (resets on restart, which is fine for demo)
let connectedDrivers = [];

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
        // Store name, car, and pic
        connectedDrivers.push({ id, name, car, pic: req.body.pic, active });
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

const webpush = require('web-push');

// Generate these once with: npx web-push generate-vapid-keys --json
const publicVapidKey = 'BOXIN6A-B8zMI0VOoaidgfVsCOgG2kVeNaLdDxbrid1ezClrcXB27iDgUOXPUFjMbEROIzZbbKiO3vE1bZc7gOc';
const privateVapidKey = 'AKWWIJq_8J_e1WC6R3qI8y2PMk0CSPDr8TeVPiRfBPk';

webpush.setVapidDetails('mailto:admin@flycabs.com', publicVapidKey, privateVapidKey);

// Store subscriptions
let pushSubscriptions = []; // { id: 'driver-id', sub: {} }

app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    const { driverId } = req.query; // If driver, tag it

    // Remove old sub if exists
    pushSubscriptions = pushSubscriptions.filter(s => s.sub.endpoint !== subscription.endpoint);
    pushSubscriptions.push({ id: driverId || 'anon', sub: subscription });

    res.status(201).json({});
    console.log(`[Server] New Push Sub stored via ${driverId || 'anon'}`);
});

// Test Push Endpoint
app.post('/api/push-test', (req, res) => {
    const { driverId } = req.body;
    console.log(`[Server] 🧪 Test Push Requested for ${driverId}`);

    // Find the subscription
    const target = pushSubscriptions.find(s => s.id === driverId);

    if (target) {
        const payload = JSON.stringify({
            title: 'FlyCabs Notifications Working! 🔔',
            body: 'You are now ready to receive lift requests.',
            icon: '/icon.png'
        });

        webpush.sendNotification(target.sub, payload)
            .then(() => {
                console.log(`[Server] Test Push SENT to ${driverId}`);
                res.json({ success: true });
            })
            .catch(err => {
                console.error(`[Server] Test Push FAILED:`, err);
                res.status(500).json({ success: false, error: err.message });
            });
    } else {
        console.log(`[Server] Test Push: No subscription found for ${driverId}`);
        res.status(404).json({ success: false, error: "No subscription found" });
    }
});

// Trigger Notification Helper
const sendPushToDrivers = (message) => {
    console.log(`[Server] 📣 Sending Push to ${pushSubscriptions.length} drivers: ${message}`);

    pushSubscriptions.forEach(s => {
        const payload = JSON.stringify({ title: 'New Lift Request! 🚕', body: message });
        webpush.sendNotification(s.sub, payload)
            .then(res => console.log(`[Server] Push Sent to ${s.id}: ${res.statusCode}`))
            .catch(err => {
                console.error(`[Server] Push Failed to ${s.id}:`, err);
                if (err.statusCode === 410) {
                    // Cleanup dead subs
                    console.log(`[Server] Removing dead sub ${s.id}`);
                    pushSubscriptions = pushSubscriptions.filter(sub => sub.sub.endpoint !== s.sub.endpoint);
                }
            });
    });
};

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

    // 🔥 TRIGGER PUSH SUBSCRIPTIONS
    sendPushToDrivers(`€${price} from ${passengerName || 'Passenger'}`);

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

// Complete a request (Driver side)
app.post('/api/request/complete', (req, res) => {
    const { id } = req.body;
    const request = activeRequests.find(r => r.id === id);

    if (request) {
        request.status = 'completed';
        console.log(`[Server] Request ${id} COMPLETED`);
        res.json({ success: true });
    } else {
        res.json({ success: false });
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

// --- Chat System ---
const chatMessages = {}; // { requestId: [ { sender: 'passenger'|'driver', text: 'hi', timestamp: 123 } ] }

app.get('/api/chat/:requestId', (req, res) => {
    const { requestId } = req.params;
    res.json(chatMessages[requestId] || []);
});

app.post('/api/chat/send', (req, res) => {
    const { requestId, sender, text } = req.body;
    if (!chatMessages[requestId]) chatMessages[requestId] = [];

    const msg = { sender, text, timestamp: Date.now() };
    chatMessages[requestId].push(msg);

    // Limit history to 50 messages
    if (chatMessages[requestId].length > 50) chatMessages[requestId].shift();

    res.json({ success: true });
});

// Fallback for SPA
// Fallback for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`FlyCabs Server running on port ${port}`);
});
