import React, { useState, useEffect, useRef } from 'react';

export default function App() {
    const [loading, setLoading] = useState(true);
    const [loaderProgress, setLoaderProgress] = useState(0);
    const [loaderText, setLoaderText] = useState('Menghubungkan ke Node Jaringan...');
    
    // Activator wizard states
    const [step, setStep] = useState(1); // 1 = Email, 2 = Ads, 3 = Magic Link, 4 = Success
    const [email, setEmail] = useState('');
    const [magicLink, setMagicLink] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    
    // Ads verification state
    const [adViewCount, setAdViewCount] = useState(0);
    const [adsProgressPercent, setAdsProgressPercent] = useState(0);
    const [isAdSenseLoaded, setIsAdSenseLoaded] = useState(false);
    const [adCountdown, setAdCountdown] = useState(8);
    const [isCounting, setIsCounting] = useState(false);
    
    // Result stats
    const [resultEmail, setResultEmail] = useState('');
    const [resultOrderId, setResultOrderId] = useState('');
    
    // UI states
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);
    const [btnLoading, setBtnLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccessState, setIsSuccessState] = useState(false);

    const turnstileContainerRef = useRef(null);
    const adIntervalRef = useRef(null);
    const REQUIRED_ADS = 5;
    const AD_SPONSOR_URL = 'https://ryezenn.blogspot.com';

    // Initial loader animation
    useEffect(() => {
        const timer1 = setTimeout(() => {
            setLoaderProgress(25);
            setLoaderText('Menghubungkan ke Node Jaringan...');
        }, 200);

        const timer2 = setTimeout(() => {
            setLoaderProgress(60);
            setLoaderText('Memuat Modul Aktivasi...');
        }, 600);

        const timer3 = setTimeout(() => {
            setLoaderProgress(90);
            setLoaderText('Menyiapkan Portal Aktivasi...');
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

    // Render Cloudflare Turnstile CAPTCHA dynamically in React
    useEffect(() => {
        if (!loading && step === 1 && window.turnstile && turnstileContainerRef.current) {
            turnstileContainerRef.current.innerHTML = '';
            window.turnstile.render(turnstileContainerRef.current, {
                sitekey: '0x4AAAAAAD7RpjTPThhr5v1Q',
                theme: 'dark',
                callback: (token) => {
                    setTurnstileToken(token);
                }
            });
        }
    }, [loading, step]);

    // Check if AdSense is loaded
    useEffect(() => {
        if (step === 2) {
            const checkAdSense = () => {
                const insTag = document.querySelector('.adsbygoogle');
                if (insTag && (insTag.getElementsByTagName('iframe').length > 0 || insTag.getAttribute('data-ad-status') === 'filled')) {
                    setIsAdSenseLoaded(true);
                    return true;
                }
                return false;
            };

            // Check immediately
            const active = checkAdSense();
            if (!active) {
                // Check again in 1.5s
                const timer = setTimeout(checkAdSense, 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [step]);

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

        // Anti-Debugger Loop
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

    // Automatic ad verification countdown
    const startAutoAdVerification = () => {
        if (adIntervalRef.current) {
            clearInterval(adIntervalRef.current);
        }
        
        setIsCounting(true);
        setAdCountdown(8);

        adIntervalRef.current = setInterval(() => {
            setAdCountdown((prev) => {
                if (prev > 1) {
                    return prev - 1;
                } else {
                    // One ad watched!
                    clearInterval(adIntervalRef.current);
                    
                    setAdViewCount((prevCount) => {
                        const newCount = prevCount + 1;
                        const percent = (newCount / REQUIRED_ADS) * 100;
                        setAdsProgressPercent(percent);

                        if (newCount < REQUIRED_ADS) {
                            // Start next ad view
                            setTimeout(() => {
                                startAutoAdVerification();
                            }, 500);
                        } else {
                            setIsCounting(false);
                            console.log('[Sistem] Sponsor iklan selesai diverifikasi.');
                        }
                        return newCount;
                    });
                    
                    return 0;
                }
            });
        }, 1000);
    };

    // Auto-start ads when step 2 opens
    useEffect(() => {
        if (step === 2) {
            startAutoAdVerification();
        }
        return () => {
            if (adIntervalRef.current) {
                clearInterval(adIntervalRef.current);
            }
        };
    }, [step]);

    const handleSendLink = async (e) => {
        e.preventDefault();
        if (!email) return;

        setBtnLoading(true);

        try {
            const response = await fetch('/api/send-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token: turnstileToken })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                console.log(`[Sistem] Tautan masuk berhasil dikirim ke: ${email}`);
                
                // Decide if show ads or skip
                setTimeout(() => {
                    const insTag = document.querySelector('.adsbygoogle');
                    const hasAds = insTag && (window.adsbygoogle || insTag.getElementsByTagName('iframe').length > 0);
                    
                    if (hasAds) {
                        setStep(2);
                    } else {
                        // Skip ads if blocked
                        setStep(3);
                        console.log('[Sistem] Langkah sponsor dilewati karena iklan diblokir/tidak aktif.');
                    }
                }, 1000);
            } else {
                alert(data.error || 'Gagal mengirim tautan.');
            }
        } catch (error) {
            alert(`Kegagalan koneksi: ${error.message}`);
        } finally {
            setBtnLoading(false);
            if (window.turnstile) window.turnstile.reset();
            setTurnstileToken('');
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        if (!magicLink) return;

        setBtnLoading(true);
        setIsProcessing(true);

        try {
            const response = await fetch('/api/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, link: magicLink })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setResultEmail(data.user.email);
                setResultOrderId(data.orderId);
                setIsSuccessState(true);
                
                setTimeout(() => {
                    setStep(4);
                }, 800);
            } else {
                alert(data.error || 'Gagal memproses verifikasi.');
            }
        } catch (error) {
            alert(`Kegagalan koneksi saat aktivasi: ${error.message}`);
        } finally {
            setBtnLoading(false);
            setIsProcessing(false);
        }
    };

    const handleRestart = () => {
        setEmail('');
        setMagicLink('');
        setTurnstileToken('');
        setAdViewCount(0);
        setAdsProgressPercent(0);
        setIsSuccessState(false);
        setStep(1);
    };

    return (
        <>
            <div className="cyber-scanlines"></div>

            {/* Loader Overlay */}
            {loading && (
                <div className="loader-overlay">
                    <div className="loader-content">
                        <div className="loader-logo-sphere">
                            <div className="loader-pulse"></div>
                            <div className="loader-ring"></div>
                            <i className="fa-solid fa-wand-magic-sparkles loader-icon"></i>
                        </div>
                        <h2 className="loader-title text-gradient">Menginisialisasi Sistem</h2>
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

            {/* Main Centered App Wrapper */}
            <div className="auth-wrapper">
                <div className={`auth-card glassmorphism animate-scale-up ${isProcessing ? 'processing' : ''} ${isSuccessState ? 'success-state' : ''}`} style={{ maxWidth: '480px', width: '90%', padding: '28px' }}>
                    
                    {/* Brand Header */}
                    <div className="auth-brand" style={{ marginBottom: '24px' }}>
                        <div className="auth-agentic-sphere" style={{ margin: '0 auto 16px auto' }}>
                            <div className="sphere-outer-pulse"></div>
                            <div className="sphere-inner-ring"></div>
                            <div className="sphere-core" style={{ background: 'var(--gradient-primary)' }}>
                                <i className="fa-solid fa-crown sphere-brain-icon" style={{ color: '#fff' }}></i>
                            </div>
                        </div>
                        <h2 className="text-gradient">AM Premium</h2>
                        <span>Portal Aktivasi Lisensi Mandiri</span>
                    </div>

                    {/* Step Indicators */}
                    <div className="steps-progress-wrapper" style={{ marginBottom: '24px' }}>
                        <div className="step-progress-text-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="step-progress-label" style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: '600', color: '#fff', letterSpacing: '0.2px' }}>
                                {step === 1 && 'Langkah 1 dari 4: Kirim Tautan'}
                                {step === 2 && 'Langkah 2 dari 4: Sponsor Iklan'}
                                {step === 3 && 'Langkah 3 dari 4: Verifikasi Akun'}
                                {step === 4 && 'Langkah 4 dari 4: Selesai'}
                            </span>
                            <span className="step-progress-percent" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '500', color: 'var(--color-text-muted)' }}>
                                {step === 1 && '25%'}
                                {step === 2 && '50%'}
                                {step === 3 && '75%'}
                                {step === 4 && '100%'}
                            </span>
                        </div>
                        <div className="step-progress-bar-container" style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '20px', height: '6px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.04)', padding: '1px' }}>
                            <div style={{ 
                                background: 'var(--gradient-primary)', 
                                width: step === 1 ? '25%' : step === 2 ? '50%' : step === 3 ? '75%' : '100%', 
                                height: '100%', 
                                borderRadius: '20px', 
                                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
                                boxShadow: '0 0 8px rgba(255, 0, 160, 0.4)' 
                            }}></div>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="card-views">
                        
                        {/* STEP 1: Input Email */}
                        {step === 1 && (
                            <div className="card-view active">
                                <div className="view-header" style={{ marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent-cyan)', marginBottom: '6px', textShadow: '0 0 8px var(--accent-cyan-glow)' }}>Kirim Tautan Verifikasi</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>Masukkan alamat email yang terdaftar pada akun Alight Motion Anda.</p>
                                </div>
                                <form onSubmit={handleSendLink} className="interactive-form">
                                    <div className="input-group" style={{ marginBottom: '16px' }}>
                                        <i className="fa-regular fa-envelope input-icon"></i>
                                        <input 
                                            type="email" 
                                            placeholder="contoh@gmail.com" 
                                            required 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    
                                    {/* Turnstile Container Ref */}
                                    <div ref={turnstileContainerRef} className="cf-turnstile" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}></div>
                                    
                                    <button 
                                        type="submit" 
                                        className={`btn btn-primary btn-glow w-full ${btnLoading ? 'loading' : ''}`}
                                        disabled={btnLoading || !turnstileToken}
                                    >
                                        <span>Kirim Tautan Masuk</span>
                                        <i className="fa-solid fa-paper-plane"></i>
                                    </button>
                                </form>
                                <div className="info-alert" style={{ marginTop: '16px' }}>
                                    <i className="fa-solid fa-circle-info info-icon"></i>
                                    <p>Sistem akan mengirimkan email tautan masuk resmi ke alamat email yang Anda berikan.</p>
                                </div>

                                <div className="premium-features-header" style={{ margin: '24px 0 12px 0' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-cyan)', letterSpacing: '1px', textTransform: 'uppercase', textShadow: '0 0 6px rgba(0, 243, 255, 0.2)' }}>FITUR PREMIUM YANG DIAKTIFKAN</h4>
                                </div>
                                <div className="premium-features-grid">
                                    <div className="feature-item glassmorphism-sub" style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderRadius: '10px', textAlign: 'left' }}>
                                        <i className="fa-solid fa-watermark feature-icon" style={{ fontSize: '18px', color: 'var(--accent-magenta)', textShadow: '0 0 8px var(--accent-magenta-glow)' }}></i>
                                        <div className="feature-desc">
                                            <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>Ekspor Tanpa Watermark</h5>
                                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Simpan dan ekspor video bersih tanpa watermark Alight Motion.</p>
                                        </div>
                                    </div>
                                    <div className="feature-item glassmorphism-sub" style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderRadius: '10px', textAlign: 'left' }}>
                                        <i className="fa-solid fa-wand-magic-sparkles feature-icon" style={{ fontSize: '18px', color: 'var(--accent-cyan)', textShadow: '0 0 8px var(--accent-cyan-glow)' }}></i>
                                        <div className="feature-desc">
                                            <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>Akses Seluruh Efek Pro</h5>
                                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Membuka seluruh filter, preset, dan efek transisi pro.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP ADS: Watch 5 Ads (Langkah 2) */}
                        {step === 2 && (
                            <div className="card-view active">
                                <div className="view-header" style={{ marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent-magenta)', marginBottom: '6px', textShadow: '0 0 8px var(--accent-magenta-glow)' }}>Verifikasi Sponsor Iklan</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>Wajib melihat penayangan iklan sponsor selama 5x untuk memverifikasi slot premium Anda.</p>
                                </div>
                                <div className="ads-validation-container text-center py-4">
                                    <div className="ads-counter-badge mb-4">
                                        <i className="fa-solid fa-rectangle-ad mr-2" style={{ color: 'var(--accent-magenta)' }}></i>
                                        Iklan Ditonton: <span className="accent-text" style={{ fontWeight: '700', fontSize: '20px', color: 'var(--accent-cyan)' }}>{adViewCount}</span> / {REQUIRED_ADS}
                                    </div>
                                    
                                    <div className="ads-progress-container mb-6" style={{ maxWidth: '320px', margin: '0 auto 16px auto' }}>
                                        <div className="ads-progress-bar" style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', height: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', padding: '2px' }}>
                                            <div style={{ background: 'var(--gradient-primary)', width: `${adsProgressPercent}%`, height: '100%', borderRadius: '20px', transition: 'width 0.4s ease' }}></div>
                                        </div>
                                    </div>

                                    {/* Google AdSense Area */}
                                    <div className="adsense-placeholder-box glassmorphism-sub">
                                        <ins className="adsbygoogle"
                                             style={{ display: 'block', width: '100%', minHeight: '250px' }}
                                             data-ad-client="ca-pub-2199063141174258"
                                             data-ad-slot="1234567890"
                                             data-ad-format="auto"
                                             data-full-width-responsive="true"></ins>
                                    </div>

                                    {/* Navigation Buttons */}
                                    <div className="button-row justify-center" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px', margin: '0 auto' }}>
                                        <button 
                                            type="button" 
                                            className="btn btn-primary btn-glow w-full"
                                            onClick={() => window.open(AD_SPONSOR_URL, '_blank')}
                                        >
                                            {isCounting ? (
                                                <span>Menonton Iklan... ({adCountdown}s) [{adViewCount + 1}/{REQUIRED_ADS}]</span>
                                            ) : (
                                                <span>Buka Iklan Sponsor <i className="fa-solid fa-square-arrow-up-right"></i></span>
                                            )}
                                        </button>
                                        <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                                            <button 
                                                type="button" 
                                                className="btn btn-secondary" 
                                                style={{ flex: 1 }}
                                                onClick={() => setStep(1)}
                                                disabled={isCounting}
                                            >
                                                <i className="fa-solid fa-arrow-left"></i> Kembali
                                            </button>
                                            <button 
                                                type="button" 
                                                className={`btn btn-primary ${adViewCount < REQUIRED_ADS ? 'disabled' : ''}`}
                                                style={{ flex: 1.2 }}
                                                onClick={() => setStep(3)}
                                                disabled={adViewCount < REQUIRED_ADS}
                                            >
                                                Lanjutkan <i className="fa-solid fa-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Paste Magic Link */}
                        {step === 3 && (
                            <div className="card-view active">
                                <div className="view-header" style={{ marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--accent-cyan)', marginBottom: '6px', textShadow: '0 0 8px var(--accent-cyan-glow)' }}>Verifikasi & Penerapan Lisensi</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>Buka pesan email login dari Alight Motion, salin tautannya, lalu tempel di bawah ini.</p>
                                </div>
                                <form onSubmit={handleActivate} className="interactive-form">
                                    <div className="input-group" style={{ marginBottom: '16px' }}>
                                        <i className="fa-solid fa-link input-icon"></i>
                                        <textarea 
                                            placeholder="Tempelkan URL tautan verifikasi di sini..." 
                                            required 
                                            style={{ minHeight: '80px' }}
                                            value={magicLink}
                                            onChange={(e) => setMagicLink(e.target.value)}
                                        />
                                    </div>
                                    <div className="button-row" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary" 
                                            style={{ flex: 1 }}
                                            onClick={() => setStep(isAdSenseLoaded ? 2 : 1)}
                                        >
                                            <i className="fa-solid fa-arrow-left"></i> Kembali
                                        </button>
                                        <button 
                                            type="submit" 
                                            className={`btn btn-primary btn-glow ${btnLoading ? 'loading' : ''}`} 
                                            style={{ flex: 1.8 }}
                                            disabled={btnLoading}
                                        >
                                            <span>Aktifkan Premium</span>
                                            <i className="fa-solid fa-bolt"></i>
                                        </button>
                                    </div>
                                </form>

                                {/* Accordion help */}
                                <div className={`help-accordion glassmorphism-sub ${isAccordionOpen ? 'open' : ''}`} style={{ borderRadius: '10px', textAlign: 'left' }}>
                                    <div className="help-header" style={{ padding: '12px', fontSize: '13px' }} onClick={() => setIsAccordionOpen(!isAccordionOpen)}>
                                        <i className="fa-regular fa-lightbulb"></i>
                                        <span>Panduan Menyalin Tautan dari Email</span>
                                        <i className="fa-solid fa-chevron-down toggle-arrow"></i>
                                    </div>
                                    <div className="help-body" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                        <ol style={{ marginLeft: '16px' }}>
                                            <li>Buka email subjek <strong>"Sign in to Alight Motion"</strong>.</li>
                                            <li>Tekan lama tombol <strong>"Sign in to Alight Motion"</strong>, lalu pilih <strong>"Salin Tautan"</strong>.</li>
                                            <li>Pastikan seluruh tautan disalin (memiliki parameter <code>oobCode</code>).</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Success Result */}
                        {step === 4 && (
                            <div className="card-view active">
                                <div className="success-checkmark-wrapper" style={{ marginBottom: '16px' }}>
                                    <div className="success-ring animate-scale-up"></div>
                                    <div className="success-icon" style={{ background: 'var(--gradient-primary)' }}>
                                        <i className="fa-solid fa-crown" style={{ color: '#fff' }}></i>
                                    </div>
                                </div>
                                
                                <div className="view-header text-center" style={{ marginBottom: '20px' }}>
                                    <h3 className="text-gradient" style={{ fontSize: '20px', fontWeight: '700' }}>Lisensi Berhasil Aktif!</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Aktivasi lisensi Alight Motion Premium 1 Tahun selesai diproses.</p>
                                </div>

                                {/* Profile Details */}
                                <div className="profile-details glassmorphism-sub" style={{ marginBottom: '20px', borderRadius: '12px', padding: '14px', textAlign: 'left' }}>
                                    <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <span className="detail-label" style={{ color: 'var(--color-text-muted)' }}>Alamat Email</span>
                                        <span className="detail-val" style={{ color: '#fff', fontWeight: '500' }}>{resultEmail}</span>
                                    </div>
                                    <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <span className="detail-label" style={{ color: 'var(--color-text-muted)' }}>ID Transaksi</span>
                                        <span className="detail-val accent-text" style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{resultOrderId}</span>
                                    </div>
                                    <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 0' }}>
                                        <span className="detail-label" style={{ color: 'var(--color-text-muted)' }}>Status Lisensi</span>
                                        <span className="detail-val active-badge" style={{ background: 'rgba(0, 255, 102, 0.15)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '20px', fontWeight: '600', fontSize: '11px', textShadow: '0 0 6px var(--accent-green-glow)' }}>
                                            <i className="fa-solid fa-shield-halved"></i> Terverifikasi Aktif
                                        </span>
                                    </div>
                                </div>

                                <button 
                                    type="button" 
                                    className="btn btn-primary w-full"
                                    onClick={handleRestart}
                                >
                                    <span>Aktivasi Akun Baru</span>
                                    <i className="fa-solid fa-rotate-left"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
