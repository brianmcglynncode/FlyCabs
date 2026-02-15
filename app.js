/**
 * FlyCabs Core Logic - Reset & Robust v9
 */

const APP_VERSION = "9.0.0";
console.log(`[FlyCabs] Initializing version ${APP_VERSION}`);

// Global State
window.FlyCabsState = {
    isDriverActive: false,
    deferredPrompt: null,
    drivers: [
        { id: 1, name: "Peadar", car: "Tesla Model 3", active: true },
        { id: 2, name: "Niamh", car: "VW ID.4", active: true },
        { id: 3, name: "John", car: "BMW iX", active: false }
    ]
};

// Global Logic
window.updateView = function () {
    console.log("[FlyCabs] updateView triggered");
    const roleToggle = document.getElementById('role-toggle');
    const modeText = document.getElementById('mode-text');
    const viewPassenger = document.getElementById('view-passenger');
    const viewDriver = document.getElementById('view-driver');

    if (!roleToggle || !modeText || !viewPassenger || !viewDriver) {
        console.error("[FlyCabs] Missing critical UI elements for view update.");
        return;
    }

    if (roleToggle.checked) {
        console.log("[FlyCabs] Switching to DRIVER mode");
        modeText.textContent = "Driver Mode";
        viewPassenger.classList.remove('active');
        viewDriver.classList.add('active');
        document.body.classList.add('driver-mode');
        // Update navigation if needed
        document.querySelector('.mode-toggle').classList.add('on');
    } else {
        console.log("[FlyCabs] Switching to PASSENGER mode");
        modeText.textContent = "Passenger Mode";
        viewPassenger.classList.add('active');
        viewDriver.classList.remove('active');
        document.body.classList.remove('driver-mode');
        // Update navigation
        document.querySelector('.mode-toggle').classList.remove('on');
        window.renderDrivers();
    }
};

window.toggleDriverStatus = function () {
    window.FlyCabsState.isDriverActive = !window.FlyCabsState.isDriverActive;
    const statusText = document.getElementById('driver-status-text');
    document.body.classList.toggle('driver-active', window.FlyCabsState.isDriverActive);
    if (statusText) statusText.textContent = window.FlyCabsState.isDriverActive ? "You are Online" : "You are Offline";

    const requestList = document.getElementById('request-list');
    if (requestList) {
        if (window.FlyCabsState.isDriverActive) {
            requestList.innerHTML = `
                <div class="card request-card" style="background: #F5F7FA; padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05);">
                    <div class="user-info">
                        <strong>Brian</strong><br>
                        <span>Dublin to Airport</span>
                    </div>
                    <div class="bid-amount" style="margin: 10px 0; color: #1A1A2E; font-weight: 700;">Suggested: €25.00</div>
                    <button class="primary-btn" style="padding: 10px;">Accept Lift</button>
                </div>
            `;
        } else {
            requestList.innerHTML = `<div class="empty-state"><p>Turn on visibility to receive requests.</p></div>`;
        }
    }
};

window.renderDrivers = function () {
    const driverList = document.getElementById('driver-list');
    if (!driverList) return;
    const activeDrivers = window.FlyCabsState.drivers.filter(d => d.active);

    if (activeDrivers.length === 0) {
        driverList.innerHTML = `<div class="empty-state"><p>No drivers active right now.</p></div>`;
        return;
    }

    driverList.innerHTML = activeDrivers.map(d => `
        <div class="driver-card" onclick="window.openRequest('${d.name}')" style="background: #F5F7FA; padding: 16px; border-radius: 16px; display: flex; align-items: center; gap: 15px; cursor: pointer;">
            <div class="driver-avatar" style="font-size: 1.5rem;">👤</div>
            <div class="driver-details" style="flex: 1;">
                <strong>${d.name}</strong><br>
                <span style="font-size: 0.8rem; color: #7F8C8D;">${d.car}</span>
            </div>
            <span class="request-arrow">→</span>
        </div>
    `).join('');
};

window.openRequest = function (name) {
    document.getElementById('target-driver-name').textContent = name;
    document.getElementById('request-modal').classList.add('visible');
};

// Main Initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log("[FlyCabs] DOM Content Loaded");

    // Bind Toggle
    const roleToggle = document.getElementById('role-toggle');
    if (roleToggle) {
        roleToggle.addEventListener('change', window.updateView);
    }

    // Bind Driver Status
    const statusBulb = document.getElementById('status-bulb');
    if (statusBulb) {
        statusBulb.closest('.driver-status-card').addEventListener('click', window.toggleDriverStatus);
    }

    // Bind Integrations
    const whatsappBtn = document.getElementById('whatsapp-invite');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const text = encodeURIComponent("Hey! Join my trusted circle on FlyCabs for lifts. Let's help each other out.");
            window.open(`https://wa.me/?text=${text}`, '_blank');
        });
    }

    const paymentBtn = document.getElementById('payment-btn');
    if (paymentBtn) {
        paymentBtn.addEventListener('click', () => {
            window.open(`https://revolut.me/flycabs-demo`, '_blank');
        });
    }

    // PWA Trigger Logic
    const installCards = document.querySelectorAll('.install-app-card');
    const iosGuide = document.getElementById('ios-guide');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (!isStandalone) {
        console.log("[FlyCabs] PWA Install triggers enabled.");
        installCards.forEach(card => card.classList.remove('hidden'));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        console.log("[FlyCabs] beforeinstallprompt captured.");
        e.preventDefault();
        window.FlyCabsState.deferredPrompt = e;
    });

    installCards.forEach(card => {
        const btn = card.querySelector('.install-trigger-btn');
        btn.addEventListener('click', async () => {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

            if (isIOS) {
                iosGuide.classList.remove('hidden');
            } else if (window.FlyCabsState.deferredPrompt) {
                window.FlyCabsState.deferredPrompt.prompt();
                const { outcome } = await window.FlyCabsState.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    installCards.forEach(c => c.classList.add('hidden'));
                }
                window.FlyCabsState.deferredPrompt = null;
            } else {
                alert("To install: Use your browser's 'Add to Home Screen' or 'Install' menu.");
            }
        });
    });

    // Close Modal Logic
    const closeGuideBtn = document.getElementById('close-guide-btn');
    if (closeGuideBtn) {
        closeGuideBtn.addEventListener('click', () => iosGuide.classList.add('hidden'));
    }
    if (iosGuide) {
        iosGuide.addEventListener('click', (e) => {
            if (e.target === iosGuide) iosGuide.classList.add('hidden');
        });
    }

    const requestModal = document.getElementById('request-modal');
    if (requestModal) {
        requestModal.addEventListener('click', (e) => {
            if (e.target === requestModal) requestModal.classList.remove('visible');
        });
    }

    const sendRequestBtn = document.getElementById('send-request-btn');
    if (sendRequestBtn) {
        sendRequestBtn.addEventListener('click', () => {
            const price = document.getElementById('suggested-price').value || "10.00";
            alert(`Request sent at €${price}!`);
            requestModal.classList.remove('visible');
        });
    }

    // Initial View Run
    window.updateView();
});
