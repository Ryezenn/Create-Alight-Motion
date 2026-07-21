// app.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Dashboard Layout
    const sidebar = document.getElementById('sidebar');
    const btnHamburger = document.getElementById('btn-hamburger');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    const menuItems = document.querySelectorAll('.menu-item');
    const headerTitleText = document.getElementById('header-title-text');
    const dashboardViews = document.querySelectorAll('.dashboard-view');
    const btnShortcutActivator = document.getElementById('btn-shortcut-activator');

    // DOM Elements - Activator Wizard
    const appCard = document.querySelector('.app-card');
    const formStep1 = document.getElementById('form-step-1');
    const formStep2 = document.getElementById('form-step-2');
    const inputEmail = document.getElementById('input-email');
    const inputMagicLink = document.getElementById('input-magic-link');
    
    // Buttons
    const btnSendLink = document.getElementById('btn-send-link');
    const btnActivate = document.getElementById('btn-activate');
    const btnBackStep1 = document.getElementById('btn-back-step-1');
    const btnRestart = document.getElementById('btn-restart');
    
    // Step indicators
    const indicatorStep1 = document.getElementById('indicator-step-1');
    const indicatorStep2 = document.getElementById('indicator-step-2');
    const indicatorStep3 = document.getElementById('indicator-step-3');
    const stepLineProgress = document.getElementById('step-line-progress');
    
    // Views
    const viewStep1 = document.getElementById('view-step-1');
    const viewStep2 = document.getElementById('view-step-2');
    const viewStep3 = document.getElementById('view-step-3');
    
    // Result details
    const valEmail = document.getElementById('val-email');
    const valOrderId = document.getElementById('val-order-id');
    
    // Help Accordion
    const helpAccordion = document.querySelector('.help-accordion');
    const helpHeader = document.querySelector('.help-header');
    
    // Console log element
    const consoleLog = document.getElementById('console-log');
    const btnCopyLog = document.getElementById('btn-copy-log');
    const btnClearLog = document.getElementById('btn-clear-log');

    // Table elements
    const historyTbody = document.getElementById('history-tbody');
    const statTotalActivated = document.getElementById('stat-total-activated');
    const statLatency = document.getElementById('stat-latency');

    // State Variables
    let userEmail = '';
    const BASE_ACTIVATED_COUNT = 12894;
    let activationHistory = [];

    // --- ANIMATE NUMBERS ---
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString('id-ID');
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- INITIALIZE & DATABASE HISTORY ---
    let dbTotalCount = 0;

    async function loadHistory() {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            if (response.ok && data.success) {
                activationHistory = data.history || [];
                dbTotalCount = data.totalCount || 0;
            }
        } catch (e) {
            console.error('Failed to load history from database:', e);
            activationHistory = [];
            dbTotalCount = 0;
        }
        renderHistoryTable();
        updateDashboardStats(true); // Animate on initial load
    }

    function renderHistoryTable() {
        if (!historyTbody) return;

        if (activationHistory.length === 0) {
            historyTbody.innerHTML = `
                <tr class="empty-state-row">
                    <td colspan="5" class="text-center text-muted py-8">
                        <i class="fa-regular fa-folder-open empty-icon" style="display:block; font-size:24px; margin-bottom:8px; opacity:0.5;"></i>
                        <p>Belum ada riwayat aktivasi. Silakan aktifkan akun pertama Anda.</p>
                    </td>
                </tr>
            `;
            return;
        }

        historyTbody.innerHTML = '';
        activationHistory.forEach(item => {
            const dateObj = new Date(item.timestamp);
            const dateStr = dateObj.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">${item.email}</td>
                <td class="accent-text">${item.orderId}</td>
                <td>${dateStr}</td>
                <td>1 Tahun</td>
                <td><span class="badge badge-success"><i class="fa-solid fa-crown" style="font-size:10px; margin-right:4px;"></i> PRO Sukses</span></td>
            `;
            historyTbody.appendChild(tr);
        });
    }

    function updateDashboardStats(animate = false) {
        const totalCount = BASE_ACTIVATED_COUNT + dbTotalCount;
        const statDbCountEl = document.getElementById('stat-db-count');

        if (statTotalActivated) {
            if (animate) {
                animateValue(statTotalActivated, totalCount - 150, totalCount, 1200);
            } else {
                statTotalActivated.textContent = totalCount.toLocaleString('id-ID');
            }
        }

        if (statDbCountEl) {
            if (animate) {
                animateValue(statDbCountEl, Math.max(0, dbTotalCount - 20), dbTotalCount, 1000);
            } else {
                statDbCountEl.textContent = dbTotalCount.toLocaleString('id-ID');
            }
        }
    }

    // --- TAB SYSTEM ROUTING ---
    function switchTab(tabId) {
        // Update menu active class
        menuItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update header title
        let title = 'Overview';
        if (tabId === 'activator') title = 'Activator Wizard';
        else if (tabId === 'history') title = 'Activation History';
        else if (tabId === 'status') title = 'Server Status Details';
        if (headerTitleText) headerTitleText.textContent = title;

        // Toggle active views
        dashboardViews.forEach(view => {
            view.classList.remove('active');
        });
        const targetView = document.getElementById(`view-${tabId}`);
        if (targetView) targetView.classList.add('active');

        // Trigger stats count up on dashboard open
        if (tabId === 'dashboard') {
            updateDashboardStats(true);
        }

        // Close sidebar on mobile after choosing
        if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    if (btnShortcutActivator) {
        btnShortcutActivator.addEventListener('click', () => {
            switchTab('activator');
        });
    }

    // --- MOBILE SIDEBAR DRAWER ---
    if (btnHamburger) {
        btnHamburger.addEventListener('click', () => {
            if (sidebar) sidebar.classList.add('open');
        });
    }

    if (btnCloseSidebar) {
        btnCloseSidebar.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 990 && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && e.target !== btnHamburger && !btnHamburger.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // --- SIMULATED DYNAMIC LATENCY ---
    setInterval(() => {
        if (statLatency) {
            const randomLatency = Math.floor(38 + Math.random() * 12); // Fluctuates between 38ms - 50ms
            statLatency.textContent = `${randomLatency}ms`;
        }
    }, 4500);

    // --- ACCORDION INFO TOGGLE ---
    if (helpHeader && helpAccordion) {
        helpHeader.addEventListener('click', () => {
            helpAccordion.classList.toggle('open');
        });
    }

    // --- TERMINAL LOG SYSTEM ---
    function addLog(message, type = 'default') {
        if (!consoleLog) return;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        
        const logLine = document.createElement('div');
        logLine.className = 'log-line';
        
        if (type === 'muted') logLine.classList.add('text-muted');
        else if (type === 'success') logLine.classList.add('text-success');
        else if (type === 'error') logLine.classList.add('text-error');
        else if (type === 'info') logLine.classList.add('text-info');
        
        logLine.innerHTML = `<span class="text-muted">[${timeStr}]</span> ${message}`;
        consoleLog.appendChild(logLine);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    if (btnCopyLog) {
        btnCopyLog.addEventListener('click', () => {
            if (!consoleLog) return;
            const logsText = Array.from(consoleLog.querySelectorAll('.log-line'))
                .map(line => line.textContent)
                .join('\n');
            navigator.clipboard.writeText(logsText)
                .then(() => {
                    addLog('📋 Log berhasil disalin ke clipboard!', 'success');
                })
                .catch(err => {
                    addLog('❌ Gagal menyalin log: ' + err.message, 'error');
                });
        });
    }

    if (btnClearLog) {
        btnClearLog.addEventListener('click', () => {
            if (!consoleLog) return;
            consoleLog.innerHTML = '';
            addLog('[System] Log dibersihkan.', 'muted');
        });
    }

    // --- ACTIVATOR ENGINE SYSTEM ---
    function goToStep(step) {
        viewStep1.classList.remove('active');
        viewStep2.classList.remove('active');
        viewStep3.classList.remove('active');

        indicatorStep1.className = 'step-dot';
        indicatorStep2.className = 'step-dot';
        indicatorStep3.className = 'step-dot';

        if (step === 1) {
            viewStep1.classList.add('active');
            indicatorStep1.classList.add('active');
            if (stepLineProgress) stepLineProgress.style.width = '0%';
        } else if (step === 2) {
            viewStep2.classList.add('active');
            indicatorStep1.classList.add('completed');
            indicatorStep2.classList.add('active');
            if (stepLineProgress) stepLineProgress.style.width = '50%';
        } else if (step === 3) {
            viewStep3.classList.add('active');
            indicatorStep1.classList.add('completed');
            indicatorStep2.classList.add('completed');
            indicatorStep3.classList.add('active');
            if (stepLineProgress) stepLineProgress.style.width = '100%';
        }
    }

    // STEP 1 Form Submission (Send Magic Link)
    formStep1.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = inputEmail.value.trim();
        
        if (!email) {
            addLog('Email tidak boleh kosong.', 'error');
            return;
        }

        userEmail = email;
        addLog(`Memulai pengiriman Magic Link ke: ${email}...`, 'info');
        
        btnSendLink.classList.add('loading');
        btnSendLink.disabled = true;
        inputEmail.disabled = true;

        try {
            const response = await fetch('/api/send-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                addLog(`✅ Magic link berhasil dikirim ke: ${email}`, 'success');
                addLog(`Silakan cek kotak masuk (inbox) atau folder spam email Anda.`, 'muted');
                
                setTimeout(() => {
                    goToStep(2);
                    addLog(`Menunggu verifikasi... Silakan tempelkan link dari email Anda.`, 'info');
                }, 1000);
            } else {
                const errMsg = data.error || 'Terjadi kesalahan sistem.';
                addLog(`❌ Gagal kirim magic link: ${errMsg}`, 'error');
                inputEmail.disabled = false;
            }
        } catch (error) {
            addLog(`❌ Koneksi gagal: ${error.message}`, 'error');
            inputEmail.disabled = false;
        } finally {
            btnSendLink.classList.remove('loading');
            btnSendLink.disabled = false;
        }
    });

    // STEP 2 Form Submission (Verify & Apply Premium)
    formStep2.addEventListener('submit', async (e) => {
        e.preventDefault();
        const link = inputMagicLink.value.trim();

        if (!link) {
            addLog('Harap masukkan link verifikasi.', 'error');
            return;
        }

        addLog(`Memproses verifikasi untuk email: ${userEmail}...`, 'info');
        
        btnActivate.classList.add('loading');
        btnActivate.disabled = true;
        btnBackStep1.disabled = true;
        inputMagicLink.disabled = true;
        appCard.classList.add('processing');

        try {
            const response = await fetch('/api/activate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userEmail, link })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                addLog(`✅ Akun berhasil diverifikasi & login sukses.`, 'success');
                addLog(`Mengajukan permintaan aktivasi premium 1 tahun...`, 'info');
                addLog(`✅ Premium berhasil diaktifkan! Order ID: ${data.orderId}`, 'success');

                // Fill details on success screen
                valEmail.textContent = data.user.email;
                valOrderId.textContent = data.orderId;
                
                // Refresh records from database
                await loadHistory();

                // Show success view
                appCard.classList.remove('processing');
                appCard.classList.add('success-state');
                
                setTimeout(() => {
                    goToStep(3);
                }, 800);
            } else {
                const errMsg = data.error || 'Gagal memproses verifikasi.';
                addLog(`❌ Gagal aktivasi premium: ${errMsg}`, 'error');
                appCard.classList.remove('processing');
                inputMagicLink.disabled = false;
            }
        } catch (error) {
            addLog(`❌ Koneksi gagal saat aktivasi: ${error.message}`, 'error');
            appCard.classList.remove('processing');
            inputMagicLink.disabled = false;
        } finally {
            btnActivate.classList.remove('loading');
            btnActivate.disabled = false;
            btnBackStep1.disabled = false;
        }
    });

    // Navigation and Restart Buttons
    btnBackStep1.addEventListener('click', () => {
        addLog('Kembali ke penginputan email.', 'muted');
        goToStep(1);
        inputEmail.disabled = false;
        inputMagicLink.value = '';
    });

    btnRestart.addEventListener('click', () => {
        addLog('Memulai sesi aktivasi baru.', 'muted');
        formStep1.reset();
        formStep2.reset();
        
        inputEmail.disabled = false;
        inputMagicLink.disabled = false;
        appCard.className = 'app-card glassmorphism-sub';
        
        goToStep(1);
    });

    // --- RUN INITIALIZATION ---
    loadHistory();
});
