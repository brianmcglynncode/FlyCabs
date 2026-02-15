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

    // Expose updateView globally for the HTML fallback
    window.updateView = updateView;

    function updateView() {
        if (!roleToggle) return;
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

    // --- Button-Based PWA Installation Logic ---
    let deferredPrompt;
    const installCards = document.querySelectorAll('.install-app-card');
    const iosGuide = document.getElementById('ios-guide');
    const closeGuideBtn = document.getElementById('close-guide-btn');

    // Detect iOS & Standalone
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    // Show cards for EVERYONE not in standalone mode (including PC)
    if (!isStandalone) {
        console.log("[FlyCabs] Not in standalone mode. Showing install options.");
        installCards.forEach(card => card.classList.remove('hidden'));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        console.log("[FlyCabs] beforeinstallprompt fired.");
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone) {
            installCards.forEach(card => card.classList.remove('hidden'));
        }
    });

    // Handle button clicks on installation cards
    installCards.forEach(card => {
        const btn = card.querySelector('.install-trigger-btn');
        btn.addEventListener('click', async () => {
            if (isIOS) {
                iosGuide.classList.remove('hidden');
            } else if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`[FlyCabs] Install outcome: ${outcome}`);
                if (outcome === 'accepted') {
                    installCards.forEach(c => c.classList.add('hidden'));
                }
                deferredPrompt = null;
            } else {
                // PC / Generic fallback if no prompt
                alert("To install: Use your browser's 'Install' or 'Add to Home Screen' option in the menu.");
            }
        });
    });

    closeGuideBtn.addEventListener('click', () => {
        iosGuide.classList.add('hidden');
    });

    iosGuide.addEventListener('click', (e) => {
        if (e.target === iosGuide) iosGuide.classList.add('hidden');
    });

    // Bind listeners and init
    if (roleToggle) roleToggle.addEventListener('change', updateView);
    if (statusBulb) statusBulb.parentElement.addEventListener('click', toggleDriverStatus);

    updateView();
});
