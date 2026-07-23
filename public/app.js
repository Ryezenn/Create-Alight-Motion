// app.js - Full UI logic, view controller, and API connector

document.addEventListener('DOMContentLoaded', () => {
    // Current User State
    let currentUser = null;
    let loginWidgetId = null;
    let registerWidgetId = null;

    // View Elements
    const screenAuth = document.getElementById('screen-auth');
    const screenDashboard = document.getElementById('screen-dashboard');
    const screenAdmin = document.getElementById('screen-admin');
    const screenPurchase = document.getElementById('screen-purchase');
    const screenProfile = document.getElementById('screen-profile');
    
    // Auth sub-views
    const authLoginView = document.getElementById('auth-login-view');
    const authRegisterView = document.getElementById('auth-register-view');

    // Navigation Elements
    const navMenu = document.getElementById('nav-menu');
    const navUsername = document.getElementById('nav-username');
    const navCredits = document.getElementById('nav-credits');
    const navRoleBadge = document.getElementById('nav-role-badge');
    const btnAdminView = document.getElementById('btn-admin-view');
    const btnPurchaseView = document.getElementById('btn-purchase-view');
    const btnProfileView = document.getElementById('btn-profile-view');
    const btnDashboardView = document.getElementById('btn-dashboard-view');
    const btnLogout = document.getElementById('btn-logout');

    // Link Toggles
    const linkToRegister = document.getElementById('link-to-register');
    const linkToLogin = document.getElementById('link-to-login');

    // Forms
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const formSendLink = document.getElementById('form-send-link');
    const formActivate = document.getElementById('form-activate');

    // Table bodies
    const historyTableBody = document.getElementById('history-table-body');
    const adminUsersTableBody = document.getElementById('admin-users-table-body');
    const adminLogsTableBody = document.getElementById('admin-logs-table-body');

    // Initialize application
    checkSession();
    loadPublicStats();

    let turnstileSiteKey = '';

    // Robust Turnstile Widget Renderer
    function initTurnstile() {
        if (!window.turnstile || !turnstileSiteKey) {
            // Keep polling every 200ms until Cloudflare script & sitekey are loaded
            setTimeout(initTurnstile, 200);
            return;
        }

        // Do not render if the auth screen is hidden (Turnstile fails on display: none)
        if (screenAuth.classList.contains('hidden')) {
            setTimeout(initTurnstile, 200);
            return;
        }

        const loginEl = document.getElementById('login-turnstile');
        if (loginEl && loginWidgetId === null && !authLoginView.classList.contains('hidden')) {
            try {
                loginWidgetId = turnstile.render('#login-turnstile', {
                    sitekey: turnstileSiteKey,
                    theme: 'dark'
                });
            } catch (err) {
                console.warn('Turnstile login render warning:', err);
            }
        }

        const registerEl = document.getElementById('register-turnstile');
        if (registerEl && registerWidgetId === null && !authRegisterView.classList.contains('hidden')) {
            try {
                registerWidgetId = turnstile.render('#register-turnstile', {
                    sitekey: turnstileSiteKey,
                    theme: 'dark'
                });
            } catch (err) {
                console.warn('Turnstile register render warning:', err);
            }
        }
    }

    // Fetch dynamic sitekey config from server
    async function loadConfig() {
        try {
            const res = await fetch('/api/auth/config');
            if (res.ok) {
                const data = await res.json();
                turnstileSiteKey = data.turnstileSiteKey || '0x4AAAAAAD7RpjTPThhr5v1Q';
                initTurnstile();
            } else {
                turnstileSiteKey = '0x4AAAAAAD7RpjTPThhr5v1Q';
                initTurnstile();
            }
        } catch (err) {
            console.error('Gagal mengambil konfigurasi publik:', err);
            turnstileSiteKey = '0x4AAAAAAD7RpjTPThhr5v1Q';
            initTurnstile();
        }
    }
    loadConfig();

    // Toggle between Login & Register views
    linkToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        authLoginView.classList.add('hidden');
        authRegisterView.classList.remove('hidden');
        initTurnstile();
    });

    linkToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        authRegisterView.classList.add('hidden');
        authLoginView.classList.remove('hidden');
    });

    // View switching
    btnAdminView.addEventListener('click', () => {
        showScreen('admin');
        loadAdminPanel();
    });

    btnPurchaseView.addEventListener('click', () => {
        showScreen('purchase');
        loadAPIPanel();
    });

    btnProfileView.addEventListener('click', () => {
        showScreen('profile');
        loadProfile();
    });

    btnDashboardView.addEventListener('click', () => {
        showScreen('dashboard');
        loadDashboard();
    });

    // --- Authentication ---
    
    // Session check on load
    async function checkSession() {
        try {
            const res = await fetch('/api/auth/profile');
            const dbStatusDot = document.getElementById('db-status-dot');
            const dbStatusText = document.getElementById('db-status-text');

            if (res.status === 503) {
                // Database disconnected
                if (dbStatusDot) {
                    dbStatusDot.className = 'status-indicator';
                    dbStatusDot.style.background = '#8c8c8c';
                    dbStatusDot.style.boxShadow = 'none';
                }
                if (dbStatusText) dbStatusText.textContent = 'Disconnected';
                showError('Koneksi database offline. Silakan periksa kredensial atau IP Whitelist.');
                showScreen('auth');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;
                updateNavbar();
                showScreen('dashboard');
                loadDashboard();
                
                if (dbStatusDot) {
                    dbStatusDot.className = 'status-indicator online';
                    dbStatusDot.style.background = '';
                    dbStatusDot.style.boxShadow = '';
                }
                if (dbStatusText) dbStatusText.textContent = 'Connected';
            } else {
                showScreen('auth');
            }
        } catch (error) {
            console.error('Session check failed:', error);
            showScreen('auth');
        }
    }

    // Login Form Submit
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        // Get Turnstile token
        const turnstileToken = window.turnstile && loginWidgetId !== null ? turnstile.getResponse(loginWidgetId) : '';
        if (!turnstileToken) {
            showError('Selesaikan verifikasi Turnstile terlebih dahulu.');
            return;
        }

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileToken })
            });
            const data = await res.json();

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'BERHASIL!',
                    text: 'Login berhasil.',
                    background: '#080808',
                    color: '#ffffff',
                    confirmButtonColor: '#ffffff'
                });
                currentUser = data.user;
                updateNavbar();
                showScreen('dashboard');
                loadDashboard();
                formLogin.reset();
                if (window.turnstile && loginWidgetId !== null) {
                    turnstile.reset(loginWidgetId);
                }
            } else {
                showError(data.error || 'Login gagal.');
                if (window.turnstile && loginWidgetId !== null) {
                    turnstile.reset(loginWidgetId);
                }
            }
        } catch (err) {
            showError('Terjadi kesalahan jaringan.');
            if (window.turnstile && loginWidgetId !== null) {
                turnstile.reset(loginWidgetId);
            }
        }
    });

    // Register Form Submit
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        // Get Turnstile token
        const turnstileToken = window.turnstile && registerWidgetId !== null ? turnstile.getResponse(registerWidgetId) : '';
        if (!turnstileToken) {
            showError('Selesaikan verifikasi Turnstile terlebih dahulu.');
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, turnstileToken })
            });
            const data = await res.json();

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'REGISTRASI SUKSES!',
                    text: data.message || 'Silakan masuk menggunakan akun baru Anda.',
                    background: '#080808',
                    color: '#ffffff',
                    confirmButtonColor: '#ffffff'
                });
                authRegisterView.classList.add('hidden');
                authLoginView.classList.remove('hidden');
                formRegister.reset();
                if (window.turnstile && registerWidgetId !== null) {
                    turnstile.reset(registerWidgetId);
                }
            } else {
                showError(data.error || 'Registrasi gagal.');
                if (window.turnstile && registerWidgetId !== null) {
                    turnstile.reset(registerWidgetId);
                }
            }
        } catch (err) {
            showError('Terjadi kesalahan jaringan.');
            if (window.turnstile && registerWidgetId !== null) {
                turnstile.reset(registerWidgetId);
            }
        }
    });

    // Logout Action
    btnLogout.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/auth/logout', { method: 'POST' });
            if (res.ok) {
                currentUser = null;
                navMenu.classList.add('hidden');
                showScreen('auth');
                Swal.fire({
                    icon: 'info',
                    title: 'LOGGED OUT',
                    text: 'Anda telah keluar dari sistem.',
                    background: '#080808',
                    color: '#ffffff',
                    confirmButtonColor: '#ffffff'
                });
                // Reset widgets
                if (window.turnstile) {
                    if (loginWidgetId !== null) turnstile.reset(loginWidgetId);
                    if (registerWidgetId !== null) turnstile.reset(registerWidgetId);
                }
            }
        } catch (err) {
            showError('Logout gagal.');
        }
    });

    // --- Dashboard & AM Generator ---

    // Send Magic Link
    formSendLink.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('send-email').value;
        
        // UI loading state
        const btn = document.getElementById('btn-send-link');
        const text = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.btn-spinner');
        
        btn.disabled = true;
        text.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const res = await fetch('/api/am/send-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'PESAN TERKIRIM!',
                    text: 'Pesan verifikasi telah dikirim ke email target. Silakan salin tautan verifikasinya dari inbox email Anda lalu tempelkan di bawah.',
                    background: '#080808',
                    color: '#ffffff',
                    confirmButtonColor: '#ffffff'
                });
                // Unhide stage 2 container and autofill email
                const stage2 = document.getElementById('stage-activate-container');
                if (stage2) {
                    stage2.classList.remove('hidden');
                    stage2.scrollIntoView({ behavior: 'smooth' });
                }
                document.getElementById('activate-email').value = email;
                document.getElementById('activate-link').focus();
            } else {
                showError(data.error || 'Gagal mengirim pesan verifikasi.');
            }
        } catch (err) {
            showError('Terjadi kesalahan jaringan.');
        } finally {
            btn.disabled = false;
            text.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Trigger activation
    formActivate.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('activate-email').value;
        const magicLink = document.getElementById('activate-link').value;

        // UI loading state
        const btn = document.getElementById('btn-activate');
        const text = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.btn-spinner');
        
        btn.disabled = true;
        text.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const res = await fetch('/api/am/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, magicLink })
            });
            const data = await res.json();

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'PREMIUM LISENSI AKTIF!',
                    text: data.message,
                    background: '#080808',
                    color: '#ffffff',
                    confirmButtonColor: '#ffffff'
                });
                
                // Refresh credits
                if (currentUser.role !== 'admin') {
                    currentUser.credits = data.creditsRemaining;
                    navCredits.textContent = currentUser.credits;
                }
                
                formActivate.reset();
                loadUserHistory();
            } else {
                showError(data.error || 'Aktivasi premium gagal.');
            }
        } catch (err) {
            showError('Terjadi kesalahan jaringan.');
        } finally {
            btn.disabled = false;
            text.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Load User History
    async function loadUserHistory() {
        try {
            const res = await fetch('/api/am/history');
            if (res.ok) {
                const data = await res.json();
                renderHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to load user history:', error);
        }
    }

    // Render history in table
    function renderHistory(logs) {
        if (!logs || logs.length === 0) {
            historyTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada riwayat aktivasi lisensi.</td></tr>`;
            return;
        }

        historyTableBody.innerHTML = logs.map(log => {
            const statusClass = log.status === 'success' ? 'status-success' : (log.status === 'failed' ? 'status-failed' : 'status-pending');
            const statusText = log.status === 'success' ? 'Aktif' : (log.status === 'failed' ? 'Gagal' : 'Memproses');
            const date = new Date(log.createdAt).toLocaleString('id-ID');
            return `
                <tr>
                    <td>${date}</td>
                    <td>${escapeHtml(log.targetEmail)}</td>
                    <td>Ryezenn.6767-${log.codeorder}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td>${log.error ? escapeHtml(log.error) : 'Lisensi Berhasil Ditambahkan'}</td>
                </tr>
            `;
        }).join('');
    }

    // --- Admin Panel Functions ---

    // Load Admin Stats & logs
    async function loadAdminPanel() {
        try {
            // Load stats
            const statsRes = await fetch('/api/admin/stats');
            if (statsRes.ok) {
                const data = await statsRes.json();
                document.getElementById('stat-total-users').textContent = data.stats.totalUsers;
                document.getElementById('stat-total-activations').textContent = data.stats.totalActivations;
                document.getElementById('stat-success-activations').textContent = data.stats.successActivations;
                document.getElementById('stat-failed-activations').textContent = data.stats.failedActivations;
            }

            // Load Users
            const usersRes = await fetch('/api/admin/users');
            if (usersRes.ok) {
                const data = await usersRes.json();
                renderAdminUsers(data.users);
            }

            // Load global logs
            const logsRes = await fetch('/api/admin/logs');
            if (logsRes.ok) {
                const data = await logsRes.json();
                renderAdminLogs(data.logs);
            }
        } catch (error) {
            console.error('Failed to load admin panel:', error);
        }
    }

    function renderAdminUsers(users) {
        if (!users || users.length === 0) {
            adminUsersTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Tidak ada user terdaftar.</td></tr>`;
            return;
        }

        adminUsersTableBody.innerHTML = users.map(user => {
            const isBanned = user.status === 'banned';
            const banBtnText = isBanned ? 'Aktifkan' : 'Blokir';
            const banBtnClass = isBanned ? 'btn-secondary' : 'btn-danger';
            const statusClass = isBanned ? 'status-failed' : 'status-success';
            const statusLabel = isBanned ? 'Blocked' : 'Active';
            
            const isUserAdmin = user.role === 'admin';
            const actionButtons = isUserAdmin ? '-' : `
                <div class="admin-actions-cell">
                    <button class="btn btn-secondary btn-sm edit-credits-btn" data-id="${user._id}" data-username="${user.username}" data-credits="${user.credits}">
                        <i class="fa-solid fa-pen-to-square"></i> Kredit
                    </button>
                    <button class="btn ${banBtnClass} btn-sm toggle-ban-btn" data-id="${user._id}">
                        <i class="fa-solid ${isBanned ? 'fa-user-check' : 'fa-user-slash'}"></i> ${banBtnText}
                    </button>
                </div>
            `;

            return `
                <tr>
                    <td><b>${escapeHtml(user.username)}</b></td>
                    <td><span class="badge ${isUserAdmin ? 'badge-admin' : 'badge-normal'}">${user.role.toUpperCase()}</span></td>
                    <td>${isUserAdmin ? 'Unlimited' : user.credits}</td>
                    <td><span class="${statusClass}">${statusLabel}</span></td>
                    <td>${actionButtons}</td>
                </tr>
            `;
        }).join('');

        // Bind event listeners for actions
        document.querySelectorAll('.edit-credits-btn').forEach(btn => {
            btn.addEventListener('click', handleEditCredits);
        });

        document.querySelectorAll('.toggle-ban-btn').forEach(btn => {
            btn.addEventListener('click', handleToggleBan);
        });
    }

    function renderAdminLogs(logs) {
        if (!logs || logs.length === 0) {
            adminLogsTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada log data global.</td></tr>`;
            return;
        }

        adminLogsTableBody.innerHTML = logs.map(log => {
            const statusClass = log.status === 'success' ? 'status-success' : (log.status === 'failed' ? 'status-failed' : 'status-pending');
            const statusText = log.status === 'success' ? 'Sukses' : (log.status === 'failed' ? 'Gagal' : 'Proses');
            const date = new Date(log.createdAt).toLocaleString('id-ID');
            return `
                <tr>
                    <td>${date}</td>
                    <td>${escapeHtml(log.username)}</td>
                    <td>${escapeHtml(log.targetEmail)}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td>${log.error ? escapeHtml(log.error) : 'Ryezenn.6767-' + log.codeorder}</td>
                </tr>
            `;
        }).join('');
    }

    // Edit user credits action
    async function handleEditCredits(e) {
        const btn = e.currentTarget;
        const userId = btn.getAttribute('data-id');
        const username = btn.getAttribute('data-username');
        const currentCredits = btn.getAttribute('data-credits');

        const { value: newCredits } = await Swal.fire({
            title: `KREDIT: ${username.toUpperCase()}`,
            input: 'number',
            inputValue: currentCredits,
            inputLabel: 'Tentukan jumlah saldo kredit baru',
            inputAttributes: { min: 0 },
            showCancelButton: true,
            background: '#080808',
            color: '#ffffff',
            confirmButtonColor: '#ffffff',
            cancelButtonColor: 'rgba(255,255,255,0.05)',
            inputValidator: (value) => {
                if (!value || isNaN(parseInt(value)) || parseInt(value) < 0) {
                    return 'Kredit tidak boleh kurang dari 0!';
                }
            }
        });

        if (newCredits !== undefined) {
            try {
                const res = await fetch('/api/admin/user/credits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, credits: parseInt(newCredits) })
                });
                const data = await res.json();
                if (res.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'BERHASIL!',
                        text: data.message,
                        background: '#080808',
                        color: '#ffffff',
                        confirmButtonColor: '#ffffff'
                    });
                    loadAdminPanel(); // reload tables
                } else {
                    showError(data.error);
                }
            } catch (err) {
                showError('Terjadi kesalahan update kredit.');
            }
        }
    }

    // Toggle user ban action
    async function handleToggleBan(e) {
        const btn = e.currentTarget;
        const userId = btn.getAttribute('data-id');

        const confirm = await Swal.fire({
            title: 'KONFIRMASI TINDAKAN',
            text: 'Merubah status blokir akses pengguna terpilih.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ffffff',
            cancelButtonColor: 'rgba(255,255,255,0.05)',
            confirmButtonText: 'Ya, Terapkan!',
            background: '#080808',
            color: '#ffffff'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await fetch('/api/admin/user/toggle-ban', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                });
                const data = await res.json();
                if (res.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'SUKSES!',
                        text: data.message,
                        background: '#080808',
                        color: '#ffffff',
                        confirmButtonColor: '#ffffff'
                    });
                    loadAdminPanel(); // reload tables
                } else {
                    showError(data.error);
                }
            } catch (err) {
                showError('Terjadi kesalahan toggle status.');
            }
        }
    }

    // --- Helper Functions ---
    
    // Switch Screen Visibility
    function showScreen(screenName) {
        screenAuth.classList.add('hidden');
        screenDashboard.classList.add('hidden');
        screenAdmin.classList.add('hidden');
        screenPurchase.classList.add('hidden');
        screenProfile.classList.add('hidden');

        // Toggle nav buttons depending on state
        if (currentUser) {
            btnDashboardView.classList.toggle('hidden', screenName === 'dashboard');
            btnPurchaseView.classList.toggle('hidden', screenName === 'purchase');
            btnProfileView.classList.toggle('hidden', screenName === 'profile');
            btnAdminView.classList.toggle('hidden', currentUser.role !== 'admin' || screenName === 'admin');
        }

        if (screenName === 'auth') {
            screenAuth.classList.remove('hidden');
            initTurnstile();
        } else if (screenName === 'dashboard') {
            screenDashboard.classList.remove('hidden');
        } else if (screenName === 'admin') {
            screenAdmin.classList.remove('hidden');
        } else if (screenName === 'purchase') {
            screenPurchase.classList.remove('hidden');
        } else if (screenName === 'profile') {
            screenProfile.classList.remove('hidden');
        }
    }

    // Load Profile Screen details
    async function loadProfile() {
        try {
            const res = await fetch('/api/auth/profile');
            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;

                document.getElementById('profile-username').textContent = currentUser.username;
                
                const roleBadge = document.getElementById('profile-role-badge');
                if (currentUser.role === 'admin') {
                    roleBadge.textContent = 'Admin';
                    roleBadge.className = 'badge badge-admin';
                    roleBadge.style.background = '#ffffff';
                    roleBadge.style.color = '#000000';
                    document.getElementById('profile-credits').innerHTML = '<i class="fa-solid fa-bolt"></i> Unlimited Credits';
                } else {
                    roleBadge.textContent = 'User';
                    roleBadge.className = 'badge badge-normal';
                    roleBadge.style.background = '';
                    roleBadge.style.color = '';
                    document.getElementById('profile-credits').innerHTML = `<i class="fa-solid fa-bolt"></i> ${currentUser.credits} Credits`;
                }

                const profileApiPlan = document.getElementById('profile-api-plan');
                const profileApiExpiryRow = document.getElementById('profile-api-expiry-row');
                const profileApiExpiry = document.getElementById('profile-api-expiry');

                if (currentUser.apiPlan && currentUser.apiPlan !== 'none') {
                    profileApiPlan.textContent = currentUser.apiPlan === 'lifetime' ? 'Lifetime Plan' : 'Monthly Plan';
                    if (currentUser.apiPlan === 'lifetime') {
                        profileApiExpiry.textContent = 'Selamanya';
                    } else if (currentUser.apiExpiresAt) {
                        profileApiExpiry.textContent = new Date(currentUser.apiExpiresAt).toLocaleDateString('id-ID', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        });
                    }
                    profileApiExpiryRow.style.display = 'flex';
                } else {
                    profileApiPlan.textContent = 'None';
                    profileApiExpiryRow.style.display = 'none';
                }

                if (currentUser.createdAt) {
                    const joinDate = new Date(currentUser.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    });
                    document.getElementById('profile-join-date').textContent = joinDate;
                } else {
                    document.getElementById('profile-join-date').textContent = '-';
                }
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    // Update Nav bar details based on login state
    function updateNavbar() {
        if (!currentUser) {
            navMenu.classList.add('hidden');
            return;
        }

        navMenu.classList.remove('hidden');
        navUsername.textContent = currentUser.username;
        
        btnPurchaseView.classList.remove('hidden');
        btnProfileView.classList.remove('hidden');
        btnDashboardView.classList.remove('hidden');
        
        const badgeAdminControl = document.getElementById('badge-admin-control');

        // Show Admin controls if role is admin
        if (currentUser.role === 'admin') {
            navCredits.textContent = 'Unlimited';
            if (navRoleBadge) {
                navRoleBadge.textContent = 'Admin';
                navRoleBadge.className = 'badge badge-admin';
            }
            if (badgeAdminControl) badgeAdminControl.classList.remove('hidden');
            btnAdminView.classList.remove('hidden');
        } else {
            navCredits.textContent = currentUser.credits;
            if (navRoleBadge) {
                navRoleBadge.textContent = 'User';
                navRoleBadge.className = 'badge badge-normal';
            }
            if (badgeAdminControl) badgeAdminControl.classList.add('hidden');
            btnAdminView.classList.add('hidden');
        }
    }

    // Refresh Dashboard Screen details
    function loadDashboard() {
        updateNavbar();
        loadUserHistory();
        loadAPIPanel();
        btnDashboardView.classList.add('hidden');
        if (currentUser && currentUser.role === 'admin') {
            btnAdminView.classList.remove('hidden');
        }
    }

    async function loadAPIPanel() {
        try {
            const res = await fetch('/api/auth/profile');
            if (res.ok) {
                const data = await res.json();
                currentUser = data.user;
                
                const apiNoPlan = document.getElementById('api-no-plan');
                const apiActivePlan = document.getElementById('api-active-plan');
                
                if (currentUser.apiPlan && currentUser.apiPlan !== 'none') {
                    apiNoPlan.classList.add('hidden');
                    apiActivePlan.classList.remove('hidden');
                    
                    const planBadge = document.getElementById('api-plan-badge');
                    const planExpiry = document.getElementById('api-plan-expiry');
                    const keyInput = document.getElementById('api-key-input');
                    
                    planBadge.textContent = `Plan: ${currentUser.apiPlan === 'lifetime' ? 'Lifetime' : 'Bulanan'}`;
                    
                    if (currentUser.apiPlan === 'lifetime') {
                        planExpiry.textContent = 'Expired: Selamanya';
                    } else if (currentUser.apiExpiresAt) {
                        const expiryDate = new Date(currentUser.apiExpiresAt).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        planExpiry.textContent = `Expired: ${expiryDate}`;
                    } else {
                        planExpiry.textContent = 'Expired: -';
                    }
                    
                    keyInput.value = currentUser.apiKey || '';
                } else {
                    apiNoPlan.classList.remove('hidden');
                    apiActivePlan.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Failed to load API Panel:', error);
        }
    }

    async function loadPublicStats() {
        try {
            const res = await fetch('/api/public/stats');
            if (res.ok) {
                const data = await res.json();
                const authStatUsers = document.getElementById('auth-stat-users');
                const authStatSuccess = document.getElementById('auth-stat-success');
                if (authStatUsers) authStatUsers.textContent = data.totalUsers.toLocaleString('id-ID');
                if (authStatSuccess) authStatSuccess.textContent = data.totalSuccess.toLocaleString('id-ID');
            }
        } catch (error) {
            console.error('Failed to load public stats:', error);
        }
    }

    // Tabs switching for API Guide
    document.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
            const tabsContainer = tabBtn.parentElement;
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            
            const guideSection = tabsContainer.parentElement;
            guideSection.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            const targetId = tabBtn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        }
    });

    // Copy API Key
    document.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('#btn-copy-api');
        if (copyBtn) {
            const keyInput = document.getElementById('api-key-input');
            if (keyInput && keyInput.value && keyInput.value !== 'ak_am_...') {
                navigator.clipboard.writeText(keyInput.value).then(() => {
                    Swal.fire({
                        icon: 'success',
                        title: 'API KEY DISALIN!',
                        text: 'API Key berhasil disalin ke clipboard.',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000,
                        background: '#080808',
                        color: '#ffffff'
                    });
                }).catch(err => {
                    console.error('Failed to copy API key:', err);
                });
            }
        }
    });

    // Buy API Key (QRIS Mustika Payment)
    let paymentPollInterval = null;

    document.addEventListener('click', async (e) => {
        const buyBtn = e.target.closest('.buy-api-btn');
        if (buyBtn) {
            const planType = buyBtn.getAttribute('data-plan');
            const planName = planType === 'monthly' ? 'Bulanan (25k)' : 'Lifetime (50k)';
            
            Swal.fire({
                title: 'Membuat Invoice...',
                text: `Menyiapkan QRIS untuk plan ${planName}`,
                background: '#080808',
                color: '#ffffff',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const res = await fetch('/api/payment/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planType })
                });
                const data = await res.json();

                if (res.ok) {
                    Swal.fire({
                        title: `PEMBAYARAN QRIS - ${planName.toUpperCase()}`,
                        html: `
                            <p style="font-size:0.82rem;color:#8c8c8c;margin-bottom:15px;line-height:1.4;">Scan kode QRIS di bawah menggunakan GoPay, ShopeePay, DANA, OVO, LinkAja, atau Mobile Banking.</p>
                            <div style="background: white; padding: 12px; border-radius: 12px; width: 240px; margin: 0 auto 15px auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                                <img src="${data.transaction.qrUrl}" style="width:100%; display:block;">
                            </div>
                            <p style="font-size:0.78rem;color:#8c8c8c;margin-bottom:2px;">Nomor Referensi: ${data.transaction.refNo}</p>
                            <p style="font-size:1.15rem;color:#ffffff;font-weight:700;font-family:'Outfit',sans-serif;">Total Bayar: Rp ${data.transaction.amount.toLocaleString('id-ID')}</p>
                            <p style="font-size:0.75rem;color:#d9534f;margin-top:10px;font-weight:bold;"><i class="fa-solid fa-spinner fa-spin"></i> Menunggu Pembayaran Terdeteksi...</p>
                        `,
                        background: '#080808',
                        color: '#ffffff',
                        showCancelButton: true,
                        confirmButtonText: 'Cek Status Pembayaran <i class="fa-solid fa-sync"></i>',
                        cancelButtonText: 'Batal',
                        confirmButtonColor: '#ffffff',
                        cancelButtonColor: '#222222',
                        allowOutsideClick: false,
                        didOpen: () => {
                            if (paymentPollInterval) clearInterval(paymentPollInterval);
                            paymentPollInterval = setInterval(async () => {
                                try {
                                    const statusRes = await fetch(`/api/payment/status/${data.transaction.refNo}`);
                                    if (statusRes.ok) {
                                        const statusData = await statusRes.json();
                                        if (statusData.status === 'success') {
                                            clearInterval(paymentPollInterval);
                                            paymentPollInterval = null;
                                            Swal.close();
                                            Swal.fire({
                                                icon: 'success',
                                                title: 'PEMBAYARAN SUKSES!',
                                                text: 'API Key Anda telah aktif! Silakan salin API Key di panel dashboard Anda.',
                                                background: '#080808',
                                                color: '#ffffff',
                                                confirmButtonColor: '#ffffff'
                                            });
                                            loadAPIPanel();
                                        }
                                    }
                                } catch (pollErr) {
                                    console.error('Polling error:', pollErr);
                                }
                            }, 7000);
                        },
                        willClose: () => {
                            if (paymentPollInterval) {
                                clearInterval(paymentPollInterval);
                                paymentPollInterval = null;
                            }
                        }
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            Swal.fire({
                                title: 'Mengecek Pembayaran...',
                                background: '#080808',
                                color: '#ffffff',
                                allowOutsideClick: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });
                            
                            try {
                                const statusRes = await fetch(`/api/payment/status/${data.transaction.refNo}`);
                                if (statusRes.ok) {
                                    const statusData = await statusRes.json();
                                    if (statusData.status === 'success') {
                                        Swal.fire({
                                            icon: 'success',
                                            title: 'PEMBAYARAN SUKSES!',
                                            text: 'API Key Anda telah aktif!',
                                            background: '#080808',
                                            color: '#ffffff',
                                            confirmButtonColor: '#ffffff'
                                        });
                                        loadAPIPanel();
                                    } else {
                                        Swal.fire({
                                            icon: 'warning',
                                            title: 'BELUM TERDETEKSI',
                                            text: 'Pembayaran belum terdeteksi. Silakan tunggu beberapa saat lalu coba cek kembali.',
                                            background: '#080808',
                                            color: '#ffffff',
                                            confirmButtonColor: '#ffffff'
                                        });
                                    }
                                } else {
                                    showError('Gagal memverifikasi status pembayaran.');
                                }
                            } catch (err) {
                                showError('Terjadi kesalahan koneksi.');
                            }
                        }
                    });
                } else {
                    showError(data.error || 'Gagal membuat invoice pembayaran.');
                }
            } catch (err) {
                showError('Terjadi kesalahan jaringan.');
            }
        }
    });

    // Show error popup alert
    function showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'KESALAHAN',
            text: message,
            background: '#080808',
            color: '#ffffff',
            confirmButtonColor: '#ffffff'
        });
    }

    // Escape HTML to prevent XSS in tables
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
