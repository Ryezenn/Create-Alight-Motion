// app.js

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
            if (loaderStatusText) loaderStatusText.textContent = 'Memuat Modul Aktivasi...';
        }, 600);

        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '90%';
            if (loaderStatusText) loaderStatusText.textContent = 'Menyiapkan Portal Aktivasi...';
        }, 1100);

        setTimeout(() => {
            if (loaderProgressBar) loaderProgressBar.style.width = '100%';
            if (loaderStatusText) loaderStatusText.textContent = 'Sistem Siap!';
        }, 1400);

        setTimeout(() => {
            initialLoader.classList.add('loader-hidden');
        }, 1700);
    }

    // DOM Elements - Activator Wizard
    const appCard = document.querySelector('.auth-card');
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
    const stepProgressText = document.getElementById('step-progress-text');
    const stepProgressPercent = document.getElementById('step-progress-percent');
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

    // State Variables
    let userEmail = '';
    
    // Ads State Configuration
    let adViewCount = 0;
    const REQUIRED_ADS = 5;
    const AD_SPONSOR_URL = 'https://ryezenn.blogspot.com'; // Link sponsor AdSense

    // --- ACCORDION INFO TOGGLE ---
    if (helpHeader && helpAccordion) {
        helpHeader.addEventListener('click', () => {
            helpAccordion.classList.toggle('open');
        });
    }

    // --- SIMPLIFIED LOG SYSTEM (Console only) ---
    function addLog(message, type = 'default') {
        if (type === 'error') {
            console.error(`[Sistem] Error: ${message}`);
            alert(`Error: ${message}`);
        } else {
            console.log(`[Sistem] ${message}`);
        }
    }

    let adInterval = null;

    // Helper to check if Google AdSense is loaded and active
    function isAdSenseActive() {
        if (!window.adsbygoogle) {
            return false;
        }
        const insTag = document.querySelector('.adsbygoogle');
        if (!insTag) return false;
        
        const hasIframe = insTag.getElementsByTagName('iframe').length > 0;
        const isFilled = insTag.getAttribute('data-ad-status') === 'filled';
        return hasIframe || isFilled;
    }

    // --- ACTIVATOR ENGINE SYSTEM ---
    function goToStep(step) {
        viewStep1.classList.remove('active');
        if (viewStepAds) viewStepAds.classList.remove('active');
        viewStep2.classList.remove('active');
        viewStep3.classList.remove('active');

        if (adInterval) {
            clearInterval(adInterval);
            adInterval = null;
        }

        if (step === 1) {
            viewStep1.classList.add('active');
            if (stepProgressText) stepProgressText.textContent = 'Langkah 1 dari 4: Kirim Tautan';
            if (stepProgressPercent) stepProgressPercent.textContent = '25%';
            if (stepLineProgress) stepLineProgress.style.width = '25%';
        } else if (step === 2) {
            if (viewStepAds) viewStepAds.classList.add('active');
            if (stepProgressText) stepProgressText.textContent = 'Langkah 2 dari 4: Sponsor Iklan';
            if (stepProgressPercent) stepProgressPercent.textContent = '50%';
            if (stepLineProgress) stepLineProgress.style.width = '50%';
            
            startAutoAdVerification();
        } else if (step === 3) {
            viewStep2.classList.add('active');
            if (stepProgressText) stepProgressText.textContent = 'Langkah 3 dari 4: Verifikasi Akun';
            if (stepProgressPercent) stepProgressPercent.textContent = '75%';
            if (stepLineProgress) stepLineProgress.style.width = '75%';
        } else if (step === 4) {
            viewStep3.classList.add('active');
            if (stepProgressText) stepProgressText.textContent = 'Langkah 4 dari 4: Selesai';
            if (stepProgressPercent) stepProgressPercent.textContent = '100%';
            if (stepLineProgress) stepLineProgress.style.width = '100%';
        }
    }

    // STEP 1 Form Submission (Send Magic Link)
    formStep1.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = inputEmail.value.trim();
        const turnstileInput = formStep1.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileInput ? turnstileInput.value : '';
        
        if (!email) {
            addLog('Alamat email tidak boleh kosong.', 'error');
            return;
        }

        userEmail = email;
        addLog(`Memulai proses pengiriman tautan masuk ke: ${email}...`);
        
        btnSendLink.classList.add('loading');
        btnSendLink.disabled = true;
        inputEmail.disabled = true;

        try {
            const response = await fetch('/api/send-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, token: turnstileToken })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                addLog(`Tautan masuk berhasil dikirim ke: ${email}`);
                
                setTimeout(() => {
                    if (isAdSenseActive()) {
                        goToStep(2);
                    } else {
                        goToStep(3);
                        addLog('Langkah sponsor dilewati karena iklan diblokir/tidak aktif.');
                    }
                }, 1000);
            } else {
                const errMsg = data.error || 'Terjadi kesalahan sistem.';
                addLog(errMsg, 'error');
                inputEmail.disabled = false;
            }
        } catch (error) {
            addLog(`Kegagalan koneksi: ${error.message}`, 'error');
            inputEmail.disabled = false;
        } finally {
            btnSendLink.classList.remove('loading');
            btnSendLink.disabled = false;
            if (window.turnstile) turnstile.reset();
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

        addLog(`Memproses verifikasi untuk alamat email: ${userEmail}...`);
        
        btnActivate.classList.add('loading');
        btnActivate.disabled = true;
        btnBackStep1.disabled = true;
        inputMagicLink.disabled = true;
        if (appCard) appCard.classList.add('processing');

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
                addLog(`Akun berhasil diverifikasi.`);

                valEmail.textContent = data.user.email;
                valOrderId.textContent = data.orderId;
                
                if (appCard) {
                    appCard.classList.remove('processing');
                    appCard.classList.add('success-state');
                }
                
                setTimeout(() => {
                    goToStep(4);
                }, 800);
            } else {
                const errMsg = data.error || 'Gagal memproses verifikasi.';
                addLog(errMsg, 'error');
                if (appCard) appCard.classList.remove('processing');
                inputMagicLink.disabled = false;
            }
        } catch (error) {
            addLog(`Kegagalan koneksi saat aktivasi: ${error.message}`, 'error');
            if (appCard) appCard.classList.remove('processing');
            inputMagicLink.disabled = false;
        } finally {
            btnActivate.classList.remove('loading');
            btnActivate.disabled = false;
            btnBackStep1.disabled = false;
        }
    });

    // --- STEP ADS: SPONSOR WALL CONTROLLER ---
    function startAutoAdVerification() {
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

        addLog('Memulai verifikasi penayangan iklan otomatis...');
        
        if (btnNextToStep2) {
            btnNextToStep2.disabled = true;
            btnNextToStep2.classList.add('disabled');
        }
        if (btnBackToStep1) btnBackToStep1.disabled = true;

        let countdown = 8;
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
                adViewCount++;
                if (adViewCountEl) adViewCountEl.textContent = adViewCount;
                if (adsProgressFill) {
                    const percent = (adViewCount / REQUIRED_ADS) * 100;
                    adsProgressFill.style.width = `${percent}%`;
                }

                if (adViewCount < REQUIRED_ADS) {
                    countdown = 8;
                    updateText();
                } else {
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
                    addLog('Sponsor iklan selesai diverifikasi.');
                }
            }
        }, 1000);
    }

    if (btnWatchAd) {
        btnWatchAd.addEventListener('click', () => {
            window.open(AD_SPONSOR_URL, '_blank');
        });
    }

    if (btnBackToStep1) {
        btnBackToStep1.addEventListener('click', () => {
            if (adInterval) {
                clearInterval(adInterval);
                adInterval = null;
            }
            goToStep(1);
            inputEmail.disabled = false;
            
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
        });
    }

    if (btnBackStep1) {
        btnBackStep1.addEventListener('click', () => {
            goToStep(2);
            inputMagicLink.value = '';
        });
    }

    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            if (adInterval) {
                clearInterval(adInterval);
                adInterval = null;
            }
            formStep1.reset();
            formStep2.reset();
            
            inputEmail.disabled = false;
            inputMagicLink.disabled = false;
            if (appCard) appCard.className = 'auth-card glassmorphism animate-scale-up';
            
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
