// app.js

document.addEventListener('DOMContentLoaded', () => {
    // Initial Loader Elements
    const initialLoader = document.getElementById('initial-loader');
    const loaderProgressBar = document.getElementById('loader-progress');
    const loaderStatusText = document.getElementById('loader-status-text');

    // Run Initial Loader Sequence
    if (initialLoader) {
        // Step 1: Start load
        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '25%';
            if (loaderStatusText) loaderStatusText.textContent = 'Menghubungkan ke Node Jaringan...';
        }, 200);

        // Step 2
        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '60%';
            if (loaderStatusText) loaderStatusText.textContent = 'Memuat Modul Enkripsi & Keamanan...';
        }, 600);

        // Step 3
        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '90%';
            if (loaderStatusText) loaderStatusText.textContent = 'Menyinkronkan Sesi Selesai...';
        }, 1100);

        // Step 4: Finalize and fade out
        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '100%';
            if (loaderStatusText) loaderStatusText.textContent = 'Sistem Siap!';
        }, 1400);

        // Hide overlay
        setTimeout(() => {
            initialLoader.classList.add('loader-hidden');
        }, 1700);
    }

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
    const indicatorStep4 = document.getElementById('indicator-step-4');
    const stepLineProgress = document.getElementById('step-line-progress');
    
    // Views
    const viewStep1 = document.getElementById('view-step-1');
    const viewStepAds = document.getElementById('view-step-ads');
    const viewStep2 = document.getElementById('view-step-2');
    const viewStep3 = document.getElementById('view-step-3');
    
    // Step Ads Elements
    const btnWatchAd = document.getElementById('btn-watch-ad');
    const btnBackToStep1 = document.getElementById('btn-back-to-step1');
    const btnNextToStep2 = document.getElementById('btn-next-to-step2');
    const adViewCountEl = document.getElementById('ad-view-count');
    const adsProgressFill = document.getElementById('ads-progress-fill');
    
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
    
    // Ads State Configuration
    let adViewCount = 0;
    const REQUIRED_ADS = 5;
    const AD_SPONSOR_URL = 'https://ryezenn.blogspot.com'; // Ubah link sponsor AdSense Anda di sini

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
                        <p>Belum ada data riwayat aktivasi. Silakan lakukan aktivasi akun pertama Anda.</p>
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
                <td><span class="badge badge-success"><i class="fa-solid fa-crown" style="font-size:10px; margin-right:4px;"></i> Premium Aktif</span></td>
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
        let title = 'Ikhtisar Utama';
        if (tabId === 'activator') title = 'Alat Aktivasi Akun';
        else if (tabId === 'history') title = 'Riwayat Aktivasi';
        else if (tabId === 'status') title = 'Status Server & API';
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
                    addLog('📋 Log berhasil disalin ke papan klip.', 'success');
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
            addLog('[Sistem] Log aktivitas dibersihkan.', 'muted');
        });
    }

    let adInterval = null;

    // --- ACTIVATOR ENGINE SYSTEM ---
    function goToStep(step) {
        viewStep1.classList.remove('active');
        if (viewStepAds) viewStepAds.classList.remove('active');
        viewStep2.classList.remove('active');
        viewStep3.classList.remove('active');

        // Always clear active ad interval when navigating away
        if (adInterval) {
            clearInterval(adInterval);
            adInterval = null;
        }

        indicatorStep1.className = 'step-dot';
        indicatorStep2.className = 'step-dot';
        indicatorStep3.className = 'step-dot';
        if (indicatorStep4) indicatorStep4.className = 'step-dot';

        if (step === 1) {
            viewStep1.classList.add('active');
            indicatorStep1.classList.add('active');
            if (stepLineProgress) stepLineProgress.style.width = '0%';
        } else if (step === 2) {
            if (viewStepAds) viewStepAds.classList.add('active');
            indicatorStep1.classList.add('completed');
            indicatorStep2.classList.add('active');
            if (stepLineProgress) stepLineProgress.style.width = '33.3%';
            
            // Start automatic ad viewing
            startAutoAdVerification();
        } else if (step === 3) {
            viewStep2.classList.add('active');
            indicatorStep1.classList.add('completed');
            indicatorStep2.classList.add('completed');
            indicatorStep3.classList.add('active');
            if (stepLineProgress) stepLineProgress.style.width = '66.6%';
        } else if (step === 4) {
            viewStep3.classList.add('active');
            indicatorStep1.classList.add('completed');
            indicatorStep2.classList.add('completed');
            indicatorStep3.classList.add('completed');
            if (indicatorStep4) indicatorStep4.classList.add('active');
            if (stepLineProgress) stepLineProgress.style.width = '100%';
        }
    }

    // STEP 1 Form Submission (Send Magic Link)
    formStep1.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = inputEmail.value.trim();
        
        if (!email) {
            addLog('Alamat email tidak boleh kosong.', 'error');
            return;
        }

        userEmail = email;
        addLog(`Memulai proses pengiriman tautan masuk ke: ${email}...`, 'info');
        
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
                addLog(`✅ Tautan masuk berhasil dikirim ke: ${email}`, 'success');
                addLog(`Silakan periksa kotak masuk (inbox) atau folder spam pada email Anda.`, 'muted');
                
                setTimeout(() => {
                    goToStep(2);
                    addLog(`ℹ️ Silakan verifikasi sponsor dengan membuka iklan di bawah ini terlebih dahulu.`, 'info');
                }, 1000);
            } else {
                const errMsg = data.error || 'Terjadi kesalahan sistem.';
                addLog(`❌ Gagal mengirimkan tautan masuk: ${errMsg}`, 'error');
                inputEmail.disabled = false;
            }
        } catch (error) {
            addLog(`❌ Kegagalan koneksi: ${error.message}`, 'error');
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
            addLog('Harap masukkan tautan verifikasi.', 'error');
            return;
        }

        addLog(`Memproses verifikasi untuk alamat email: ${userEmail}...`, 'info');
        
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
                addLog(`✅ Akun berhasil diverifikasi. Proses masuk berhasil.`, 'success');
                addLog(`Mengajukan permintaan penerapan lisensi tahunan...`, 'info');
                addLog(`✅ Lisensi premium berhasil diaktifkan. ID Transaksi: ${data.orderId}`, 'success');

                // Fill details on success screen
                valEmail.textContent = data.user.email;
                valOrderId.textContent = data.orderId;
                
                // Refresh records from database
                await loadHistory();

                // Show success view
                appCard.classList.remove('processing');
                appCard.classList.add('success-state');
                
                setTimeout(() => {
                    goToStep(4);
                }, 800);
            } else {
                const errMsg = data.error || 'Gagal memproses verifikasi.';
                addLog(`❌ Gagal mengaktifkan lisensi premium: ${errMsg}`, 'error');
                appCard.classList.remove('processing');
                inputMagicLink.disabled = false;
            }
        } catch (error) {
            addLog(`❌ Kegagalan koneksi saat aktivasi: ${error.message}`, 'error');
            appCard.classList.remove('processing');
            inputMagicLink.disabled = false;
        } finally {
            btnActivate.classList.remove('loading');
            btnActivate.disabled = false;
            btnBackStep1.disabled = false;
        }
    });

    // --- STEP ADS: SPONSOR WALL CONTROLLER ---
    function startAutoAdVerification() {
        // Clear any previous interval first
        if (adInterval) {
            clearInterval(adInterval);
        }

        if (adViewCount >= REQUIRED_ADS) {
            if (btnWatchAd) {
                btnWatchAd.disabled = true;
                btnWatchAd.classList.add('disabled');
                btnWatchAd.querySelector('span').textContent = 'Validasi Iklan Selesai!';
            }
            if (btnNextToStep2) {
                btnNextToStep2.disabled = false;
                btnNextToStep2.classList.remove('disabled');
            }
            return;
        }

        addLog('⏳ Memulai verifikasi penayangan iklan otomatis. Harap tetap di halaman ini...', 'info');
        
        if (btnNextToStep2) {
            btnNextToStep2.disabled = true;
            btnNextToStep2.classList.add('disabled');
        }
        if (btnBackToStep1) btnBackToStep1.disabled = true;

        let countdown = 8; // 8 seconds per ad
        const updateText = () => {
            if (btnWatchAd) {
                btnWatchAd.querySelector('span').textContent = `Menonton Iklan... (${countdown}s) [${adViewCount + 1}/${REQUIRED_ADS}]`;
            }
        };

        updateText();

        adInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                updateText();
            } else {
                // Confirm 1 ad view
                adViewCount++;
                if (adViewCountEl) adViewCountEl.textContent = adViewCount;
                if (adsProgressFill) {
                    const percent = (adViewCount / REQUIRED_ADS) * 100;
                    adsProgressFill.style.width = `${percent}%`;
                }

                addLog(`📺 Iklan ke-${adViewCount} otomatis terverifikasi.`, 'success');

                if (adViewCount < REQUIRED_ADS) {
                    countdown = 8; // Reset countdown for next ad
                    updateText();
                } else {
                    // Complete
                    clearInterval(adInterval);
                    adInterval = null;

                    if (btnWatchAd) {
                        btnWatchAd.disabled = true;
                        btnWatchAd.classList.add('disabled');
                        btnWatchAd.querySelector('span').textContent = 'Validasi Iklan Selesai!';
                    }
                    if (btnNextToStep2) {
                        btnNextToStep2.disabled = false;
                        btnNextToStep2.classList.remove('disabled');
                    }
                    if (btnBackToStep1) btnBackToStep1.disabled = false;
                    addLog('✅ Semua sponsor iklan telah ditonton (5/5). Silakan klik Lanjutkan!', 'success');
                }
            }
        }, 1000);
    }

    // Click on Buka Iklan Sponsor to open sponsor link manually
    if (btnWatchAd) {
        btnWatchAd.addEventListener('click', () => {
            window.open(AD_SPONSOR_URL, '_blank');
            addLog('🔗 Link sponsor dibuka di tab baru. Terima kasih atas dukungan Anda!', 'info');
        });
    }

    if (btnBackToStep1) {
        btnBackToStep1.addEventListener('click', () => {
            addLog('Kembali ke langkah pengisian email.', 'muted');
            if (adInterval) {
                clearInterval(adInterval);
                adInterval = null;
            }
            goToStep(1);
            inputEmail.disabled = false;
            
            // Reset Ad Views
            adViewCount = 0;
            if (adViewCountEl) adViewCountEl.textContent = '0';
            if (adsProgressFill) adsProgressFill.style.width = '0%';
            if (btnWatchAd) {
                btnWatchAd.disabled = false;
                btnWatchAd.classList.remove('disabled');
                btnWatchAd.querySelector('span').textContent = 'Buka Iklan Sponsor';
            }
            if (btnNextToStep2) {
                btnNextToStep2.disabled = true;
                btnNextToStep2.classList.add('disabled');
            }
        });
    }

    if (btnNextToStep2) {
        btnNextToStep2.addEventListener('click', () => {
            goToStep(3);
            addLog('Langkah iklan diverifikasi. Silakan tempelkan tautan verifikasi dari email Anda.', 'info');
        });
    }

    // Navigation and Restart Buttons
    btnBackStep1.addEventListener('click', () => {
        addLog('Kembali ke langkah verifikasi iklan sponsor.', 'muted');
        goToStep(2);
        inputMagicLink.value = '';
    });

    btnRestart.addEventListener('click', () => {
        addLog('Memulai sesi aktivasi akun baru.', 'muted');
        if (adInterval) {
            clearInterval(adInterval);
            adInterval = null;
        }
        formStep1.reset();
        formStep2.reset();
        
        inputEmail.disabled = false;
        inputMagicLink.disabled = false;
        appCard.className = 'app-card glassmorphism-sub';
        
        // Reset Ad Views
        adViewCount = 0;
        if (adViewCountEl) adViewCountEl.textContent = '0';
        if (adsProgressFill) adsProgressFill.style.width = '0%';
        if (btnWatchAd) {
            btnWatchAd.disabled = false;
            btnWatchAd.classList.remove('disabled');
            btnWatchAd.querySelector('span').textContent = 'Buka Iklan Sponsor';
        }
        if (btnNextToStep2) {
            btnNextToStep2.disabled = true;
            btnNextToStep2.classList.add('disabled');
        }
        
        goToStep(1);
    });

    // --- AUTH PORTAL CONTROLLER ---
    const authContainer = document.getElementById('auth-container');
    const dashboardWrapper = document.getElementById('dashboard-wrapper');
    
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabRegisterBtn = document.getElementById('tab-register-btn');
    
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    
    const authErrorMsg = document.getElementById('auth-error-msg');
    const btnLogout = document.getElementById('btn-logout');
    
    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarProfileImg = document.getElementById('sidebar-profile-img');

    // Toggle tab: Login
    tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
        authErrorMsg.classList.remove('active');
    });

    // Toggle tab: Register
    tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
        authErrorMsg.classList.remove('active');
    });

    // Handle Login Form Submit
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        authErrorMsg.classList.remove('active');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('am_admin_logged_in', data.user.username);
                authContainer.classList.add('auth-hidden');
                dashboardWrapper.classList.remove('dashboard-hidden');
                
                // Setup Profile UI
                sidebarUsername.textContent = data.user.username;
                sidebarProfileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=7c3aed&color=fff&bold=true`;

                // Start loading metrics
                await loadHistory();
                addLog(`🔓 Administrator ${data.user.username} berhasil masuk sistem.`, 'success');
            } else {
                authErrorMsg.textContent = data.error || 'Autentikasi gagal.';
                authErrorMsg.classList.add('active');
            }
        } catch (err) {
            authErrorMsg.textContent = 'Gagal menghubungi server auth.';
            authErrorMsg.classList.add('active');
        }
    });

    // Handle Register Form Submit
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;

        authErrorMsg.classList.remove('active');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                authErrorMsg.textContent = 'Registrasi berhasil. Silakan masuk.';
                authErrorMsg.style.color = 'var(--accent-green)';
                authErrorMsg.style.borderColor = 'rgba(124, 58, 237, 0.2)';
                authErrorMsg.style.background = 'rgba(124, 58, 237, 0.08)';
                authErrorMsg.classList.add('active');
                
                // Reset form register
                formRegister.reset();

                // Auto switch to login tab after 1.5s
                setTimeout(() => {
                    tabLoginBtn.click();
                    authErrorMsg.classList.remove('active');
                    authErrorMsg.style.color = '';
                    authErrorMsg.style.borderColor = '';
                    authErrorMsg.style.background = '';
                }, 1500);
            } else {
                authErrorMsg.textContent = data.error || 'Registrasi gagal.';
                authErrorMsg.classList.add('active');
            }
        } catch (err) {
            authErrorMsg.textContent = 'Gagal menghubungi server auth.';
            authErrorMsg.classList.add('active');
        }
    });

    // Handle Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('am_admin_logged_in');
            window.location.reload();
        });
    }

    // Check Session on startup
    const loggedInUser = sessionStorage.getItem('am_admin_logged_in');
    if (loggedInUser) {
        authContainer.classList.add('auth-hidden');
        dashboardWrapper.classList.remove('dashboard-hidden');
        
        sidebarUsername.textContent = loggedInUser;
        sidebarProfileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser)}&background=7c3aed&color=fff&bold=true`;

        loadHistory();
    } else {
        dashboardWrapper.classList.add('dashboard-hidden');
        authContainer.classList.remove('auth-hidden');
    }
});
