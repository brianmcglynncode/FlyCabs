/**
 * FlyCabs Core Logic - Production v20 (Realtime & Stable)
 */

// Global State
window.FlyCabsState = {
    isDriverActive: localStorage.getItem('flycabs_status') === 'true', // Persist status
    deferredPrompt: null,
    drivers: [],
    activeRequests: [],
    // Passenger Context
    currentRequestId: localStorage.getItem('flycabs_request_id') || null,
    myPassengerName: localStorage.getItem('flycabs_passenger_name') || "Passenger " + Math.floor(Math.random() * 1000),
    // Identity
    myDriverId: localStorage.getItem('flycabs_id') || 'user-' + Math.random().toString(36).substr(2, 9),
    myDriverName: localStorage.getItem('flycabs_name') || "Driver " + Math.floor(Math.random() * 1000),
    myDriverPic: localStorage.getItem('flycabs_driver_pic') || null, // Base64
    myPassengerPic: localStorage.getItem('flycabs_passenger_pic') || null // Base64
};

// Save ID immediately if new
if (!localStorage.getItem('flycabs_id')) {
    localStorage.setItem('flycabs_id', window.FlyCabsState.myDriverId);
    localStorage.setItem('flycabs_name', window.FlyCabsState.myDriverName);
    localStorage.setItem('flycabs_passenger_name', window.FlyCabsState.myPassengerName);
}

// --- GPS Logic ---
window.useGPS = function () {
    const fromInput = document.getElementById('request-from');
    if (!navigator.geolocation) {
        alert("GPS not supported");
        return;
    }
    fromInput.placeholder = "Locating...";
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            fromInput.value = "Current Location"; // Mock for speed
            // fromInput.value = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        },
        (err) => {
            alert("GPS Error: " + err.message);
            fromInput.placeholder = "Current Location";
        }
    );
};

// --- Profile Upload Logic ---
window.handleProfileUpload = function (input, type) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const base64 = e.target.result;
            if (type === 'driver') {
                window.FlyCabsState.myDriverPic = base64;
                localStorage.setItem('flycabs_driver_pic', base64);
                window.updateProfileDisplays();
            } else {
                window.FlyCabsState.myPassengerPic = base64;
                localStorage.setItem('flycabs_passenger_pic', base64);
                window.updateProfileDisplays();
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.editDriverProfile = function () {
    const nameStr = prompt("Edit Driver Name:", window.FlyCabsState.myDriverName);
    if (nameStr) {
        window.FlyCabsState.myDriverName = nameStr;
        localStorage.setItem('flycabs_name', nameStr);
        window.updateProfileDisplays();
    }
    if (confirm("Update Profile Picture as well?")) {
        const fileInput = document.getElementById('driver-file-input');
        if (fileInput) fileInput.click();
    }
};

window.updateProfileDisplays = function () {
    // Driver Pic
    const dPreview = document.getElementById('driver-profile-preview');
    if (dPreview) {
        dPreview.style.backgroundImage = window.FlyCabsState.myDriverPic ? `url(${window.FlyCabsState.myDriverPic})` : '';
        dPreview.textContent = window.FlyCabsState.myDriverPic ? '' : '📷';
        // Ensure flex centering for the emoji
        dPreview.style.display = 'flex';
        dPreview.style.alignItems = 'center';
        dPreview.style.justifyContent = 'center';
    }
    const dName = document.getElementById('current-driver-name');
    if (dName) dName.textContent = window.FlyCabsState.myDriverName;

    // Passenger Pic
    const pPreview = document.getElementById('passenger-profile-preview');
    if (pPreview) {
        pPreview.style.backgroundImage = window.FlyCabsState.myPassengerPic ? `url(${window.FlyCabsState.myPassengerPic})` : '';
        pPreview.textContent = window.FlyCabsState.myPassengerPic ? '' : '📷';
        pPreview.style.display = 'flex';
        pPreview.style.alignItems = 'center';
        pPreview.style.justifyContent = 'center';
    }
    const pName = document.getElementById('passenger-welcome-name');
    if (pName) pName.textContent = `Hi, ${window.FlyCabsState.myPassengerName}`;
};

// ... global logic ...

window.editPassengerName = function () {
    const currentName = window.FlyCabsState.myPassengerName;
    const newName = prompt("Enter your Name for Drivers to see:", currentName.startsWith("Passenger ") ? "" : currentName);
    if (newName && newName.trim() !== "") {
        window.FlyCabsState.myPassengerName = newName.trim();
        localStorage.setItem('flycabs_passenger_name', window.FlyCabsState.myPassengerName);
        document.getElementById('passenger-welcome-name').textContent = `Hi, ${window.FlyCabsState.myPassengerName}`;
    }
};

// ... fetchRequests ...

window.renderRequests = function () {
    const requestList = document.getElementById('request-list');
    if (!requestList) return;

    if (!window.FlyCabsState.isDriverActive) {
        requestList.innerHTML = `<div class="empty-state"><p>Turn on visibility to receive requests.</p></div>`;
        return;
    }

    // Filter out my own requests
    const othersRequests = window.FlyCabsState.activeRequests.filter(req => req.passengerId !== window.FlyCabsState.myDriverId);

    if (othersRequests.length === 0) {
        requestList.innerHTML = `<div class="empty-state"><p>No active requests nearby.</p></div>`;
        return;
    }

    requestList.innerHTML = othersRequests.map((req, index) => {
        const picHtml = req.passengerPic ?
            `<div style="width:40px; height:40px; border-radius:50%; background-image:url('${req.passengerPic}'); background-size:cover; flex-shrink:0;"></div>` :
            `<div style="width:40px; height:40px; border-radius:50%; background:#ddd; display:flex; align-items:center; justify-content:center; flex-shrink:0;">👤</div>`;

        return `
        <div class="card request-card" style="background: #F5F7FA; padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); margin-bottom: 15px;">
            <div class="user-info" style="display:flex; gap:12px; align-items:center;">
                ${picHtml}
                <div>
                    <strong style="color: #000;">${req.passengerName || 'Passenger'}</strong><br>
                    <span style="font-size:0.85rem; color:#666;">${req.from} → ${req.to}</span>
                </div>
            </div>
            <div class="bid-amount" style="margin: 10px 0 10px 52px; color: #1A1A2E; font-weight: 700;">Suggested: €${req.price}</div>
            <button class="primary-btn" onclick="window.acceptRequest(${index})" style="padding: 10px;">Accept Lift</button>
        </div>
    `}).join('');
};

// Global Logic
window.updateView = function () {
    console.log("[FlyCabs] updateView triggered");
    const roleToggle = document.getElementById('role-toggle');
    const modeText = document.getElementById('mode-text');
    const viewPassenger = document.getElementById('view-passenger');
    const viewDriver = document.getElementById('view-driver');

    if (!roleToggle || !modeText || !viewPassenger || !viewDriver) return;

    if (roleToggle.checked) {
        modeText.textContent = "Driver Mode";
        viewPassenger.classList.remove('active');
        viewDriver.classList.add('active');
        document.body.classList.add('driver-mode');
        const nameEl = document.getElementById('current-driver-name');
        if (nameEl) nameEl.textContent = window.FlyCabsState.myDriverName;
    } else {
        modeText.textContent = "Passenger Mode";
        viewPassenger.classList.add('active');
        viewDriver.classList.remove('active');
        document.body.classList.remove('driver-mode');
        window.renderDrivers();
    }
};

window.toggleDriverStatus = async function () {
    // 1. Name Check: If default name, allow user to set it once
    if (window.FlyCabsState.myDriverName.startsWith("Driver ")) {
        const newName = prompt("Enter your Name for the Driver Roster:", window.FlyCabsState.myDriverName);
        if (newName && newName.trim() !== "") {
            window.FlyCabsState.myDriverName = newName.trim();
            localStorage.setItem('flycabs_name', window.FlyCabsState.myDriverName);
        }
    }

    window.FlyCabsState.isDriverActive = !window.FlyCabsState.isDriverActive;

    // 2. Persist Status
    localStorage.setItem('flycabs_status', window.FlyCabsState.isDriverActive);

    const statusText = document.getElementById('driver-status-text');
    const statusBulb = document.getElementById('status-bulb');

    document.body.classList.toggle('driver-active', window.FlyCabsState.isDriverActive);
    if (statusText) statusText.textContent = window.FlyCabsState.isDriverActive ? "You are Online" : "You are Offline";

    // Sync with Server
    try {
        await fetch('/api/driver/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: window.FlyCabsState.myDriverId,
                name: window.FlyCabsState.myDriverName,
                car: "Local Driver",
                pic: window.FlyCabsState.myDriverPic, // Send Pic!
                active: window.FlyCabsState.isDriverActive
            })
        });
        window.fetchDrivers();
    } catch (e) {
        console.error("Failed to sync driver status:", e);
    }

    window.renderRequests();
};

window.editDriverName = async function () {
    const currentName = window.FlyCabsState.myDriverName;
    const newName = prompt("Update your Driver Name:", currentName.startsWith("Driver ") ? "" : currentName);

    if (newName && newName.trim() !== "") {
        // 1. Update State & Storage
        window.FlyCabsState.myDriverName = newName.trim();
        localStorage.setItem('flycabs_name', window.FlyCabsState.myDriverName);

        // 2. Update UI
        const nameEl = document.getElementById('current-driver-name');
        if (nameEl) nameEl.textContent = window.FlyCabsState.myDriverName;

        // 3. Sync with Server (if online)
        if (window.FlyCabsState.isDriverActive) {
            try {
                await fetch('/api/driver/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: window.FlyCabsState.myDriverId,
                        name: window.FlyCabsState.myDriverName,
                        car: "Local Driver",
                        pic: window.FlyCabsState.myDriverPic,
                        active: true
                    })
                });
                window.fetchDrivers(); // Refresh roster
            } catch (e) {
                console.error("Failed to sync name update:", e);
            }
        }
    }
};

window.fetchDrivers = async function () {
    try {
        const res = await fetch('/api/drivers');
        if (res.ok) {
            window.FlyCabsState.drivers = await res.json();
            window.renderDrivers();
        }
    } catch (e) {
        console.error("Failed to fetch drivers:", e);
    }
};

// Poll for drivers and requests
setInterval(() => {
    window.fetchDrivers();
    if (window.FlyCabsState.isDriverActive) window.fetchRequests();

    // CRITICAL FIX: Always check request status if we have an ID
    // This ensures we catch 'accepted' -> 'completed' transitions
    if (window.FlyCabsState.currentRequestId) {
        window.checkRequestStatus();
    }
}, 2000); // Increased frequency to 2s for better responsiveness

// Dedicated Chat Poller (Faster: 1s)
setInterval(() => {
    if (window.FlyCabsState.currentRequestId) {
        window.pollChat();
    }
}, 1000);

// Initial fetch
window.fetchDrivers();

window.renderDrivers = function () {
    const activeCount = window.FlyCabsState.drivers.filter(d => d.active).length;
    const countElement = document.getElementById('drivers-online-count');
    if (countElement) countElement.textContent = `${activeCount} Drivers Online`;
};

window.showDriverRoster = function () {
    const rosterList = document.getElementById('roster-list');
    const rosterModal = document.getElementById('driver-roster-modal');
    const activeDrivers = window.FlyCabsState.drivers.filter(d => d.active);

    if (!rosterList || !rosterModal) return;

    rosterList.innerHTML = activeDrivers.map(d => {
        // Driver ID might be used for caching or checks
        // Currently we don't store driverPic in connectedDrivers on server, 
        // effectively only 'local' drivers would have it if we synced it.
        // For now, we'll try to use d.pic if available (requires server update to store it)
        // OR fallback.

        // Wait, the /api/driver/status endpoint needs to ACCEPT 'pic'.
        // Let's assume for this specific request we just want to SHOW it in UI if present.
        // We need to ensure the register/update loop sends it.

        // Since we didn't add 'pic' to the /api/driver/status payload yet, this might remain empty 
        // unless we fix that path too. But let's add the UI logic first.

        let picHtml = `<div class="roster-avatar">👤</div>`;
        // If we had a pic property: 
        // if(d.pic) picHtml = `<div class="roster-avatar" style="background-image:url('${d.pic}'); background-size:cover; color:transparent;"></div>`;

        return `
        <div class="roster-item">
            ${picHtml}
            <div class="roster-info">
                <strong>${d.name}</strong>
                <span>${d.car}</span>
            </div>
        </div>
    `}).join('');

    rosterModal.classList.remove('hidden');
};

window.fetchRequests = async function () {
    try {
        const res = await fetch('/api/requests');
        if (res.ok) {
            window.FlyCabsState.activeRequests = await res.json();
            window.renderRequests();
        }
    } catch (e) {
        console.error("Failed to fetch requests:", e);
    }
};

// [Duplicate renderRequests removed]

// UI State Manager to prevent overlaps
window.updatePassengerUI = function (state, data = {}) {
    console.log(`[FlyCabs] Switching UI to: ${state}`);
    try {
        const hero = document.querySelector('.hero-section');
        const waitingCard = document.getElementById('passenger-waiting-card');
        const acceptedCard = document.getElementById('passenger-accepted-card');
        const reqModal = document.getElementById('request-modal');

        // FORCE HIDE ALL FIRST
        if (hero) hero.style.display = 'none'; // Inline override
        if (waitingCard) waitingCard.style.display = 'none';
        if (acceptedCard) acceptedCard.style.display = 'none';

        // Safety: If we aren't in HOME, hiding the modal via display ensures no overlap.
        // We will un-hide it explicitly in HOME block.
        // We keep the class logic for transitions, but display:none is the nuclear option for the overlap bug.
        if (state !== 'HOME' && reqModal) {
            reqModal.style.display = 'none';
            reqModal.classList.add('hidden');
        }

        // Also toggle classes for safety
        if (hero) hero.classList.add('hidden');
        if (waitingCard) waitingCard.classList.add('hidden');
        if (acceptedCard) acceptedCard.classList.add('hidden');

        // Show active
        if (state === 'HOME') {
            if (hero) {
                hero.style.display = ''; // Clear inline
                hero.classList.remove('hidden');
            }
            // Ensure Request Modal is visible in Home state (it's a bottom sheet)
            if (reqModal) {
                reqModal.style.display = ''; // Restore default (block/flex)
                // Small timeout to allow display to apply before removing hidden class (for transition)
                setTimeout(() => {
                    reqModal.classList.remove('hidden');
                    reqModal.classList.add('visible');
                }, 10);
            }
        } else if (state === 'WAITING') {
            if (waitingCard) {
                waitingCard.style.display = ''; // Clear inline
                waitingCard.classList.remove('hidden');
            }
            // HIDE Request Modal - Already handled by top block, but ensuring
        } else if (state === 'ACCEPTED') {
            if (acceptedCard) {
                acceptedCard.style.display = ''; // Clear inline
                acceptedCard.classList.remove('hidden');
            }
            // HIDE Request Modal - Already handled by top block

            const nameEl = document.getElementById('accepted-driver-name');
            if (nameEl && data.driverName) nameEl.textContent = data.driverName;

            // Driver Pic
            const picEl = document.getElementById('accepted-driver-pic');
            if (picEl) {
                if (data.driverPic) {
                    picEl.style.backgroundImage = `url(${data.driverPic})`;
                    picEl.style.backgroundSize = 'cover';
                    picEl.textContent = '';
                } else {
                    picEl.style.backgroundImage = '';
                    picEl.textContent = '🚕';
                }
            }
        }
    } catch (e) {
        console.error("[FlyCabs] UI Update Failed:", e);
    }
};

window.checkRequestStatus = async function () {
    if (!window.FlyCabsState.currentRequestId) return;

    try {
        const res = await fetch(`/api/request/${window.FlyCabsState.currentRequestId}/status`);
        const data = await res.json();

        if (data.status === 'accepted') {
            window.updatePassengerUI('ACCEPTED', {
                driverName: data.driverName,
                driverPic: data.driverPic
            });
            // DO NOT CLEAR REQUEST ID HERE! We need it for chat.
            // window.FlyCabsState.currentRequestId = null; 
        } else if (data.status === 'completed') {
            // Driver finished the trip - Show Success Card
            console.log("[Passenger] Trip Completed detected!");

            // hide accepted card, show completion card
            document.getElementById('passenger-accepted-card').classList.add('hidden');
            const completionCard = document.getElementById('passenger-completion-card');
            if (completionCard) {
                completionCard.classList.remove('hidden');
                completionCard.style.display = 'block';
            }

            // Clear Request ID Immediately to stop polling
            window.FlyCabsState.currentRequestId = null;
            localStorage.removeItem('flycabs_request_id');

            // Wait 3 seconds then go home
            setTimeout(() => {
                if (completionCard) completionCard.classList.add('hidden');
                window.resetPassengerFlow();
            }, 3000);
        }
    } catch (e) {
        console.error("Poll status failed:", e);
    }
};

window.cancelRequest = async function () {
    if (!window.FlyCabsState.currentRequestId) return;

    if (confirm("Cancel your request?")) {
        try {
            await fetch('/api/request/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: window.FlyCabsState.currentRequestId })
            });
            // Re-enable alert for feedback since user reported it "not working"
            alert("Request Cancelled.");
            window.FlyCabsState.currentRequestId = null;
            localStorage.removeItem('flycabs_request_id');
            window.updatePassengerUI('HOME');
        } catch (e) {
            console.error("Failed to cancel:", e);
        }
    }
};

window.resetPassengerFlow = function () {
    console.log("[FlyCabs] Resetting passenger flow (Trip Complete)");
    window.FlyCabsState.currentRequestId = null;
    localStorage.removeItem('flycabs_request_id');

    // Hide all cards explicitly
    document.getElementById('passenger-waiting-card').classList.add('hidden');
    document.getElementById('passenger-accepted-card').classList.add('hidden');
    document.getElementById('request-modal').classList.remove('hidden');

    // Clear Chat
    const chatContainer = document.getElementById('passenger-chat-messages');
    if (chatContainer) chatContainer.innerHTML = '';

    window.updatePassengerUI('HOME');
};



// --- Chat Logic ---
window.pollChat = async function () {
    if (!window.FlyCabsState.currentRequestId) return;

    try {
        const res = await fetch(`/api/chat/${window.FlyCabsState.currentRequestId}`);
        if (res.ok) {
            const messages = await res.json();

            // Fix: Determine role based on ACTIVE VIEW, not just driver status
            const isDriverView = document.getElementById('view-driver').classList.contains('active');
            const role = isDriverView ? 'driver' : 'passenger';

            // Console Debugging (Remove in prod)
            // console.log(`[Chat Poll] Role: ${role}, Msgs: ${messages.length}`);

            window.renderChat(messages, role);
        }
    } catch (e) {
        console.error("Chat poll failed", e);
    }
};

window.sendChat = async function (sender) {
    const inputId = sender === 'driver' ? 'driver-chat-input' : 'passenger-chat-input';
    const input = document.getElementById(inputId);
    const text = input.value.trim();

    if (!text || !window.FlyCabsState.currentRequestId) return;

    try {
        await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestId: window.FlyCabsState.currentRequestId,
                sender: sender,
                text: text
            })
        });
        input.value = '';
        window.pollChat(); // Instant update
    } catch (e) {
        console.error("Send failed", e);
    }
};

window.renderChat = function (messages, myRole) {
    const containerId = myRole === 'driver' ? 'driver-chat-messages' : 'passenger-chat-messages';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = messages.map(msg => {
        const isMe = msg.sender === myRole;
        return `<div class="chat-bubble ${isMe ? 'me' : 'them'}">${msg.text}</div>`;
    }).join('');

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
};

// Driver: Complete Trip
// Payment Logic
window.togglePaymentMethod = function () {
    const current = document.getElementById('passenger-payment-method').textContent;
    const next = current === 'Cash' ? 'Visa •••• 4242' : 'Cash';
    document.getElementById('passenger-payment-method').textContent = next;
    // Persist if needed in State
    window.FlyCabsState.paymentMethod = next;
};

// Driver: Complete Trip (With Payment Simulation)
window.completeTripDriver = function () {
    const btn = document.querySelector('#driver-active-trip-card .primary-btn');
    const originalText = btn.textContent;

    // 1. Processing State
    btn.textContent = "Processing Payment...";
    btn.disabled = true;
    btn.style.background = "#95A5A6"; // Gray

    setTimeout(() => {
        // 2. Success State
        const isCard = window.FlyCabsState.paymentMethod !== 'Cash'; // Default assumption or sync
        // NOTE: In real app, driver would check what passenger set. 
        // For local demo, we assume "Visa" if not specified, or we could sync it via the request object.
        // Let's just mock "Success" for now.

        btn.textContent = "Payment Successful! ✅";
        btn.style.background = "#2ECC71"; // Green

        setTimeout(() => {
            // 3. Reset Flow
            window.FlyCabsState.currentRequestId = null;

            // Hide Active Card, Show Queue
            document.getElementById('driver-active-trip-card').classList.add('hidden');
            document.querySelector('.request-queue').classList.remove('hidden');

            // Restore button
            btn.textContent = originalText;
            btn.disabled = false;
            btn.style.background = ""; // Default

            // --- Earnings Logic ---
            const priceText = document.getElementById('active-trip-price').textContent;
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

            // Update State
            window.FlyCabsState.earnings = (window.FlyCabsState.earnings || 0) + price;
            window.FlyCabsState.trips = (window.FlyCabsState.trips || 0) + 1;

            // Save to LocalStorage
            localStorage.setItem('flycabs_earnings', window.FlyCabsState.earnings.toFixed(2));
            localStorage.setItem('flycabs_trips', window.FlyCabsState.trips);

            // Update UI
            window.updateEarningsUI();

            alert(`Trip Completed! You earned €${price.toFixed(2)}.`);
        }, 1500);
    }, 2000);
};

window.updateEarningsUI = function () {
    const earnings = window.FlyCabsState.earnings || 0;
    const trips = window.FlyCabsState.trips || 0;
    document.getElementById('driver-earnings-display').textContent = earnings.toFixed(2);
    document.getElementById('driver-trips-display').textContent = trips;
};

// ... existing acceptRequest logic ...

window.acceptRequest = async function (index) {
    const req = window.FlyCabsState.activeRequests[index];
    if (confirm(`Accept lift for €${req.price}?`)) {
        try {
            await fetch('/api/request/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: req.id, // Use actual ID
                    driverName: window.FlyCabsState.myDriverName,
                    driverPic: window.FlyCabsState.myDriverPic
                })
            });

            // DRIVE MODE: Switch to Active Trip UI
            window.FlyCabsState.currentRequestId = req.id; // Track ID for chat

            const queueDiv = document.querySelector('.request-queue');
            const activeCard = document.getElementById('driver-active-trip-card');

            if (queueDiv) queueDiv.classList.add('hidden');
            if (activeCard) {
                activeCard.classList.remove('hidden');
                // Populate Info
                document.getElementById('active-passenger-name').textContent = req.passengerName || "Passenger";
                document.getElementById('active-trip-dest').textContent = `To: ${req.to}`;
                document.getElementById('active-trip-price').textContent = `€${req.price}`;

                const pPic = document.getElementById('active-passenger-pic');
                if (req.passengerPic) {
                    pPic.style.backgroundImage = `url('${req.passengerPic}')`;
                } else {
                    pPic.style.backgroundImage = '';
                }
            }

            alert(`Lift Accepted! Head to ${req.from}.`);
            // activeRequests will clear on next poll
        } catch (e) {
            console.error("Failed to accept request:", e);
        }
    }
};

// Nuclear Reset: Clear SW and Caches to force update on iOS
window.nuclearReset = async function () {
    if (confirm("This will clear app data and force the latest update. Continue?")) {
        console.log("[FlyCabs] Starting nuclear reset...");

        // 1. Unregister all service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
        }

        // 2. Clear all caches
        if ('caches' in window) {
            const keys = await caches.keys();
            for (let key of keys) {
                await caches.delete(key);
            }
        }

        // 3. Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // 4. Force reload from server
        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
    }
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    const APP_VERSION = "23.0.36";
    console.log(`[FlyCabs] Initializing version ${APP_VERSION}`);

    const roleToggle = document.getElementById('role-toggle');
    const statusBulb = document.getElementById('status-bulb');
    const broadcastModal = document.getElementById('request-modal');
    const sendBroadcastBtn = document.getElementById('send-broadcast-btn');
    const closeRosterBtn = document.getElementById('close-roster-btn');
    const rosterModal = document.getElementById('driver-roster-modal');
    const iosGuide = document.getElementById('ios-guide');
    const installCards = document.querySelectorAll('.install-app-card');

    if (roleToggle) roleToggle.addEventListener('change', window.updateView);
    if (statusBulb) statusBulb.closest('.driver-status-card').addEventListener('click', window.toggleDriverStatus);

    if (sendBroadcastBtn) {
        sendBroadcastBtn.addEventListener('click', async () => {
            const price = document.getElementById('suggested-price').value || "15.00";
            const fromLoc = document.getElementById('request-from').value || "Current Location";
            const toLoc = document.getElementById('request-to').value || "Destination";

            try {
                const res = await fetch('/api/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: fromLoc,
                        to: toLoc,
                        price,
                        passengerId: window.FlyCabsState.myDriverId, // Reuse ID as user ID
                        passengerName: window.FlyCabsState.myPassengerName,
                        passengerPic: window.FlyCabsState.myPassengerPic
                    })
                });
                const data = await res.json();

                if (data.success) {
                    window.FlyCabsState.currentRequestId = data.requestId;
                    localStorage.setItem('flycabs_request_id', data.requestId);

                    // UI: Hide Form, Show Waiting
                    if (broadcastModal) broadcastModal.classList.add('hidden');
                    window.updatePassengerUI('WAITING');

                    // SILENCED: alert(`Request sent! Waiting for drivers...`);
                }
            } catch (e) {
                console.error("Failed to send request:", e);
                // Keep error alert
                alert("Failed to send request. Check connection.");
            }
        });
    }

    if (closeRosterBtn) {
        closeRosterBtn.addEventListener('click', () => rosterModal && rosterModal.classList.add('hidden'));
    }

    // Modal background clicks
    // Modal background clicks (Only for Roster and Guide now)
    [rosterModal, iosGuide].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }
    });

    // PWA & iOS Detection
    const isIOS = /iPhone|iPad|iPod/.test(navigator.platform) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor));

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    console.log(`[FlyCabs] PWA/iOS Detection: isIOS=${isIOS}, isStandalone=${isStandalone}`);

    if (!isStandalone) {
        installCards.forEach(c => c.classList.remove('hidden'));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.FlyCabsState.deferredPrompt = e;
    });

    installCards.forEach(card => {
        const btn = card.querySelector('.install-trigger-btn');
        btn.addEventListener('click', async () => {
            if (isIOS) {
                if (iosGuide) iosGuide.classList.remove('hidden');
            } else if (window.FlyCabsState.deferredPrompt) {
                window.FlyCabsState.deferredPrompt.prompt();
                const { outcome } = await window.FlyCabsState.deferredPrompt.userChoice;
                if (outcome === 'accepted') installCards.forEach(c => c.classList.add('hidden'));
                window.FlyCabsState.deferredPrompt = null;
            } else {
                alert("To install: Use your browser menu to 'Add to Home Screen'.");
            }
        });
    });

    // Integrations Fix
    const inviteBtn = document.getElementById('whatsapp-invite');
    const payBtn = document.getElementById('payment-btn');

    if (inviteBtn) {
        inviteBtn.onclick = () => {
            window.open(`https://wa.me/?text=${encodeURIComponent("Hey! Join my trusted circle on FlyCabs for lifts.")}`, '_blank');
        };
    }

    if (payBtn) {
        payBtn.onclick = () => {
            window.open(`https://revolut.me/flycabs-demo`, '_blank');
        };
    }

    // SW Update Logic (Network-First & Version Polling)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log("[FlyCabs] New version detected! Reloading...");
            window.location.reload();
        });

        const checkUpdates = async () => {
            // 1. Check Service Worker
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
                registration.update();
            }

            // 2. Poll version.json (Bypass Cache)
            try {
                const response = await fetch(`./version.json?t=${Date.now()}`);
                if (response.ok) {
                    const data = await response.json();
                    const serverVersion = data.version;
                    const localVersion = APP_VERSION; // Fixed: Use dynamic variable

                    if (serverVersion !== localVersion) {
                        console.log(`[FlyCabs] Version mismatch! Server: ${serverVersion}, Local: ${localVersion}. Forcing reload...`);

                        // Clear cache and reload
                        if ('caches' in window) {
                            const keys = await caches.keys();
                            for (let key of keys) await caches.delete(key);
                        }
                        window.location.reload(true);
                    }
                }
            } catch (e) {
                console.error("[FlyCabs] Version check failed:", e);
            }
        };

        window.addEventListener('focus', checkUpdates);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkUpdates();
        });

        // Initial check on load
        setTimeout(checkUpdates, 1000);
    }


    // Initialize View
    window.updateView();

    // Safety: Force UI to HOME state (hidden cards) on load
    // This cleans up any HTML-default visible cards if JS hasn't run yet
    window.updatePassengerUI('HOME');

    // Init Passenger Name
    window.updateProfileDisplays();

    // Auto-Restore Online Status if needed
    if (window.FlyCabsState.isDriverActive) {
        // Optimistic UI Update
        document.body.classList.add('driver-active');
        const statusText = document.getElementById('driver-status-text');
        if (statusText) statusText.textContent = "You are Online";

        // Try Push Sub
        window.subscribeUserToPush();
    }
});

// --- Push Notifications ---
const publicVapidKey = 'BOXIN6A-B8zMI0VOoaidgfVsCOgG2kVeNaLdDxbrid1ezClrcXB27iDgUOXPUFjMbEROIzZbbKiO3vE1bZc7gOc';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

window.subscribeUserToPush = async function () {
    if (!('serviceWorker' in navigator)) return;

    try {
        const register = await navigator.serviceWorker.ready;

        // Check if existing sub
        const existingSub = await register.pushManager.getSubscription();
        if (existingSub) {
            console.log("[FlyCabs] Already subscribed to push");
            return; // Already good
        }

        const subscription = await register.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        console.log("[FlyCabs] Push Subscribed!");

        // Send to Server
        await fetch('/api/subscribe?driverId=' + window.FlyCabsState.myDriverId, {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
                'content-type': 'application/json'
            }
        });
    } catch (e) {
        console.error("Push Sub Failed:", e);
    }
};

// Also trigger on manual toggle
const originalToggle = window.toggleDriverStatus;
window.toggleDriverStatus = async function () {
    await originalToggle(); // Call original
    if (window.FlyCabsState.isDriverActive) {
        window.subscribeUserToPush();
    }
};
// Re-announce to server
fetch('/api/driver/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        id: window.FlyCabsState.myDriverId,
        name: window.FlyCabsState.myDriverName,
        car: "Local Driver",
        active: true
    })
}).catch(e => console.error("Failed to restore online status:", e));
