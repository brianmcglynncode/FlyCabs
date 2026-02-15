document.addEventListener('DOMContentLoaded', () => {
    // Role & View Management
    const roleToggle = document.getElementById('role-toggle');
    const modeText = document.getElementById('mode-text');
    const viewPassenger = document.getElementById('view-passenger');
    const viewDriver = document.getElementById('view-driver');
    const statusBulb = document.getElementById('status-bulb');
    const statusText = document.getElementById('driver-status-text');

    // Bottom Sheet
    const requestModal = document.getElementById('request-modal');
    const sendRequestBtn = document.getElementById('send-request-btn');

    // Integrations
    const whatsappBtn = document.getElementById('whatsapp-invite');
    const paymentBtn = document.getElementById('payment-btn');

    // State
    let isDriverActive = false;
    let currentRole = 'PASSENGER';

    // Simulated Drivers
    const drivers = [
        { id: 1, name: "Peadar", car: "Tesla Model 3", active: true },
        { id: 2, name: "Niamh", car: "VW ID.4", active: true },
        { id: 3, name: "John", car: "BMW iX", active: false }
    ];

    function updateView() {
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
    }

    function toggleDriverStatus() {
        isDriverActive = !isDriverActive;
        document.body.classList.toggle('driver-active', isDriverActive);
        statusText.textContent = isDriverActive ? "You are Online" : "You are Offline";

        const requestList = document.getElementById('request-list');
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

    function renderDrivers() {
        const driverList = document.getElementById('driver-list');
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
        requestModal.classList.add('visible');
    };

    requestModal.addEventListener('click', (e) => {
        if (e.target === requestModal) requestModal.classList.remove('visible');
    });

    sendRequestBtn.addEventListener('click', () => {
        const price = document.getElementById('suggested-price').value || "10.00";
        alert(`Lift request sent with suggested price of €${price}!`);
        requestModal.classList.remove('visible');
    });

    whatsappBtn.addEventListener('click', () => {
        const text = encodeURIComponent("Hey! Join my trusted circle on FlyCabs for lifts. Let's help each other out.");
        window.open(`https://wa.me/?text=${text}`, '_blank');
    });

    paymentBtn.addEventListener('click', () => {
        window.open(`https://revolut.me/flycabs-demo`, '_blank');
    });

    // --- PWA Installation Logic ---
    let deferredPrompt;
    const pwaBanner = document.getElementById('pwa-install-banner');
    const pwaBtn = document.getElementById('pwa-install-btn');
    const pwaClose = document.getElementById('pwa-close-btn');
    const pwaHint = document.getElementById('pwa-hint');

    // Detect iOS & Mobile Safari
    const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isIOS) {
        document.body.classList.add('is-ios');
        const shareIcon = '⎋'; // Approximated Share Icon
        pwaHint.innerHTML = `Tap the <span style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px;">${shareIcon}</span> icon then <strong>"Add to Home Screen"</strong>`;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone) {
            console.log("[FlyCabs] PWA Install Prompt Available.");
            pwaBanner.classList.remove('hidden');
        }
    });

    // Forced display for iOS (since they don't have beforeinstallprompt)
    if (isIOS && !isStandalone && !localStorage.getItem('pwa_banner_closed')) {
        console.log("[FlyCabs] iOS detected, showing installation hint.");
        // Short delay to ensure browser rendering is stable
        setTimeout(() => {
            pwaBanner.classList.remove('hidden');
        }, 1000);
    }

    pwaBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User responded to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        pwaBanner.classList.add('hidden');
    });

    pwaClose.addEventListener('click', () => {
        pwaBanner.classList.add('hidden');
        localStorage.setItem('pwa_banner_closed', 'true');
    });

    updateView();
});
