import React, { useState, useEffect, useRef } from 'react';

export default function AdminApp() {
    const [loading, setLoading] = useState(true);
    const [loaderProgress, setLoaderProgress] = useState(0);
    const [loaderText, setLoaderText] = useState('Menghubungkan ke Node Jaringan...');

    // Auth States
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState('');
    const [authError, setAuthError] = useState('');
    const [authErrorActive, setAuthErrorActive] = useState(false);

    // Form Inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Dashboard States
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard / activate / history / status
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [latency, setLatency] = useState(48);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Database and Stats
    const [activationHistory, setActivationHistory] = useState([]);
    const [dbTotalCount, setDbTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const BASE_ACTIVATED_COUNT = 12894;

    // Manual activation
    const [manualEmail, setManualEmail] = useState('');
    const [manualLink, setManualLink] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [manualResult, setManualResult] = useState(null);

    // Console log states (Prefilled with exact log lines from the screenshot)
    const [logs, setLogs] = useState([
        { time: '20:01:24', text: '🟢 Tautan masuk berhasil dikirim ke: ryuzosaja@gmail.com', type: 'success' },
        { time: '20:01:24', text: '📋 Silakan periksa kotak masuk (inbox) atau folder span pada email Anda.', type: 'info' },
        { time: '20:01:25', text: '⚡ Menunggu verifikasi ... Silakan tempelkan tautan verifikasi dari email Anda.', type: 'info' },
        { time: '20:01:25', text: '⚠️ Langkah iklan sponsor dilewati otomatis karena iklan belum aktif/diblokir.', type: 'warning' }
    ]);

    const turnstileLoginRef = useRef(null);
    const consoleEndRef = useRef(null);
    const [loginTurnstileToken, setLoginTurnstileToken] = useState('');

    // Loader animation sequence
    useEffect(() => {
        const steps = [
            [200, 20, 'Menghubungkan ke Node Jaringan...'],
            [600, 45, 'Memuat Modul Panel Admin...'],
            [1000, 70, 'Menyinkronkan Sesi Administrator...'],
            [1300, 90, 'Memvalidasi Akses Keamanan...'],
            [1600, 100, 'Sistem Siap!'],
        ];

        const timers = steps.map(([delay, progress, text]) =>
            setTimeout(() => { setLoaderProgress(progress); setLoaderText(text); }, delay)
        );
        const doneTimer = setTimeout(() => setLoading(false), 1800);

        return () => { timers.forEach(clearTimeout); clearTimeout(doneTimer); };
    }, []);

    // Check session on startup
    useEffect(() => {
        const sessionUser = sessionStorage.getItem('am_admin_logged_in');
        if (sessionUser) {
            setIsLoggedIn(true);
            setLoggedInUser(sessionUser);
            loadHistory();
        }
    }, []);

    // Render Cloudflare Turnstile
    useEffect(() => {
        if (!loading && !isLoggedIn && window.turnstile && turnstileLoginRef.current) {
            turnstileLoginRef.current.innerHTML = '';
            window.turnstile.render(turnstileLoginRef.current, {
                sitekey: '0x4AAAAAAD7RpjTPThhr5v1Q',
                theme: 'dark',
                callback: (token) => setLoginTurnstileToken(token)
            });
        }
    }, [loading, isLoggedIn]);

    // Anti-DevTools Protection
    useEffect(() => {
        const preventDev = (e) => {
            if (e.key === 'F12' || e.keyCode === 123) e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) e.preventDefault();
            if (e.ctrlKey && ['u','s'].includes(e.key)) e.preventDefault();
        };
        const preventRightClick = (e) => e.preventDefault();
        document.addEventListener('keydown', preventDev);
        document.addEventListener('contextmenu', preventRightClick);
        return () => {
            document.removeEventListener('keydown', preventDev);
            document.removeEventListener('contextmenu', preventRightClick);
        };
    }, []);

    // Latency simulation around 48ms
    useEffect(() => {
        if (isLoggedIn) {
            const timer = setInterval(() => setLatency(Math.floor(45 + Math.random() * 6)), 5000);
            return () => clearInterval(timer);
        }
    }, [isLoggedIn]);

    // Auto scroll console
    useEffect(() => {
        if (consoleEndRef.current) consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (text, type = 'default') => {
        const time = new Date().toTimeString().split(' ')[0];
        setLogs((prev) => [...prev, { time, text, type }]);
    };

    const loadHistory = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            if (response.ok && data.success) {
                setActivationHistory(data.history || []);
                setDbTotalCount(data.totalCount || 0);
                addLog(`⚙️ Sinkronisasi database cloud sukses. Ditemukan ${data.totalCount || 0} record.`, 'success');
            }
        } catch (e) {
            addLog('❌ Gagal sinkronisasi data dari database cloud.', 'error');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthErrorActive(false);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, token: loginTurnstileToken })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                sessionStorage.setItem('am_admin_logged_in', data.user.username);
                setIsLoggedIn(true);
                setLoggedInUser(data.user.username);
                setUsername(''); setPassword(''); setLoginTurnstileToken('');
                await loadHistory();
                addLog(`🔓 Administrator ${data.user.username} berhasil masuk sistem.`, 'success');
            } else {
                setAuthError(data.error || 'Username atau password salah.');
                setAuthErrorActive(true);
            }
        } catch {
            setAuthError('Gagal menghubungi server auth.');
            setAuthErrorActive(true);
        } finally {
            if (window.turnstile) window.turnstile.reset();
            setLoginTurnstileToken('');
        }
    };

    const handleManualActivate = async (e) => {
        e.preventDefault();
        if (!manualEmail || !manualLink) return;
        setManualLoading(true);
        setManualResult(null);
        addLog(`⚡ Memproses aktivasi manual untuk: ${manualEmail}`, 'info');
        try {
            const response = await fetch('/api/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: manualEmail, link: manualLink })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setManualResult({ success: true, orderId: data.orderId, email: data.user.email });
                addLog(`🟢 Aktivasi manual berhasil! Email: ${data.user.email} | Order ID: ${data.orderId}`, 'success');
                await loadHistory();
                setManualEmail(''); setManualLink('');
            } else {
                setManualResult({ success: false, error: data.error });
                addLog(`❌ Aktivasi manual gagal: ${data.error}`, 'error');
            }
        } catch (err) {
            setManualResult({ success: false, error: err.message });
            addLog(`❌ Koneksi server error: ${err.message}`, 'error');
        } finally {
            setManualLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('am_admin_logged_in');
        setIsLoggedIn(false); setLoggedInUser('');
        window.location.reload();
    };

    const handleCopyLog = () => {
        const text = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
        navigator.clipboard.writeText(text)
            .then(() => addLog('📋 Log berhasil disalin ke clipboard.', 'success'))
            .catch(() => addLog('❌ Gagal menyalin log.', 'error'));
    };

    const filteredHistory = activationHistory.filter(item =>
        !searchQuery || item.email.toLowerCase().includes(searchQuery.toLowerCase()) || item.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const todayCount = activationHistory.filter(item => {
        const d = new Date(item.timestamp);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }).length;

    const navItems = [
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Ikhtisar Utama' },
        { id: 'activate', icon: 'fa-bolt', label: 'Alat Aktivasi' },
        { id: 'history', icon: 'fa-clock-rotate-left', label: 'Riwayat Aktivasi' },
        { id: 'status', icon: 'fa-server', label: 'Status Server' },
    ];

    return (
        <>
            <div className="cyber-scanlines"></div>

            {/* Loading screen */}
            {loading && (
                <div className="loader-overlay">
                    <div className="loader-content">
                        <div className="loader-logo-sphere">
                            <div className="loader-pulse"></div>
                            <div className="loader-ring"></div>
                            <i className="fa-solid fa-wand-magic-sparkles loader-icon"></i>
                        </div>
                        <h2 className="loader-title text-gradient">AM Admin Panel</h2>
                        <div className="loader-progress-container">
                            <div className="loader-progress-bar" style={{ width: `${loaderProgress}%` }}></div>
                        </div>
                        <div className="loader-status">{loaderText}</div>
                    </div>
                </div>
            )}

            {/* Background Glows */}
            <div className="bg-glow bg-glow-1"></div>
            <div className="bg-glow bg-glow-2"></div>
            <div className="bg-glow bg-glow-3"></div>

            {/* Login Portal */}
            {!isLoggedIn && !loading && (
                <div className="auth-wrapper">
                    <div className="auth-card glassmorphism animate-scale-up" style={{ maxWidth: '420px' }}>
                        <div className="auth-agentic-sphere">
                            <div className="sphere-outer-pulse"></div>
                            <div className="sphere-inner-ring"></div>
                            <div className="sphere-core">
                                <i className="fa-solid fa-shield-halved sphere-brain-icon"></i>
                            </div>
                        </div>

                        <div className="auth-brand">
                            <h2 className="text-gradient">Admin Panel</h2>
                            <span>Akses Terbatas • Sistem Terproteksi</span>
                        </div>

                        {authErrorActive && (
                            <div className="auth-error-box active" style={{
                                color: 'var(--accent-red)',
                                background: 'rgba(255, 0, 60, 0.08)',
                                borderColor: 'rgba(255, 0, 60, 0.2)'
                            }}>
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                                {authError}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="auth-form active">
                            <div className="input-group">
                                <i className="fa-regular fa-user input-icon"></i>
                                <input
                                    type="text"
                                    placeholder="Nama Administrator"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>
                            <div className="input-group" style={{ position: 'relative' }}>
                                <i className="fa-solid fa-lock input-icon"></i>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Kata Sandi"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    style={{ paddingRight: '44px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'transparent', border: 'none', color: 'var(--color-text-muted)',
                                        cursor: 'pointer', fontSize: '14px', padding: '4px'
                                    }}
                                >
                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            <div ref={turnstileLoginRef} className="cf-turnstile" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}></div>
                            <button
                                type="submit"
                                className="btn btn-primary btn-glow w-full"
                                disabled={!loginTurnstileToken}
                            >
                                <span>Masuk ke Panel</span>
                                <i className="fa-solid fa-right-to-bracket"></i>
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '16px' }}>
                            <i className="fa-solid fa-circle-info" style={{ marginRight: '5px' }}></i>
                            Hanya pengguna yang terdaftar dapat mengakses panel ini.
                        </p>
                    </div>
                </div>
            )}

            {/* Dashboard Wrapper */}
            {isLoggedIn && !loading && (
                <div className="dashboard-layout">
                    {/* Left Sidebar */}
                    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                        <div className="sidebar-brand">
                            <div className="brand-logo">
                                <i className="fa-solid fa-wand-magic-sparkles logo-icon"></i>
                            </div>
                            <div className="brand-text">
                                <h2 style={{ textShadow: '0 0 10px rgba(0, 243, 255, 0.4)' }}>AM Premium</h2>
                                <span>PANEL PENGEMBANG</span>
                            </div>
                        </div>

                        <div className="sidebar-section-label">NAVIGASI</div>
                        <nav className="sidebar-menu">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                                    onClick={() => { setActiveTab(item.id); }}
                                    style={{ background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                                >
                                    <div className="menu-icon-wrap">
                                        <i className={`fa-solid ${item.icon} menu-icon`}></i>
                                    </div>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="sidebar-footer">
                            <div className="sidebar-section-label">AKUN</div>
                            <div className="dev-profile">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser || 'rehan')}&background=00f3ff&color=050508&bold=true&rounded=true`}
                                    alt="Profile"
                                    className="profile-img"
                                />
                                <div className="profile-info">
                                    <h4 style={{ textTransform: 'lowercase' }}>{loggedInUser || 'rehan'}</h4>
                                    <span><i className="fa-solid fa-circle sidebar-online-dot" style={{ color: 'var(--accent-green)' }}></i> Daring</span>
                                </div>
                                <button className="btn-logout" onClick={handleLogout} title="Keluar">
                                    <i className="fa-solid fa-right-from-bracket"></i>
                                </button>
                            </div>
                            <div className="app-version">v1.1.0-annual</div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="main-content">
                        {/* Top Header */}
                        <header className="top-header glassmorphism">
                            <button className="btn-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                <i className="fa-solid fa-bars-staggered"></i>
                            </button>
                            <div className="header-title">
                                <h1>
                                    {activeTab === 'dashboard' && 'Ikhtisar Utama'}
                                    {activeTab === 'activate' && 'Alat Aktivasi'}
                                    {activeTab === 'history' && 'Riwayat Aktivasi'}
                                    {activeTab === 'status' && 'Status Server'}
                                </h1>
                            </div>
                            <div className="header-actions">
                                <div className="server-status-pill">
                                    <span className="status-indicator-dot"></span>
                                    <span>Server: AKTIF</span>
                                </div>
                                <div className="profile-badge">
                                    <i className="fa-regular fa-bell header-icon"></i>
                                </div>
                            </div>
                        </header>

                        {/* Workspace Workspace */}
                        <main className="workspace" style={{ paddingBottom: '160px' }}>

                            {/* TAB 1: Ikhtisar Utama */}
                            {activeTab === 'dashboard' && (
                                <section className="dashboard-view active">
                                    {/* KPI Grid */}
                                    <div className="kpi-grid">
                                        {/* Card 1 */}
                                        <div className="kpi-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                            <div className="kpi-details">
                                                <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px' }}>TOTAL AKTIVASI LISENSI</span>
                                                <h3 style={{ fontSize: '26px', margin: '4px 0', fontFamily: 'var(--font-heading)' }}>
                                                    {(BASE_ACTIVATED_COUNT + dbTotalCount).toLocaleString('id-ID')}
                                                </h3>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    background: 'rgba(188, 19, 254, 0.15)',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '9px',
                                                    fontWeight: '700',
                                                    color: 'var(--accent-purple)',
                                                    border: '1px solid rgba(188, 19, 254, 0.2)'
                                                }}>
                                                    <i className="fa-solid fa-crown" style={{ fontSize: '8px' }}></i>
                                                    +142 Hari Ini
                                                </div>
                                            </div>
                                            <div className="kpi-icon-wrapper" style={{
                                                background: 'rgba(188, 19, 254, 0.1)',
                                                border: '1px solid rgba(188, 19, 254, 0.25)',
                                                color: 'var(--accent-purple)',
                                                boxShadow: '0 0 10px rgba(188, 19, 254, 0.15)'
                                            }}>
                                                <i className="fa-solid fa-users-viewfinder"></i>
                                            </div>
                                        </div>

                                        {/* Card 2 */}
                                        <div className="kpi-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                            <div className="kpi-details">
                                                <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px' }}>AKTIVASI DATABASE CLOUD</span>
                                                <h3 style={{ fontSize: '26px', margin: '4px 0', fontFamily: 'var(--font-heading)' }}>
                                                    {dbTotalCount}
                                                </h3>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '10px',
                                                    color: 'var(--accent-magenta)',
                                                    fontWeight: '500'
                                                }}>
                                                    <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '9px' }}></i>
                                                    Sinkronisasi Cloud
                                                </div>
                                            </div>
                                            <div className="kpi-icon-wrapper" style={{
                                                background: 'rgba(255, 0, 160, 0.1)',
                                                border: '1px solid rgba(255, 0, 160, 0.25)',
                                                color: 'var(--accent-magenta)',
                                                boxShadow: '0 0 10px rgba(255, 0, 160, 0.15)'
                                            }}>
                                                <i className="fa-solid fa-database"></i>
                                            </div>
                                        </div>

                                        {/* Card 3 */}
                                        <div className="kpi-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                            <div className="kpi-details">
                                                <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px' }}>LATENSI RESPON NODE</span>
                                                <h3 style={{ fontSize: '26px', margin: '4px 0', fontFamily: 'var(--font-heading)' }}>
                                                    {latency}ms
                                                </h3>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '10px',
                                                    color: 'var(--accent-cyan)',
                                                    fontWeight: '500'
                                                }}>
                                                    Koneksi Server Stabil
                                                </div>
                                            </div>
                                            <div className="kpi-icon-wrapper" style={{
                                                background: 'rgba(0, 243, 255, 0.1)',
                                                border: '1px solid rgba(0, 243, 255, 0.25)',
                                                color: 'var(--accent-cyan)',
                                                boxShadow: '0 0 10px rgba(0, 243, 255, 0.15)'
                                            }}>
                                                <i className="fa-solid fa-gauge-high"></i>
                                            </div>
                                        </div>

                                        {/* Card 4 */}
                                        <div className="kpi-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                            <div className="kpi-details">
                                                <span style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.8px' }}>TINGKAT KEBERHASILAN</span>
                                                <h3 style={{ fontSize: '26px', margin: '4px 0', fontFamily: 'var(--font-heading)', color: 'var(--accent-green)' }}>
                                                    99.8%
                                                </h3>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '10px',
                                                    color: 'var(--color-text-muted)',
                                                    fontWeight: '500'
                                                }}>
                                                    Validasi Berhasil Dilewati
                                                </div>
                                            </div>
                                            <div className="kpi-icon-wrapper" style={{
                                                background: 'rgba(0, 255, 102, 0.1)',
                                                border: '1px solid rgba(0, 255, 102, 0.25)',
                                                color: 'var(--accent-green)',
                                                boxShadow: '0 0 10px rgba(0, 255, 102, 0.15)'
                                            }}>
                                                <i className="fa-solid fa-circle-check"></i>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Main Content Layout */}
                                    <div className="dashboard-content-layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                                        {/* Left Side: Pemberitahuan Utama */}
                                        <div className="content-card glassmorphism-sub" style={{ borderRadius: '12px', border: '1px solid rgba(0, 243, 255, 0.15)' }}>
                                            <div className="ticker-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                <i className="fa-solid fa-book-open" style={{ color: 'var(--accent-cyan)', fontSize: '14px' }}></i>
                                                <h4 style={{ margin: 0, fontSize: '11px', color: 'var(--accent-cyan)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                                    PEMBERITAHUAN UTAMA
                                                </h4>
                                            </div>
                                            <div className="ticker-body">
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                                                    Selamat datang di Panel Administrasi Aktivasi Alight Motion Premium. Pastikan koneksi server utama terhubung dengan stabil saat memproses pembaruan akun. Hubungi administrator jika terjadi kegagalan sistem.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Side: Aktivasi Lisensi Baru */}
                                        <div className="content-card glassmorphism-sub" style={{
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 0, 160, 0.15)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#ffffff', fontWeight: '700' }}>
                                                Aktivasi Lisensi Baru
                                            </h4>
                                            <p style={{ margin: '0 0 16px 0', fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                                                Lakukan aktivasi langganan premium 1 tahun secara langsung ke alamat email yang dituju.
                                            </p>
                                            <button
                                                className="btn btn-primary w-full"
                                                onClick={() => setActiveTab('activate')}
                                                style={{
                                                    background: 'var(--gradient-cyan-blue)',
                                                    border: '1px solid rgba(0, 243, 255, 0.4)',
                                                    boxShadow: '0 0 12px rgba(0, 243, 255, 0.3)',
                                                    borderRadius: '8px',
                                                    fontSize: '11.5px',
                                                    padding: '10px 18px',
                                                    fontWeight: '700'
                                                }}
                                            >
                                                <span>PROSES AKTIVASI</span>
                                                <i className="fa-solid fa-circle-arrow-right" style={{ fontSize: '13px' }}></i>
                                            </button>
                                            {/* Faint Key Watermark in the background */}
                                            <i className="fa-solid fa-key" style={{
                                                position: 'absolute',
                                                bottom: '-12px',
                                                right: '-12px',
                                                fontSize: '80px',
                                                color: 'rgba(255, 0, 160, 0.03)',
                                                pointerEvents: 'none',
                                                transform: 'rotate(-45deg)'
                                            }}></i>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* TAB 2: Alat Aktivasi */}
                            {activeTab === 'activate' && (
                                <section className="dashboard-view active">
                                    <div className="content-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Aktivasi Manual Premium</h3>
                                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
                                            Gunakan formulir ini untuk mengaktifkan akun pengguna secara manual menggunakan email dan magic link dari Alight Motion.
                                        </p>

                                        <form onSubmit={handleManualActivate}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                                                <div>
                                                    <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent-cyan)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                                                        Alamat Email Pengguna
                                                    </label>
                                                    <div className="input-group">
                                                        <i className="fa-regular fa-envelope input-icon"></i>
                                                        <input
                                                            type="email"
                                                            placeholder="user@example.com"
                                                            required
                                                            value={manualEmail}
                                                            onChange={(e) => setManualEmail(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '20px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent-cyan)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                                                    Magic Link Alight Motion
                                                </label>
                                                <div className="input-group">
                                                    <i className="fa-solid fa-link input-icon" style={{ top: '16px' }}></i>
                                                    <textarea
                                                        placeholder="Tempelkan URL magic link dari email Alight Motion di sini..."
                                                        required
                                                        style={{ minHeight: '90px' }}
                                                        value={manualLink}
                                                        onChange={(e) => setManualLink(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {manualResult && (
                                                <div className="auth-error-box active" style={{
                                                    marginBottom: '16px',
                                                    color: manualResult.success ? 'var(--accent-green)' : 'var(--accent-red)',
                                                    background: manualResult.success ? 'rgba(0,255,102,0.08)' : 'rgba(255,0,60,0.08)',
                                                    borderColor: manualResult.success ? 'rgba(0,255,102,0.2)' : 'rgba(255,0,60,0.2)'
                                                }}>
                                                    {manualResult.success ? (
                                                        <><i className="fa-solid fa-crown" style={{ marginRight: '8px' }}></i>
                                                            Aktivasi Berhasil! Order ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{manualResult.orderId}</strong>
                                                        </>
                                                    ) : (
                                                        <><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>{manualResult.error}</>
                                                    )}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => { setManualEmail(''); setManualLink(''); setManualResult(null); }}
                                                >
                                                    <i className="fa-solid fa-xmark"></i> Batal
                                                </button>
                                                <button
                                                    type="submit"
                                                    className={`btn btn-primary btn-glow ${manualLoading ? 'loading' : ''}`}
                                                    disabled={manualLoading}
                                                    style={{ flex: 1 }}
                                                >
                                                    {manualLoading ? (
                                                        <><i className="fa-solid fa-spinner fa-spin"></i> Memproses...</>
                                                    ) : (
                                                        <><span>Aktifkan Premium</span><i className="fa-solid fa-bolt"></i></>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </section>
                            )}

                            {/* TAB 3: Riwayat Aktivasi */}
                            {activeTab === 'history' && (
                                <section className="dashboard-view active">
                                    <div className="content-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Riwayat Aktivasi</h2>
                                                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Menampilkan log riwayat lisensi tersinkronisasi.</p>
                                            </div>
                                            <div className="input-group" style={{ width: '260px', marginBottom: 0 }}>
                                                <i className="fa-solid fa-magnifying-glass input-icon"></i>
                                                <input
                                                    type="text"
                                                    placeholder="Cari email / order ID..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="table-container">
                                            <table className="history-table">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Email</th>
                                                        <th>ID Transaksi</th>
                                                        <th>Tanggal Aktivasi</th>
                                                        <th>Durasi</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredHistory.length === 0 ? (
                                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                                                            <i className="fa-regular fa-folder-open" style={{ display: 'block', fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}></i>
                                                            <p>Belum ada data riwayat.</p>
                                                        </td></tr>
                                                    ) : filteredHistory.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="text-muted" style={{ fontSize: '12px' }}>{idx + 1}</td>
                                                            <td style={{ fontWeight: 600, color: '#fff' }}>{item.email}</td>
                                                            <td className="accent-text" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{item.orderId}</td>
                                                            <td>{new Date(item.timestamp).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                                                            <td>1 Tahun</td>
                                                            <td><span className="badge badge-success"><i className="fa-solid fa-crown" style={{ fontSize: '9px', marginRight: '4px' }}></i>Premium Aktif</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* TAB 4: Status Server */}
                            {activeTab === 'status' && (
                                <section className="dashboard-view active">
                                    <div className="status-grid">
                                        <div className="content-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                                                <i className="fa-solid fa-network-wired" style={{ marginRight: '8px' }}></i>Node Gateway
                                            </h3>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>Operasional node cloud terkoneksi penuh.</p>
                                            <div className="node-list">
                                                {[
                                                    ['Node Autentikasi Utama', 'AKTIF', latency + 'ms'],
                                                    ['Node Verifikasi Lisensi', 'AKTIF', (latency + 2) + 'ms'],
                                                    ['Node Database Cloud', 'AKTIF', (latency + 5) + 'ms'],
                                                ].map(([name, status, ping]) => (
                                                    <div className="node-item" key={name}>
                                                        <span className="node-status status-online"></span>
                                                        <div className="node-info">
                                                            <h4>{name}</h4>
                                                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ping: {ping}</span>
                                                        </div>
                                                        <span className="badge badge-success">{status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="content-card glassmorphism-sub" style={{ borderRadius: '12px' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                                                <i className="fa-solid fa-gears" style={{ marginRight: '8px' }}></i>Konfigurasi
                                            </h3>
                                            <div className="config-table">
                                                {[
                                                    ['Jenis Klien', 'CLIENT_TYPE_ANDROID'],
                                                    ['Paket Android', 'com.alightcreative.motion'],
                                                    ['Versi Minimum', '585'],
                                                    ['ID Produk', 'am.full.sub.annual.19q4'],
                                                    ['Database', 'MongoDB Atlas'],
                                                ].map(([k, v]) => (
                                                    <div className="config-row" key={k}>
                                                        <span>{k}</span>
                                                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{v}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </main>

                        {/* Bottom Log Activities Console */}
                        <footer className="app-console" style={{ position: 'fixed', bottom: 0, right: 0, left: sidebarOpen ? '268px' : 0, transition: 'left 0.3s ease', zIndex: 95 }}>
                            <div className="console-header">
                                <div className="console-dots">
                                    <span className="console-dot dot-red"></span>
                                    <span className="console-dot dot-yellow"></span>
                                    <span className="console-dot dot-green"></span>
                                </div>
                                <span className="console-title">
                                    <i className="fa-solid fa-terminal" style={{ color: 'var(--accent-green)', marginRight: '6px' }}></i>
                                    LOG AKTIVASI SISTEM
                                </span>
                                <div className="console-actions">
                                    <button className="btn-console-action" onClick={handleCopyLog} title="Salin Log">
                                        <i className="fa-regular fa-copy"></i>
                                    </button>
                                    <button className="btn-console-action" onClick={() => setLogs([])} title="Bersihkan Log">
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="console-body" style={{ height: '115px' }}>
                                {logs.map((log, idx) => (
                                    <div key={idx} className="log-line" style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                        <span className="text-muted" style={{ minWidth: '70px' }}>[{log.time}]</span>
                                        <span style={{
                                            color: log.text.includes('🟢') || log.text.includes('berhasil') ? 'var(--accent-green)' :
                                                   log.text.includes('⚠️') ? 'var(--accent-gold)' :
                                                   log.text.includes('❌') ? 'var(--accent-red)' : '#ffffff'
                                        }}>
                                            {log.text}
                                        </span>
                                    </div>
                                ))}
                                <div ref={consoleEndRef}></div>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
}
