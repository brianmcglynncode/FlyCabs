/**
 * FlyCabs Core Logic - Production v20 (Realtime & Stable)
 */

// Global State
window.FlyCabsState = {
    isDriverActive: localStorage.getItem('flycabs_status') === 'true', // Persist status
    deferredPrompt: null,
    drivers: [],
    activeRequests: [],
    // Persist Identity: Get existing ID or generate new one
    myDriverId: localStorage.getItem('flycabs_id') || 'driver-' + Math.random().toString(36).substr(2, 9),
    myDriverName: localStorage.getItem('flycabs_name') || "Driver " + Math.floor(Math.random() * 1000)
};

// Save ID immediately if new
if (!localStorage.getItem('flycabs_id')) {
    localStorage.setItem('flycabs_id', window.FlyCabsState.myDriverId);
    localStorage.setItem('flycabs_name', window.FlyCabsState.myDriverName);
}

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
                active: window.FlyCabsState.isDriverActive
            })
        });
        window.fetchDrivers();
    } catch (e) {
        console.error("Failed to sync driver status:", e);
    }

    window.renderRequests();
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

// Poll for drivers every 5 seconds
setInterval(window.fetchDrivers, 5000);
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

    rosterList.innerHTML = activeDrivers.map(d => `
        <div class="roster-item">
            <div class="roster-avatar">👤</div>
            <div class="roster-info">
                <strong>${d.name}</strong>
                <span>${d.car}</span>
            </div>
        </div>
    `).join('');

    rosterModal.classList.remove('hidden');
};

window.renderRequests = function () {
    const requestList = document.getElementById('request-list');
    if (!requestList) return;

    if (!window.FlyCabsState.isDriverActive) {
        requestList.innerHTML = `<div class="empty-state"><p>Turn on visibility to receive requests.</p></div>`;
        return;
    }

    if (window.FlyCabsState.activeRequests.length === 0) {
        requestList.innerHTML = `<div class="empty-state"><p>No active requests nearby.</p></div>`;
        return;
    }

    requestList.innerHTML = window.FlyCabsState.activeRequests.map((req, index) => `
        <div class="card request-card" style="background: #F5F7FA; padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); margin-bottom: 15px;">
            <div class="user-info">
                <strong>${req.from} → ${req.to}</strong><br>
                <span>Passenger Request</span>
            </div>
            <div class="bid-amount" style="margin: 10px 0; color: #1A1A2E; font-weight: 700;">Suggested: €${req.price}</div>
            <button class="primary-btn" onclick="window.acceptRequest(${index})" style="padding: 10px;">Accept Lift</button>
        </div>
    `).join('');
};

window.acceptRequest = function (index) {
    const req = window.FlyCabsState.activeRequests[index];
    alert(`Accepted lift from ${req.from} to ${req.to} for €${req.price}! Connecting...`);
    window.FlyCabsState.activeRequests.splice(index, 1);
    window.renderRequests();
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
    const APP_VERSION = "21.0.0";
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
        sendBroadcastBtn.addEventListener('click', () => {
            const price = document.getElementById('suggested-price').value || "15.00";
            const fromLoc = document.getElementById('request-from').value || "Current Location";
            const toLoc = document.getElementById('request-to').value || "Destination";

            window.FlyCabsState.activeRequests.push({ price, from: fromLoc, to: toLoc });
            alert(`Requesting a lift from ${fromLoc} to ${toLoc} (€${price})!`);
            if (broadcastModal) broadcastModal.classList.add('hidden');
        });
    }

    if (closeRosterBtn) {
        closeRosterBtn.addEventListener('click', () => rosterModal && rosterModal.classList.add('hidden'));
    }

    // Modal background clicks
    [broadcastModal, rosterModal, iosGuide].forEach(modal => {
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


    window.updateView();

    // Auto-Restore Online Status if needed
    if (window.FlyCabsState.isDriverActive) {
        // Optimistic UI Update
        document.body.classList.add('driver-active');
        const statusText = document.getElementById('driver-status-text');
        if (statusText) statusText.textContent = "You are Online";

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
    }
});
