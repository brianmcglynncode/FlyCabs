/**
 * FlyCabs Core Logic - Robust v13
 */

const APP_VERSION = "13.0.0";
console.log(`[FlyCabs] Initializing version ${APP_VERSION}`);

// Global State
window.FlyCabsState = {
    isDriverActive: false,
    deferredPrompt: null,
    drivers: [
        { id: 1, name: "Peadar", car: "Tesla Model 3", active: true },
        { id: 2, name: "Niamh", car: "VW ID.4", active: true },
        { id: 3, name: "John", car: "BMW iX", active: false }
    ],
    activeRequests: []
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
    } else {
        modeText.textContent = "Passenger Mode";
        viewPassenger.classList.add('active');
        viewDriver.classList.remove('active');
        document.body.classList.remove('driver-mode');
        window.renderDrivers();
    }
};

window.toggleDriverStatus = function () {
    window.FlyCabsState.isDriverActive = !window.FlyCabsState.isDriverActive;
    const statusText = document.getElementById('driver-status-text');
    document.body.classList.toggle('driver-active', window.FlyCabsState.isDriverActive);
    if (statusText) statusText.textContent = window.FlyCabsState.isDriverActive ? "You are Online" : "You are Offline";
    window.renderRequests();
};

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
                <strong>Passenger Request</strong><br>
                <span>Broadcast to all drivers</span>
            </div>
            <div class="bid-amount" style="margin: 10px 0; color: #1A1A2E; font-weight: 700;">Suggested: €${req.price}</div>
            <button class="primary-btn" onclick="window.acceptRequest(${index})" style="padding: 10px;">Accept Lift</button>
        </div>
    `).join('');
};

window.acceptRequest = function (index) {
    const req = window.FlyCabsState.activeRequests[index];
    alert(`You accepted the lift request for €${req.price}! Connecting you to passenger...`);
    window.FlyCabsState.activeRequests.splice(index, 1);
    window.renderRequests();
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
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
            window.FlyCabsState.activeRequests.push({ price });
            alert(`Requesting a lift (€${price}) from all online drivers!`);
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
            console.log("[FlyCabs] Install button clicked. Handing for iOS:", isIOS);
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

    // SW Update Logic
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log("[FlyCabs] New SW detected. Force reloading...");
            window.location.reload();
        });
    }

    window.updateView();
});
