import React, { useState, useEffect, useRef } from 'react';

export default function AdminApp() {
    const [loading, setLoading] = useState(true);
    const [loaderProgress, setLoaderProgress] = useState(0);
    const [loaderText, setLoaderText] = useState('Menghubungkan ke Node Jaringan...');
    
    // Auth States
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState('');
    const [authTab, setAuthTab] = useState('login'); // login / register
    const [authError, setAuthError] = useState('');
    const [authErrorActive, setAuthErrorActive] = useState(false);
    
    // Form Inputs
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Dashboard States
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard / history / status
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [latency, setLatency] = useState(42);
    
    // Database and Stats
    const [activationHistory, setActivationHistory] = useState([]);
    const [dbTotalCount, setDbTotalCount] = useState(0);
    const BASE_ACTIVATED_COUNT = 12894;
    
    // Console log states
    const [logs, setLogs] = useState([
        { time: new Date().toTimeString().split(' ')[0], text: 'Panel administrasi siap digunakan.', type: 'muted' }
    ]);
    
    const turnstileLoginRef = useRef(null);
    const turnstileRegisterRef = useRef(null);
    const consoleEndRef = useRef(null);
    
    const [loginTurnstileToken, setLoginTurnstileToken] = useState('');
    const [registerTurnstileToken, setRegisterTurnstileToken] = useState('');

    // Loader animation sequence
    useEffect(() => {
        const timer1 = setTimeout(() => {
            setLoaderProgress(25);
            setLoaderText('Menghubungkan ke Node Jaringan...');
        }, 200);

        const timer2 = setTimeout(() => {
            setLoaderProgress(60);
            setLoaderText('Memuat Modul Panel Admin...');
        }, 600);

        const timer3 = setTimeout(() => {
            setLoaderProgress(90);
            setLoaderText('Menyinkronkan Sesi Selesai...');
        }, 1100);

        const timer4 = setTimeout(() => {
            setLoaderProgress(100);
            setLoaderText('Sistem Siap!');
        }, 1400);

        const timer5 = setTimeout(() => {
            setLoading(false);
        }, 1700);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
            clearTimeout(timer5);
        };
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

    // Render Cloudflare Turnstile CAPTCHA for Login/Register dynamically in React
    useEffect(() => {
        if (!loading && !isLoggedIn) {
            if (authTab === 'login' && window.turnstile && turnstileLoginRef.current) {
                turnstileLoginRef.current.innerHTML = '';
                window.turnstile.render(turnstileLoginRef.current, {
                    sitekey: '0x4AAAAAAD7RpjTPThhr5v1Q',
                    theme: 'dark',
                    callback: (token) => {
                        setLoginTurnstileToken(token);
                    }
                });
            } else if (authTab === 'register' && window.turnstile && turnstileRegisterRef.current) {
                turnstileRegisterRef.current.innerHTML = '';
                window.turnstile.render(turnstileRegisterRef.current, {
                    sitekey: '0x4AAAAAAD7RpjTPThhr5v1Q',
                    theme: 'dark',
                    callback: (token) => {
                        setRegisterTurnstileToken(token);
                    }
                });
            }
        }
    }, [loading, isLoggedIn, authTab]);

    // Anti-DevTools Protection
    useEffect(() => {
        const preventDev = (e) => {
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
            }
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
                e.preventDefault();
            }
            if (e.ctrlKey && (e.key === 'u' || e.key === 's')) {
                e.preventDefault();
            }
        };

        const preventRightClick = (e) => e.preventDefault();

        document.addEventListener('keydown', preventDev);
        document.addEventListener('contextmenu', preventRightClick);

        const dbgInterval = setInterval(() => {
            try {
                (function() {
                    return function(a) {}
                })().constructor("debugger")();
            } catch (e) {}
        }, 100);

        return () => {
            document.removeEventListener('keydown', preventDev);
            document.removeEventListener('contextmenu', preventRightClick);
            clearInterval(dbgInterval);
        };
    }, []);

    // Simulated latency fluctuates
    useEffect(() => {
        if (isLoggedIn) {
            const timer = setInterval(() => {
                const randomVal = Math.floor(38 + Math.random() * 12);
                setLatency(randomVal);
            }, 4500);
            return () => clearInterval(timer);
        }
    }, [isLoggedIn]);

    // Auto scroll console log to bottom
    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (text, type = 'default') => {
        const time = new Date().toTimeString().split(' ')[0];
        setLogs((prev) => [...prev, { time, text, type }]);
    };

    const loadHistory = async () => {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            if (response.ok && data.success) {
                setActivationHistory(data.history || []);
                setDbTotalCount(data.totalCount || 0);
            }
        } catch (e) {
            console.error('Failed to load history:', e);
            addLog('❌ Gagal sinkronisasi data dari database cloud.', 'error');
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
                
                // Clear inputs
                setUsername('');
                setPassword('');
                setLoginTurnstileToken('');

                await loadHistory();
                addLog(`🔓 Administrator ${data.user.username} berhasil masuk sistem.`, 'success');
            } else {
                setAuthError(data.error || 'Username atau password salah.');
                setAuthErrorActive(true);
            }
        } catch (err) {
            setAuthError('Gagal menghubungi server auth.');
            setAuthErrorActive(true);
        } finally {
            if (window.turnstile) window.turnstile.reset();
            setLoginTurnstileToken('');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthErrorActive(false);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, token: registerTurnstileToken })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setAuthError('Registrasi berhasil. Silakan masuk.');
                setAuthErrorActive(true);
                
                setUsername('');
                setPassword('');
                setRegisterTurnstileToken('');

                setTimeout(() => {
                    setAuthTab('login');
                    setAuthErrorActive(false);
                }, 1500);
            } else {
                setAuthError(data.error || 'Registrasi gagal.');
                setAuthErrorActive(true);
            }
        } catch (err) {
            setAuthError('Gagal menghubungi server auth.');
            setAuthErrorActive(true);
        } finally {
            if (window.turnstile) window.turnstile.reset();
            setRegisterTurnstileToken('');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('am_admin_logged_in');
        setIsLoggedIn(false);
        setLoggedInUser('');
        window.location.reload();
    };

    const handleCopyLog = () => {
        const text = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
        navigator.clipboard.writeText(text)
            .then(() => addLog('📋 Log berhasil disalin ke clipboard.', 'success'))
            .catch(() => addLog('❌ Gagal menyalin log.', 'error'));
    };

    const handleClearLog = () => {
        setLogs([{ time: new Date().toTimeString().split(' ')[0], text: 'Log aktivitas dibersihkan.', type: 'muted' }]);
    };

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
                        <h2 className="loader-title text-gradient">Menginisialisasi Panel</h2>
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

            {/* Portal Login/Register */}
            {!isLoggedIn && !loading && (
                <div className="auth-wrapper">
                    <div className="auth-card glassmorphism animate-scale-up">
                        <div className="auth-agentic-sphere">
                            <div className="sphere-outer-pulse"></div>
                            <div className="sphere-inner-ring"></div>
                            <div className="sphere-core">
                                <i className="fa-solid fa-brain sphere-brain-icon"></i>
                            </div>
                        </div>
                        
                        <div className="auth-brand">
                            <h2 className="text-gradient">AM Premium</h2>
                            <span>Portal Otomasi Pengembang</span>
                        </div>

                        <div className="auth-tabs">
                            <button 
                                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                                onClick={() => { setAuthTab('login'); setAuthErrorActive(false); }}
                            >
                                Masuk
                            </button>
                            <button 
                                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                                onClick={() => { setAuthTab('register'); setAuthErrorActive(false); }}
                            >
                                Daftar
                            </button>
                        </div>

                        {authErrorActive && (
                            <div className="auth-error-box active" style={{
                                color: authError.includes('berhasil') ? 'var(--accent-green)' : 'var(--accent-red)',
                                background: authError.includes('berhasil') ? 'rgba(0, 255, 102, 0.08)' : 'rgba(255, 0, 60, 0.08)',
                                borderColor: authError.includes('berhasil') ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 0, 60, 0.2)'
                            }}>
                                {authError}
                            </div>
                        )}

                        {authTab === 'login' ? (
                            <form onSubmit={handleLogin} className="auth-form active">
                                <div className="input-group">
                                    <i className="fa-regular fa-user input-icon"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Nama Pengguna" 
                                        required 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autocomplete="username"
                                    />
                                </div>
                                <div className="input-group">
                                    <i className="fa-solid fa-lock input-icon"></i>
                                    <input 
                                        type="password" 
                                        placeholder="Kata Sandi" 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autocomplete="current-password"
                                    />
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
                        ) : (
                            <form onSubmit={handleRegister} className="auth-form active">
                                <div className="input-group">
                                    <i className="fa-regular fa-user input-icon"></i>
                                    <input 
                                        type="text" 
                                        placeholder="Nama Pengguna Baru" 
                                        required 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autocomplete="username"
                                    />
                                </div>
                                <div className="input-group">
                                    <i className="fa-solid fa-lock input-icon"></i>
                                    <input 
                                        type="password" 
                                        placeholder="Kata Sandi Baru" 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autocomplete="new-password"
                                    />
                                </div>
                                <div ref={turnstileRegisterRef} className="cf-turnstile" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}></div>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary btn-glow w-full"
                                    disabled={!registerTurnstileToken}
                                >
                                    <span>Daftar Akun Baru</span>
                                    <i className="fa-solid fa-user-plus"></i>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Dashboard Wrapper */}
            {isLoggedIn && !loading && (
                <div className="dashboard-layout">
                    {/* Sidebar Navigation */}
                    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                        <div className="sidebar-brand">
                            <div className="brand-logo">
                                <i className="fa-solid fa-wand-magic-sparkles logo-icon"></i>
                            </div>
                            <div className="brand-text">
                                <h2 className="text-gradient">AM Premium</h2>
                                <span>Panel Pengembang</span>
                            </div>
                            <button className="btn-close-sidebar" onClick={() => setSidebarOpen(false)} style={{
                                background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', marginLeft: 'auto', display: window.innerWidth <= 990 ? 'block' : 'none'
                            }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="sidebar-section-label">NAVIGASI</div>
                        <nav className="sidebar-menu">
                            <button 
                                className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                                style={{ background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            >
                                <div className="menu-icon-wrap"><i className="fa-solid fa-chart-pie menu-icon"></i></div>
                                <span>Ikhtisar Utama</span>
                            </button>
                            <button 
                                className={`menu-item ${activeTab === 'history' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('history'); setSidebarOpen(false); }}
                                style={{ background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            >
                                <div className="menu-icon-wrap"><i class="fa-solid fa-clock-rotate-left menu-icon"></i></div>
                                <span>Riwayat Aktivasi</span>
                            </button>
                            <button 
                                className={`menu-item ${activeTab === 'status' ? 'active' : ''}`}
                                onClick={() => { setActiveTab('status'); setSidebarOpen(false); }}
                                style={{ background: 'transparent', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                            >
                                <div className="menu-icon-wrap"><i className="fa-solid fa-server menu-icon"></i></div>
                                <span>Status Server</span>
                            </button>
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
                            <div className="app-version">v1.1.0-annual</div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="main-content">
                        {/* Header */}
                        <header className="top-header glassmorphism">
                            <button className="btn-hamburger" onClick={() => setSidebarOpen(true)}>
                                <i className="fa-solid fa-bars-staggered"></i>
                            </button>
                            <div className="header-title">
                                <h1>
                                    {activeTab === 'dashboard' && 'Ikhtisar Utama'}
                                    {activeTab === 'history' && 'Riwayat Aktivasi'}
                                    {activeTab === 'status' && 'Status Server & API'}
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

                        {/* Workspace Content */}
                        <main className="workspace">
                            
                            {/* TAB 1: Overview */}
                            {activeTab === 'dashboard' && (
                                <section className="dashboard-view active">
                                    <div className="kpi-grid">
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>TOTAL AKTIVASI LISENSI</span>
                                                <h3 className="accent-text">{(BASE_ACTIVATED_COUNT + dbTotalCount).toLocaleString('id-ID')}</h3>
                                                <p className="text-success"><i className="fa-solid fa-circle-arrow-up"></i> Sinkronisasi Lisensi</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-green">
                                                <i className="fa-solid fa-users-viewfinder"></i>
                                            </div>
                                        </div>
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>AKTIVASI DATABASE CLOUD</span>
                                                <h3 style={{ color: 'var(--accent-purple)', textShadow: '0 0 8px var(--accent-purple-glow)' }}>{dbTotalCount.toLocaleString('id-ID')}</h3>
                                                <p className="text-success"><i className="fa-solid fa-cloud-arrow-up"></i> Sinkronisasi Cloud</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-purple">
                                                <i className="fa-solid fa-database"></i>
                                            </div>
                                        </div>
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>LATENSI RESPON NODE</span>
                                                <h3 style={{ color: 'var(--accent-cyan)' }}>{latency}ms</h3>
                                                <p className="text-success"><i className="fa-solid fa-shield-check"></i> Koneksi Server Stabil</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-cyan">
                                                <i className="fa-solid fa-gauge-high"></i>
                                            </div>
                                        </div>
                                        <div className="kpi-card glassmorphism-sub">
                                            <div className="kpi-details">
                                                <span>TINGKAT KEBERHASILAN</span>
                                                <h3 className="text-success">99.8%</h3>
                                                <p className="text-muted">Validasi Berhasil Dilewati</p>
                                            </div>
                                            <div className="kpi-icon-wrapper icon-green">
                                                <i className="fa-solid fa-circle-check"></i>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="dashboard-content-layout">
                                        <div className="content-card glassmorphism-sub col-span-2" style={{ gridColumn: 'span 2' }}>
                                            <div className="ticker-header">
                                                <h4><i className="fa-solid fa-newspaper text-gradient"></i> PEMBERITAHUAN UTAMA</h4>
                                            </div>
                                            <div className="ticker-body">
                                                <p>Selamat datang di Panel Administrasi Aktivasi Alight Motion Premium. Pastikan koneksi database utama terhubung dengan stabil saat memproses pembaruan akun. Hubungi administrator jika terjadi kegagalan sistem.</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* TAB 2: History */}
                            {activeTab === 'history' && (
                                <section className="dashboard-view active">
                                    <div className="content-card glassmorphism-sub">
                                        <div className="history-header" style={{ marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Riwayat Aktivasi Lisensi</h2>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Daftar akun Alight Motion yang telah berhasil diperbarui dengan lisensi tahunan.</p>
                                        </div>
                                        <div className="table-container">
                                            <table className="history-table">
                                                <thead>
                                                    <tr>
                                                        <th>Alamat Email</th>
                                                        <th>ID Transaksi</th>
                                                        <th>Tanggal Aktivasi</th>
                                                        <th>Durasi Kontrak</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activationHistory.length === 0 ? (
                                                        <tr className="empty-state-row">
                                                            <td colspan="5" className="text-center text-muted py-8" style={{ textAlign: 'center', padding: '36px' }}>
                                                                <i className="fa-regular fa-folder-open empty-icon" style={{ display: 'block', fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}></i>
                                                                <p>Belum ada data riwayat aktivasi.</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        activationHistory.map((item, idx) => {
                                                            const dateObj = new Date(item.timestamp);
                                                            const dateStr = dateObj.toLocaleDateString('id-ID', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            });
                                                            return (
                                                                <tr key={idx}>
                                                                    <td style={{ fontWeight: 600, color: '#fff' }}>{item.email}</td>
                                                                    <td className="accent-text">{item.orderId}</td>
                                                                    <td>{dateStr}</td>
                                                                    <td>1 Tahun</td>
                                                                    <td>
                                                                        <span className="badge badge-success">
                                                                            <i className="fa-solid fa-crown" style={{ fontSize: '9px', marginRight: '4px' }}></i> Premium Aktif
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* TAB 3: Status Server */}
                            {activeTab === 'status' && (
                                <section className="dashboard-view active">
                                    <div className="status-grid">
                                        <div className="content-card glassmorphism-sub">
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '10px' }}>Status Node Jaringan</h3>
                                            <p className="mb-4" style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>Seluruh node server terhubung dan beroperasi dengan normal.</p>
                                            <div className="node-list">
                                                <div className="node-item">
                                                    <span className="node-status status-online"></span>
                                                    <div className="node-info">
                                                        <h4>Node Autentikasi Utama</h4>
                                                    </div>
                                                    <span className="badge badge-success">Aktif</span>
                                                </div>
                                                <div className="node-item">
                                                    <span class="node-status status-online"></span>
                                                    <div className="node-info">
                                                        <h4>Node Verifikasi Lisensi</h4>
                                                    </div>
                                                    <span className="badge badge-success">Aktif</span>
                                                </div>
                                                <div className="node-item">
                                                    <span className="node-status status-online"></span>
                                                    <div className="node-info">
                                                        <h4>Node Server Lokal</h4>
                                                    </div>
                                                    <span className="badge badge-success">Aktif</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="content-card glassmorphism-sub">
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '10px' }}>Metadata Klien Alight Motion</h3>
                                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>Konfigurasi parameter standar klien Alight Motion yang telah terverifikasi.</p>
                                            <div className="config-table">
                                                <div className="config-row">
                                                    <span>Jenis Klien</span>
                                                    <strong>CLIENT_TYPE_ANDROID</strong>
                                                </div>
                                                <div className="config-row">
                                                    <span>Paket Android</span>
                                                    <strong>com.alightcreative.motion</strong>
                                                </div>
                                                <div className="config-row">
                                                    <span>Versi Minimum</span>
                                                    <strong>585</strong>
                                                </div>
                                                <div className="config-row">
                                                    <span>ID Produk</span>
                                                    <strong>am.full.sub.annual.19q4</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                        </main>

                        {/* Footer Activity Logs Console */}
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
                                    <button className="btn-console-action" onClick={handleClearLog} title="Bersihkan Log">
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
