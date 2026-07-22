// admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Initial Loader Elements
    const initialLoader = document.getElementById('initial-loader');
    const loaderProgressBar = document.getElementById('loader-progress');
    const loaderStatusText = document.getElementById('loader-status-text');

    // Run Initial Loader Sequence
    if (initialLoader) {
        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '25%';
            if (loaderStatusText) loaderStatusText.textContent = 'Menghubungkan ke Node Jaringan...';
        }, 200);

        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '60%';
            if (loaderStatusText) loaderStatusText.textContent = 'Memuat Modul Panel Admin...';
        }, 600);

        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '90%';
            if (loaderStatusText) loaderStatusText.textContent = 'Menyinkronkan Sesi Selesai...';
        }, 1100);

        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '100%';
            if (loaderStatusText) loaderStatusText.textContent = 'Sistem Siap!';
        }, 1400);

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

    // Console log element
    const consoleLog = document.getElementById('console-log');
    const btnCopyLog = document.getElementById('btn-copy-log');
    const btnClearLog = document.getElementById('btn-clear-log');

    // Table elements
    const historyTbody = document.getElementById('history-tbody');
    const statTotalActivated = document.getElementById('stat-total-activated');
    const statLatency = document.getElementById('stat-latency');

    // State Variables
    const BASE_ACTIVATED_COUNT = 12894;
    let activationHistory = [];
    let dbTotalCount = 0;

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
                        <p>Belum ada data riwayat aktivasi.</p>
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
        menuItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        let title = 'Ikhtisar Utama';
        if (tabId === 'history') title = 'Riwayat Aktivasi';
        else if (tabId === 'status') title = 'Status Server & API';
        if (headerTitleText) headerTitleText.textContent = title;

        dashboardViews.forEach(view => {
            view.classList.remove('active');
        });
        const targetView = document.getElementById(`view-${tabId}`);
        if (targetView) targetView.classList.add('active');

        if (tabId === 'dashboard') {
            updateDashboardStats(true);
        }

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
            const randomLatency = Math.floor(38 + Math.random() * 12);
            statLatency.textContent = `${randomLatency}ms`;
        }
    }, 4500);

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

    tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
        authErrorMsg.classList.remove('active');
    });

    tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
        authErrorMsg.classList.remove('active');
    });

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const turnstileInput = formLogin.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileInput ? turnstileInput.value : '';

        authErrorMsg.classList.remove('active');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, token: turnstileToken })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('am_admin_logged_in', data.user.username);
                authContainer.classList.add('auth-hidden');
                dashboardWrapper.classList.remove('dashboard-hidden');
                
                sidebarUsername.textContent = data.user.username;
                sidebarProfileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.username)}&background=c800df&color=fff&bold=true`;

                await loadHistory();
                addLog(`🔓 Administrator ${data.user.username} berhasil masuk sistem.`, 'success');
            } else {
                authErrorMsg.textContent = data.error || 'Autentikasi gagal.';
                authErrorMsg.classList.add('active');
            }
        } catch (err) {
            authErrorMsg.textContent = 'Gagal menghubungi server auth.';
            authErrorMsg.classList.add('active');
        } finally {
            if (window.turnstile) turnstile.reset();
        }
    });

    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const turnstileInput = formRegister.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileInput ? turnstileInput.value : '';

        authErrorMsg.classList.remove('active');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, token: turnstileToken })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                authErrorMsg.textContent = 'Registrasi berhasil. Silakan masuk.';
                authErrorMsg.style.color = 'var(--accent-green)';
                authErrorMsg.style.borderColor = 'rgba(200, 0, 223, 0.2)';
                authErrorMsg.style.background = 'rgba(200, 0, 223, 0.08)';
                authErrorMsg.classList.add('active');
                
                formRegister.reset();

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
        } finally {
            if (window.turnstile) turnstile.reset();
        }
    });

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('am_admin_logged_in');
            window.location.reload();
        });
    }

    const loggedInUser = sessionStorage.getItem('am_admin_logged_in');
    if (loggedInUser) {
        authContainer.classList.add('auth-hidden');
        dashboardWrapper.classList.remove('dashboard-hidden');
        
        sidebarUsername.textContent = loggedInUser;
        sidebarProfileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser)}&background=c800df&color=fff&bold=true`;

        loadHistory();
    } else {
        dashboardWrapper.classList.add('dashboard-hidden');
        authContainer.classList.remove('auth-hidden');
    }

    // --- ADVANCED SECURITY: ANTI-DEVTOOLS & INSPECT PROTECT ---
    (function() {
        document.addEventListener('contextmenu', e => e.preventDefault());

        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && (e.key === 'u' || e.keyCode === 85)) {
                e.preventDefault();
                return false;
            }
            if (e.ctrlKey && (e.key === 's' || e.keyCode === 83)) {
                e.preventDefault();
                return false;
            }
        });

        const preventDevTools = () => {
            function check() {
                try {
                    (function() {
                        return function(a) {}
                    })().constructor("debugger")();
                } catch (e) {}
            }
            setInterval(check, 100);
        };
        preventDevTools();
    })();
});
