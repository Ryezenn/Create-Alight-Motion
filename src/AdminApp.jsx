import React, { useState, useEffect, useRef } from 'react';

export default function AdminApp() {
    const [loading, setLoading] = useState(true);
    const [loaderProgress, setLoaderProgress] = useState(0);
    const [loaderText, setLoaderText] = useState('Menghubungkan ke Node Jaringan...');

    // Auth States - LOGIN ONLY, no register
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState('');
    const [authError, setAuthError] = useState('');
    const [authErrorActive, setAuthErrorActive] = useState(false);

    // Form Inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Dashboard States
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [latency, setLatency] = useState(42);
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

    // Console log states
    const [logs, setLogs] = useState([
        { time: new Date().toTimeString().split(' ')[0], text: 'Panel administrasi siap digunakan.', type: 'muted' }
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
        const doneTimer = setTimeout(() => setLoading(false), 2000);

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

    // Latency simulation
    useEffect(() => {
        if (isLoggedIn) {
            const timer = setInterval(() => setLatency(Math.floor(38 + Math.random() * 20)), 4500);
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
                addLog(`✅ Sinkronisasi berhasil. ${data.totalCount || 0} record ditemukan.`, 'success');
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
                addLog(`✅ Aktivasi manual berhasil! Order ID: ${data.orderId}`, 'success');
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

    const weekCount = activationHistory.filter(item => {
        const d = new Date(item.timestamp);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
    }).length;

    const navItems = [
        { id: 'dashboard', icon: 'fa-chart-pie', label: 'Ikhtisar' },
        { id: 'history', icon: 'fa-clock-rotate-left', label: 'Riwayat' },
        { id: 'activate', icon: 'fa-bolt', label: 'Aktivasi Manual' },
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
                            <i className="fa-solid fa-shield-halved loader-icon"></i>
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

            {/* ───────────────── LOGIN ONLY (no register tab) ───────────────── */}
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

            {/* ───────────────── FULL DASHBOARD ───────────────── */}
            {isLoggedIn && !loading && (
                <div className="dashboard-layout">
                    {/* Sidebar */}
                    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ minWidth: sidebarOpen ? '240px' : '0' }}>
                        <div className="sidebar-brand">
                            <div className="brand-logo">
                                <i className="fa-solid fa-shield-halved logo-icon"></i>
                            </div>
                            <div className="brand-text">
                                <h2 className="text-gradient">AM Premium</h2>
                                <span>Panel Pengembang</span>
                            </div>
                            <button
                                className="btn-close-sidebar"
                                onClick={() => setSidebarOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', marginLeft: 'auto', cursor: 'pointer' }}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="sidebar-section-label">NAVIGASI</div>
                        <nav className="sidebar-menu">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                                    onClick={() => { setActiveTab(item.id); if (window.innerWidth <= 990) setSidebarOpen(false); }}
                                    style={{ background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                                >
                                    <div className="menu-icon-wrap"><i className={`fa-solid ${item.icon} menu-icon`}></i></div>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        <div className="sidebar-footer">
                            <div className="sidebar-section-label">AKUN</div>
                            <div className="dev-profile">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser)}&background=00f3ff&color=050508&bold=true&rounded=true`}
                                    alt="Profile"
                                    className="profile-img"
                                />
                                <div className="profile-info">
                                    <h4>{loggedInUser}</h4>
                                    <span><i className="fa-solid fa-circle sidebar-online-dot"></i> Daring</span>
                                </div>
                                <button className="btn-logout" onClick={handleLogout} title="Keluar">
                                    <i className="fa-solid fa-right-from-bracket"></i>
                                </button>
                            </div>
                            <div className="app-version">v1.2.0-stable</div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="main-content">
                        {/* Header */}
                        <header className="top-header glassmorphism">
                            <button className="btn-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
                                <i className={`fa-solid ${sidebarOpen ? 'fa-indent' : 'fa-bars-staggered'}`}></i>
                            </button>
                            <div className="header-title">
                                <h1>
                                    {activeTab === 'dashboard' && <><i className="fa-solid fa-chart-pie" style={{ marginRight: '10px', color: 'var(--accent-cyan)' }}></i>Ikhtisar Utama</>}
                                    {activeTab === 'history' && <><i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '10px', color: 'var(--accent-magenta)' }}></i>Riwayat Aktivasi</>}
                                    {activeTab === 'activate' && <><i className="fa-solid fa-bolt" style={{ marginRight: '10px', color: 'var(--accent-cyan)' }}></i>Aktivasi Manual</>}
                                    {activeTab === 'status' && <><i className="fa-solid fa-server" style={{ marginRight: '10px', color: 'var(--accent-green)' }}></i>Status Server</>}
                                </h1>
                            </div>
                            <div className="header-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={loadHistory}
                                    style={{ padding: '6px 14px', fontSize: '12px', gap: '6px' }}
                                    title="Refresh data"
                                >
                                    <i className={`fa-solid fa-rotate-right ${isRefreshing ? 'fa-spin' : ''}`}></i>
                                    Refresh
                                </button>
                                <div className="server-status-pill">
                                    <span className="status-indicator-dot"></span>
                                    <span>Server: AKTIF</span>
                                </div>
                            </div>
                        </header>

                        {/* Workspace */}
                        <main className="workspace">

                            {/* ── TAB 1: OVERVIEW ── */}
                            {activeTab === 'dashboard' && (
                                <section className="dashboard-view active">
                                    {/* KPI Cards */}
                                    <div className="kpi-grid">
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>TOTAL AKTIVASI</span>
                                                <h3 className="accent-text">{(BASE_ACTIVATED_COUNT + dbTotalCount).toLocaleString('id-ID')}</h3>
                                                <p className="text-success"><i className="fa-solid fa-circle-arrow-up"></i> Total Lisensi Aktif</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-green">
                                                <i className="fa-solid fa-users-viewfinder"></i>
                                            </div>
                                        </div>
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>DATABASE CLOUD</span>
                                                <h3 style={{ color: 'var(--accent-purple)', textShadow: '0 0 8px var(--accent-purple-glow)' }}>{dbTotalCount.toLocaleString('id-ID')}</h3>
                                                <p className="text-success"><i className="fa-solid fa-cloud-arrow-up"></i> Record MongoDB</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-purple">
                                                <i className="fa-solid fa-database"></i>
                                            </div>
                                        </div>
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>AKTIVASI HARI INI</span>
                                                <h3 style={{ color: 'var(--accent-cyan)' }}>{todayCount}</h3>
                                                <p className="text-success"><i className="fa-solid fa-calendar-day"></i> {weekCount} minggu ini</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-cyan">
                                                <i className="fa-solid fa-fire-flame-curved"></i>
                                            </div>
                                        </div>
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>LATENSI NODE</span>
                                                <h3 style={{ color: 'var(--accent-green)' }}>{latency}ms</h3>
                                                <p className="text-success"><i className="fa-solid fa-shield-check"></i> Koneksi Stabil</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-green">
                                                <i className="fa-solid fa-gauge-high"></i>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Activations Preview */}
                                    <div className="dashboard-content-layout" style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {/* Recent Table */}
                                        <div className="content-card glassmorphism-sub" style={{ gridColumn: 'span 2' }}>
                                            <div className="ticker-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h4><i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent-cyan)', marginRight: '8px' }}></i>Aktivasi Terbaru</h4>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '4px 12px', fontSize: '11px' }}
                                                    onClick={() => setActiveTab('history')}
                                                >
                                                    Lihat Semua <i className="fa-solid fa-arrow-right"></i>
                                                </button>
                                            </div>
                                            <div className="table-container">
                                                <table className="history-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Email</th>
                                                            <th>Order ID</th>
                                                            <th>Tanggal</th>
                                                            <th>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {activationHistory.slice(0, 5).length === 0 ? (
                                                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                                                                <i className="fa-regular fa-folder-open" style={{ fontSize: '20px', marginBottom: '8px', display: 'block' }}></i>
                                                                Belum ada data.
                                                            </td></tr>
                                                        ) : activationHistory.slice(0, 5).map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td style={{ fontWeight: 600, color: '#fff' }}>{item.email}</td>
                                                                <td className="accent-text" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{item.orderId}</td>
                                                                <td>{new Date(item.timestamp).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}</td>
                                                                <td><span className="badge badge-success"><i className="fa-solid fa-crown" style={{ fontSize: '9px', marginRight: '4px' }}></i>Premium Aktif</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* System Info */}
                                        <div className="content-card glassmorphism-sub">
                                            <h4 style={{ marginBottom: '14px', color: 'var(--accent-cyan)' }}><i className="fa-solid fa-circle-info" style={{ marginRight: '8px' }}></i>Info Sistem</h4>
                                            <div className="config-table">
                                                {[
                                                    ['Versi Panel', 'v1.2.0-stable'],
                                                    ['Klien Target', 'Alight Motion Android'],
                                                    ['Paket App', 'com.alightcreative.motion'],
                                                    ['ID Produk', 'am.full.sub.annual.19q4'],
                                                    ['Versi Min App', '585'],
                                                ].map(([k, v]) => (
                                                    <div className="config-row" key={k}>
                                                        <span>{k}</span>
                                                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{v}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="content-card glassmorphism-sub">
                                            <h4 style={{ marginBottom: '14px', color: 'var(--accent-magenta)' }}><i className="fa-solid fa-bolt" style={{ marginRight: '8px' }}></i>Aksi Cepat</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <button className="btn btn-primary btn-glow" onClick={() => setActiveTab('activate')}>
                                                    <i className="fa-solid fa-wand-magic-sparkles"></i> Aktivasi Manual
                                                </button>
                                                <button className="btn btn-secondary" onClick={() => setActiveTab('history')}>
                                                    <i className="fa-solid fa-list"></i> Lihat Riwayat Lengkap
                                                </button>
                                                <button className="btn btn-secondary" onClick={loadHistory} disabled={isRefreshing}>
                                                    <i className={`fa-solid fa-rotate-right ${isRefreshing ? 'fa-spin' : ''}`}></i> Sinkronisasi Database
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ── TAB 2: HISTORY ── */}
                            {activeTab === 'history' && (
                                <section className="dashboard-view active">
                                    <div className="content-card glassmorphism-sub">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Riwayat Aktivasi Lisensi</h2>
                                                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{filteredHistory.length} record ditemukan dari {dbTotalCount} total</p>
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
                                                        <th>Alamat Email</th>
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
                                                            <p>Belum ada data{searchQuery ? ` untuk "${searchQuery}"` : ''}.</p>
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

                            {/* ── TAB 3: MANUAL ACTIVATE ── */}
                            {activeTab === 'activate' && (
                                <section className="dashboard-view active">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div className="content-card glassmorphism-sub" style={{ gridColumn: 'span 2' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Aktivasi Manual Premium</h3>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
                                                Gunakan formulir ini untuk mengaktifkan akun pengguna secara manual menggunakan email dan magic link dari Alight Motion.
                                            </p>

                                            <form onSubmit={handleManualActivate}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent-cyan)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                                                            Alamat Email Pengguna
                                                        </label>
                                                        <div className="input-group" style={{ marginBottom: 0 }}>
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
                                                    <div className="input-group" style={{ marginBottom: 0 }}>
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
                                                                Berhasil! Order ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{manualResult.orderId}</strong>
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
                                                        <i className="fa-solid fa-xmark"></i> Reset
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
                                                            <><span>Aktifkan Premium Sekarang</span><i className="fa-solid fa-bolt"></i></>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>

                                        {/* Help panel */}
                                        <div className="content-card glassmorphism-sub" style={{ gridColumn: 'span 2' }}>
                                            <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '12px' }}><i className="fa-regular fa-lightbulb" style={{ marginRight: '8px' }}></i>Panduan Penggunaan</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.7' }}>
                                                <div>
                                                    <h5 style={{ color: '#fff', marginBottom: '8px', fontSize: '13px' }}>📧 Cara Mendapat Magic Link</h5>
                                                    <ol style={{ paddingLeft: '16px' }}>
                                                        <li>Minta pengguna login ke akunnya di web Alight Motion</li>
                                                        <li>Buka email subjek <strong style={{ color: '#fff' }}>"Sign in to Alight Motion"</strong></li>
                                                        <li>Salin URL tautan magic link lengkap (mengandung <code style={{ color: 'var(--accent-cyan)', fontSize: '11px' }}>oobCode</code>)</li>
                                                        <li>Tempelkan ke formulir di atas</li>
                                                    </ol>
                                                </div>
                                                <div>
                                                    <h5 style={{ color: '#fff', marginBottom: '8px', fontSize: '13px' }}>⚠️ Perhatian Penting</h5>
                                                    <ul style={{ paddingLeft: '16px' }}>
                                                        <li>Magic link hanya berlaku <strong style={{ color: '#fff' }}>1x pakai</strong> dan akan kadaluarsa</li>
                                                        <li>Pastikan email sesuai dengan akun yang memiliki magic link</li>
                                                        <li>Aktivasi berhasil akan langsung tercatat di database</li>
                                                        <li>Durasi premium: <strong style={{ color: 'var(--accent-cyan)' }}>1 Tahun</strong> sejak aktivasi</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ── TAB 4: STATUS ── */}
                            {activeTab === 'status' && (
                                <section className="dashboard-view active">
                                    <div className="status-grid">
                                        {/* Node Status */}
                                        <div className="content-card glassmorphism-sub">
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                                                <i className="fa-solid fa-network-wired" style={{ marginRight: '8px' }}></i>Status Node Jaringan
                                            </h3>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>Seluruh node server terhubung dan beroperasi normal.</p>
                                            <div className="node-list">
                                                {[
                                                    ['Node Autentikasi Utama', 'AKTIF', latency + 'ms'],
                                                    ['Node Verifikasi Lisensi', 'AKTIF', (latency + 3) + 'ms'],
                                                    ['Node Database Cloud', 'AKTIF', (latency + 8) + 'ms'],
                                                    ['Node API Gateway', 'AKTIF', (latency + 1) + 'ms'],
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

                                        {/* App Config */}
                                        <div className="content-card glassmorphism-sub">
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                                                <i className="fa-solid fa-gears" style={{ marginRight: '8px' }}></i>Konfigurasi Klien
                                            </h3>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>Parameter standar Alight Motion yang telah terverifikasi.</p>
                                            <div className="config-table">
                                                {[
                                                    ['Jenis Klien', 'CLIENT_TYPE_ANDROID'],
                                                    ['Paket Android', 'com.alightcreative.motion'],
                                                    ['Versi Minimum', '585'],
                                                    ['ID Produk', 'am.full.sub.annual.19q4'],
                                                    ['Provider Auth', 'Firebase EmailLink'],
                                                    ['Database', 'MongoDB Atlas'],
                                                ].map(([k, v]) => (
                                                    <div className="config-row" key={k}>
                                                        <span>{k}</span>
                                                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{v}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Live Stats */}
                                        <div className="content-card glassmorphism-sub" style={{ gridColumn: 'span 2' }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
                                                <i className="fa-solid fa-chart-bar" style={{ marginRight: '8px' }}></i>Statistik Performa
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                                {[
                                                    { label: 'Latensi', val: latency + 'ms', icon: 'fa-gauge-high', color: 'var(--accent-cyan)' },
                                                    { label: 'Uptime', val: '99.9%', icon: 'fa-circle-check', color: 'var(--accent-green)' },
                                                    { label: 'Total Request', val: (BASE_ACTIVATED_COUNT + dbTotalCount).toLocaleString('id-ID'), icon: 'fa-arrows-rotate', color: 'var(--accent-magenta)' },
                                                    { label: 'Error Rate', val: '0.02%', icon: 'fa-shield-check', color: 'var(--accent-green)' },
                                                ].map(stat => (
                                                    <div key={stat.label} style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <i className={`fa-solid ${stat.icon}`} style={{ fontSize: '22px', color: stat.color, marginBottom: '8px', display: 'block', textShadow: `0 0 10px ${stat.color}` }}></i>
                                                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{stat.val}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{stat.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </main>

                        {/* Console Log Footer */}
                        <footer className="app-console">
                            <div className="console-header">
                                <div className="console-dots">
                                    <span className="console-dot dot-red"></span>
                                    <span className="console-dot dot-yellow"></span>
                                    <span className="console-dot dot-green"></span>
                                </div>
                                <span className="console-title"><i className="fa-solid fa-terminal"></i> Log Aktivitas Sistem</span>
                                <div className="console-actions">
                                    <button className="btn-console-action" onClick={handleCopyLog} title="Salin Log">
                                        <i className="fa-regular fa-copy"></i>
                                    </button>
                                    <button className="btn-console-action" onClick={() => setLogs([{ time: new Date().toTimeString().split(' ')[0], text: 'Log dibersihkan.', type: 'muted' }])} title="Bersihkan Log">
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="console-body">
                                {logs.map((log, idx) => (
                                    <div key={idx} className={`log-line ${log.type === 'muted' ? 'text-muted' : log.type === 'success' ? 'text-success' : log.type === 'error' ? 'text-error' : log.type === 'info' ? 'text-info' : ''}`}>
                                        <span className="text-muted">[{log.time}]</span> {log.text}
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
