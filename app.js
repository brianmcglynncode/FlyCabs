/**
 * FlyCabs Core Logic
 * Clean, robust, and premium.
 */

// State
let isDriverActive = false;
let currentRole = 'PASSENGER';
let deferredPrompt;

const drivers = [
    { id: 1, name: "Peadar", car: "Tesla Model 3", active: true },
    { id: 2, name: "Niamh", car: "VW ID.4", active: true },
    { id: 3, name: "John", car: "BMW iX", active: false }
];

// Global updateView for HTML fallback
window.updateView = function () {
    const roleToggle = document.getElementById('role-toggle');
    const modeText = document.getElementById('mode-text');
    const viewPassenger = document.getElementById('view-passenger');
    const viewDriver = document.getElementById('view-driver');

    if (!roleToggle || !modeText || !viewPassenger || !viewDriver) return;

    if (roleToggle.checked) {
        currentRole = 'DRIVER';
        modeText.textContent = "Driver Mode";
        viewPassenger.classList.remove('active');
        viewDriver.classList.add('active');
        document.body.classList.add('driver-mode');
    } else {
        currentRole = 'PASSENGER';
        modeText.textContent = "Passenger Mode";
        viewPassenger.classList.add('active');
        viewDriver.classList.remove('active');
        document.body.classList.remove('driver-mode');
        renderDrivers();
    }
};

function toggleDriverStatus() {
    isDriverActive = !isDriverActive;
    const statusText = document.getElementById('driver-status-text');
    document.body.classList.toggle('driver-active', isDriverActive);
    if (statusText) statusText.textContent = isDriverActive ? "You are Online" : "You are Offline";

    const requestList = document.getElementById('request-list');
    if (requestList) {
        if (isDriverActive) {
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
}

function renderDrivers() {
    const driverList = document.getElementById('driver-list');
    if (!driverList) return;
    const activeDrivers = drivers.filter(d => d.active);

    if (activeDrivers.length === 0) {
        driverList.innerHTML = `<div class="empty-state"><p>No drivers active right now.</p></div>`;
        return;
    }

    driverList.innerHTML = activeDrivers.map(d => `
        <div class="driver-card" onclick="openRequest('${d.name}')" style="background: #F5F7FA; padding: 16px; border-radius: 16px; display: flex; align-items: center; gap: 15px; cursor: pointer;">
            <div class="driver-avatar" style="font-size: 1.5rem;">👤</div>
            <div class="driver-details" style="flex: 1;">
                <strong>${d.name}</strong><br>
                <span style="font-size: 0.8rem; color: #7F8C8D;">${d.car}</span>
            </div>
            <span class="request-arrow">→</span>
        </div>
    `).join('');
}

window.openRequest = (name) => {
    document.getElementById('target-driver-name').textContent = name;
    document.getElementById('request-modal').classList.add('visible');
};

document.addEventListener('DOMContentLoaded', () => {
    // Basic Listeners
    const roleToggle = document.getElementById('role-toggle');
    const statusBulb = document.getElementById('status-bulb');
    const requestModal = document.getElementById('request-modal');
    const sendRequestBtn = document.getElementById('send-request-btn');
    const whatsappBtn = document.getElementById('whatsapp-invite');
    const paymentBtn = document.getElementById('payment-btn');
    const iosGuide = document.getElementById('ios-guide');
    const closeGuideBtn = document.getElementById('close-guide-btn');
    const installCards = document.querySelectorAll('.install-app-card');

    if (roleToggle) roleToggle.addEventListener('change', window.updateView);
    if (statusBulb) statusBulb.closest('.driver-status-card').addEventListener('click', toggleDriverStatus);

    if (requestModal) {
        requestModal.addEventListener('click', (e) => {
            if (e.target === requestModal) requestModal.classList.remove('visible');
        });
    }

    if (sendRequestBtn) {
        sendRequestBtn.addEventListener('click', () => {
            const price = document.getElementById('suggested-price').value || "10.00";
            alert(`Lift request sent with suggested price of €${price}!`);
            requestModal.classList.remove('visible');
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            const text = encodeURIComponent("Hey! Join my trusted circle on FlyCabs for lifts. Let's help each other out.");
            window.open(`https://wa.me/?text=${text}`, '_blank');
        });
    }

    if (paymentBtn) {
        paymentBtn.addEventListener('click', () => {
            window.open(`https://revolut.me/flycabs-demo`, '_blank');
        });
    }

    // PWA Logic
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (!isStandalone) {
        installCards.forEach(card => card.classList.remove('hidden'));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone) {
            installCards.forEach(card => card.classList.remove('hidden'));
        }
    });

    installCards.forEach(card => {
        const btn = card.querySelector('.install-trigger-btn');
        btn.addEventListener('click', async () => {
            if (isIOS) {
                iosGuide.classList.remove('hidden');
            } else if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    installCards.forEach(c => c.classList.add('hidden'));
                }
                deferredPrompt = null;
            } else {
                alert("To install: Use your browser's 'Add to Home Screen' option in the menu.");
            }
        });
    });

    if (closeGuideBtn) {
        closeGuideBtn.addEventListener('click', () => {
            iosGuide.classList.add('hidden');
        });
    }

    if (iosGuide) {
        iosGuide.addEventListener('click', (e) => {
            if (e.target === iosGuide) iosGuide.classList.add('hidden');
        });
    }

    window.updateView();
});
