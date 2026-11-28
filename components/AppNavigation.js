'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { I18N, getSavedLang, setSavedLang, applyDomTranslations } from '@/lib/i18n';
import LoadingOverlay from '@/components/LoadingOverlay';
import PasswordInput from '@/components/PasswordInput';

const IDLE_LOCK_MS = 15 * 60 * 1000;
const UNLOCKED_PATH_KEY = 'catatstruk_unlocked_path';
const LAST_ACTIVITY_KEY = 'catatstruk_last_activity_v1';

export default function AppNavigation({ showWhatsNew = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({ username: '', email: '', initial: 'U', avatar: '' });
  const [isDark, setIsDark] = useState(false);
  const [lang, setLang] = useState('id');
  const [navLoading, setNavLoading] = useState(false);
  const [navFading, setNavFading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifVersions, setNotifVersions] = useState([]);
  const [notifFetching, setNotifFetching] = useState(false);
  const [screenLocked, setScreenLocked] = useState(false);
  const [lockReason, setLockReason] = useState('route');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('catatstruk_theme_v1') || 'light';
      const dark = saved === 'dark';
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      setIsDark(dark);

      const initialLang = getSavedLang();
      setLang(initialLang);
      applyDomTranslations(initialLang);

      const authRaw = localStorage.getItem('catatstruk_auth_v1');
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const uname = auth?.user?.username || '';
      const uemail = auth?.user?.email || '';
      const avatar = uname ? (localStorage.getItem(`catatstruk_avatar_${uname}`) || '') : '';
      setUserInfo({
        username: uname || 'Guest',
        email: uemail || (lang === 'en' ? 'Not signed in' : 'Belum login'),
        initial: (uname || 'U').slice(0, 1).toUpperCase(),
        avatar,
      });
    } catch { }
  }, []);

  // Tutup drawer & akhiri animasi transisi otomatis saat route baru termuat + cek Page Lock
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
    if (navLoading) {
      setNavFading(true);
      const t = setTimeout(() => {
        setNavLoading(false);
        setNavFading(false);
      }, 320);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Security Lock: kunci setiap kali pindah halaman ATAU idle > 15 menit
  useEffect(() => {
    const checkLockState = () => {
      try {
        const authRaw = localStorage.getItem('catatstruk_auth_v1');
        const auth = authRaw ? JSON.parse(authRaw) : null;
        if (!auth?.token || !auth?.user?.username) {
          setScreenLocked(false);
          return;
        }
        const now = Date.now();
        const lastAct = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
        if (lastAct > 0 && now - lastAct > IDLE_LOCK_MS) {
          sessionStorage.removeItem(UNLOCKED_PATH_KEY);
          setLockReason('idle');
          setScreenLocked(true);
          return;
        }
        const unlockedPath = sessionStorage.getItem(UNLOCKED_PATH_KEY);
        if (unlockedPath !== pathname) {
          setLockReason('route');
          setScreenLocked(true);
        } else {
          if (!lastAct) localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
          setScreenLocked(false);
        }
      } catch { }
    };

    checkLockState();

    let lastWrite = 0;
    const markActivity = () => {
      try {
        const authRaw = localStorage.getItem('catatstruk_auth_v1');
        const auth = authRaw ? JSON.parse(authRaw) : null;
        if (!auth?.token) return;
        const now = Date.now();
        const prev = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
        if (prev > 0 && now - prev > IDLE_LOCK_MS) {
          sessionStorage.removeItem(UNLOCKED_PATH_KEY);
          setLockReason('idle');
          setScreenLocked(true);
          return;
        }
        if (now - lastWrite > 5000) {
          lastWrite = now;
          localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        }
      } catch { }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, markActivity, { passive: true }));
    const onFocusOrVis = () => checkLockState();
    window.addEventListener('focus', onFocusOrVis);
    document.addEventListener('visibilitychange', onFocusOrVis);
    const interval = setInterval(checkLockState, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActivity));
      window.removeEventListener('focus', onFocusOrVis);
      document.removeEventListener('visibilitychange', onFocusOrVis);
      clearInterval(interval);
    };
  }, [pathname]);

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    if (!unlockPassword || unlockBusy) return;
    setUnlockBusy(true);
    setUnlockError('');
    try {
      const authRaw = localStorage.getItem('catatstruk_auth_v1');
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({
          username: auth?.user?.username || userInfo.username,
          password: unlockPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setUnlockError(data.error || (lang === 'en' ? 'Incorrect password.' : 'Password salah.'));
        setUnlockBusy(false);
        return;
      }
      sessionStorage.setItem(UNLOCKED_PATH_KEY, pathname);
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setUnlockPassword('');
      setUnlockError('');
      setScreenLocked(false);
    } catch {
      setUnlockError(lang === 'en' ? 'Verification failed.' : 'Gagal memverifikasi password.');
    }
    setUnlockBusy(false);
  };

  // Tangkap klik ke route internal lain agar muncul animasi transisi yang sama dengan login
  useEffect(() => {
    const onDocClick = (e) => {
      if (!(e.target instanceof Element)) return;
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href.startsWith('/') || anchor.target === '_blank') return;
      const targetPath = href.split('?')[0];
      if (targetPath && targetPath !== pathname) {
        setMenuOpen(false);
        setNavFading(false);
        setNavLoading(true);
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [pathname]);

  const handleToggleTheme = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('catatstruk_theme_v1', next);
    } catch { }
    setIsDark(next === 'dark');
  };

  const handleToggleLang = () => {
    const next = lang === 'en' ? 'id' : 'en';
    setLang(setSavedLang(next));
  };

  const t = I18N[lang] || I18N.id;

  const handleOpenSettings = () => {
    setProfileOpen(false);
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('catatstruk-open-settings'));
    } else {
      router.push('/?open=settings');
    }
  };

  const handleOpenFriends = () => {
    setProfileOpen(false);
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('catatstruk-open-friends'));
    } else {
      router.push('/?open=friends');
    }
  };

  const handleOpenNotif = async () => {
    if (pathname === '/') return; // Handled natively by app-client.js on Dashboard
    setMenuOpen(false);
    setProfileOpen(false);
    setNotifOpen(true);
    if (notifVersions.length > 0) return;
    setNotifFetching(true);
    try {
      const res = await fetch('/api/version');
      const data = await res.json();
      if (data?.ok && Array.isArray(data.versions)) {
        setNotifVersions(data.versions);
      }
    } catch { }
    setNotifFetching(false);
  };

  const handleOpenSheetGuide = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('catatstruk-open-sheet-guide'));
    } else {
      router.push('/?open=sheet-guide');
    }
  };

  const handleLogout = () => {
    setProfileOpen(false);
    if (pathname === '/') {
      window.dispatchEvent(new CustomEvent('catatstruk-logout'));
    } else {
      router.push('/?open=logout');
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <button
            type="button"
            id="btn-menu-toggle"
            className="icon-btn hamburger-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            title="Menu Navigasi"
            aria-label="Buka Menu Navigasi"
            aria-expanded={menuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="brand-link">
            <div className="brand-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </svg>
            </div>
            <div>
              <h1>CatatStruk</h1>
              <span className="brand-sub">{t.brandSub}</span>
            </div>
          </Link>
        </div>

        <div className="topbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary topbar-desktop-action"
            onClick={() => {
              if (pathname === '/') {
                document.getElementById('input-gallery')?.click();
              } else {
                router.push('/');
              }
            }}
          >
            {lang === 'en' ? '↑ Upload' : '↑ Unggah'}
          </button>
          <button
            type="button"
            className="btn btn-secondary topbar-desktop-action"
            onClick={() => {
              if (pathname === '/') {
                document.getElementById('btn-manual')?.click();
              } else {
                router.push('/');
              }
            }}
          >
            {lang === 'en' ? '+ Manual' : '+ Manual'}
          </button>
          {pathname === '/' && (
            <button key="pill-sheet" type="button" className="icon-btn sheet-icon-btn nav-sync-hidden" id="pill-sheet" title="Google Sheet Status" aria-label="Google Sheet Status" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <span className="sheet-status-dot"></span>
              <span id="pill-sheet-text" className="sr-only">Not Connected</span>
            </button>
          )}
          {showWhatsNew && (
            <button
              key="btn-whats-new"
              type="button"
              id="btn-whats-new"
              className="icon-btn whats-new-btn"
              onClick={handleOpenNotif}
              title={lang === 'en' ? 'Latest App Updates & Notifications' : 'Update Terbaru & Notifikasi'}
              aria-label="Update Terbaru Aplikasi"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span id="whats-new-badge" className="whats-new-badge hidden" aria-hidden="true"></span>
            </button>
          )}
          <button
            key="btn-lang"
            id="btn-lang"
            type="button"
            className="icon-btn lang-toggle-btn"
            onClick={handleToggleLang}
            title={lang === 'en' ? 'Active: English — Click to switch to Indonesia' : 'Aktif: Indonesia — Klik untuk ganti ke English'}
            aria-label={lang === 'en' ? 'Current language: English. Switch to Indonesian' : 'Bahasa aktif: Indonesia. Ganti ke Inggris'}
          >
            <span className="lang-active-badge" title={lang === 'en' ? 'Active Mode: EN' : 'Mode Aktif: ID'}>
              {lang === 'en' ? 'EN' : 'ID'}
            </span>
            <span className="lang-switch-arrow" aria-hidden="true">→</span>
            <span className="lang-target-pill">{lang === 'en' ? '🇮🇩 ID' : '🇬🇧 EN'}</span>
          </button>
          <button
            key="btn-theme"
            id="btn-theme"
            type="button"
            className="icon-btn"
            onClick={handleToggleTheme}
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            <svg className={`icon-sun${isDark ? ' hidden' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <svg className={`icon-moon${isDark ? '' : ' hidden'}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </button>
          <button
            key="btn-profile-drawer"
            id="btn-profile-drawer"
            type="button"
            className="icon-btn profile-trigger-btn"
            onClick={() => {
              setMenuOpen(false);
              setProfileOpen((prev) => !prev);
            }}
            title={lang === 'en' ? 'Profile & Account' : 'Profil & Akun'}
            aria-label="Profile Menu"
            aria-expanded={profileOpen}
          >
            {userInfo.avatar ? (
              <img src={userInfo.avatar} alt={userInfo.username} className="profile-trigger-img" />
            ) : (
              <span className="profile-trigger-initial">{userInfo.initial}</span>
            )}
          </button>
        </div>
      </header>

      {/* Sidebar / Mobile Slide-out Drawer */}
      <div className={`app-drawer-backdrop${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden={!menuOpen} />
      <aside className={`app-sidebar${menuOpen ? ' open' : ''}`} aria-label="Menu Sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo-dot">🧾</span>
            <div>
              <strong>CatatStruk</strong>
              <small>v1.1 Financial Suite</small>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Tutup Menu">&times;</button>
        </div>

        <nav className="sidebar-nav">
          <Link href="/" className={`sidebar-nav-item${pathname === '/' ? ' active' : ''}`}>
            <span className="sidebar-nav-icon">📊</span>
            <div>
              <strong>{t.navDashboard}</strong>
              <small>{t.navDashboardSub}</small>
            </div>
          </Link>

          <Link href="/itinerary" className={`sidebar-nav-item${pathname === '/itinerary' ? ' active' : ''}`}>
            <span className="sidebar-nav-icon">🗓️</span>
            <div>
              <strong>{t.navItinerary}</strong>
              <small>{t.navItinerarySub}</small>
            </div>
          </Link>

          <Link href="/social-journal" className={`sidebar-nav-item${pathname === '/social-journal' || pathname === '/social' ? ' active' : ''}`}>
            <span className="sidebar-nav-icon">#️⃣</span>
            <div>
              <strong>{t.navSocial}</strong>
              <small>{t.navSocialSub}</small>
            </div>
          </Link>

          <div className="sidebar-divider" />

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              setMenuOpen(false);
              if (pathname === '/') document.getElementById('input-gallery')?.click();
              else router.push('/');
            }}
          >
            <span className="sidebar-nav-icon">📸</span>
            <div>
              <strong>{lang === 'en' ? 'Upload / Scan Receipt' : 'Unggah / Foto Struk'}</strong>
              <small>{lang === 'en' ? 'Scan up to 5 receipts with AI' : 'Scan hingga 5 struk otomatis'}</small>
            </div>
          </button>

          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => {
              setMenuOpen(false);
              if (pathname === '/') document.getElementById('btn-manual')?.click();
              else router.push('/');
            }}
          >
            <span className="sidebar-nav-icon">✍️</span>
            <div>
              <strong>{lang === 'en' ? 'Manual Entry' : 'Input Manual'}</strong>
              <small>{lang === 'en' ? 'Record a receipt manually' : 'Catat struk secara manual'}</small>
            </div>
          </button>

          <button type="button" className="sidebar-nav-item" onClick={handleOpenSheetGuide}>
            <span className="sidebar-nav-icon">🔗</span>
            <div>
              <strong>{t.navSheet}</strong>
              <small>{t.navSheetSub}</small>
            </div>
          </button>
        </nav>

        <div className="sidebar-footer">
          <small className="muted">{t.navFooter}</small>
        </div>
      </aside>

      {/* Right Profile Sidebar Drawer (Berlawanan arah dengan Hamburger Sidebar) */}
      <div className={`app-drawer-backdrop${profileOpen ? ' open' : ''}`} onClick={() => setProfileOpen(false)} aria-hidden={!profileOpen} />
      <aside className={`app-sidebar app-sidebar-right${profileOpen ? ' open' : ''}`} aria-label="Profile Sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo-dot">{userInfo.initial}</span>
            <div>
              <strong>{userInfo.username}</strong>
              <small>{userInfo.email}</small>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={() => setProfileOpen(false)} aria-label="Tutup Profil">&times;</button>
        </div>

        <nav className="sidebar-nav">
          <button type="button" className="sidebar-nav-item" onClick={handleOpenFriends}>
            <span className="sidebar-nav-icon">👥</span>
            <div>
              <strong>{t.navGroups}</strong>
              <small>{t.navGroupsSub}</small>
            </div>
          </button>

          <button type="button" className="sidebar-nav-item" onClick={handleOpenSettings}>
            <span className="sidebar-nav-icon">⚙️</span>
            <div>
              <strong>{t.navSettings}</strong>
              <small>{t.navSettingsSub}</small>
            </div>
          </button>

          <div className="sidebar-divider" />

          <button type="button" className="sidebar-nav-item" onClick={handleToggleLang}>
            <span className="sidebar-nav-icon">{lang === 'en' ? '🇮🇩' : '🇬🇧'}</span>
            <div>
              <strong>{lang === 'en' ? 'Language: English (EN)' : 'Bahasa: Indonesia (ID)'}</strong>
              <small>{lang === 'en' ? 'Tap to switch to Bahasa Indonesia' : 'Ketuk untuk ganti ke English'}</small>
            </div>
          </button>

          <button type="button" className="sidebar-nav-item" onClick={handleToggleTheme}>
            <span className="sidebar-nav-icon">{isDark ? '☀️' : '🌙'}</span>
            <div>
              <strong>{isDark ? (lang === 'en' ? 'Light Mode' : 'Mode Terang') : (lang === 'en' ? 'Dark Mode' : 'Mode Gelap')}</strong>
              <small>{lang === 'en' ? 'Switch appearance theme' : 'Ganti tema tampilan'}</small>
            </div>
          </button>

          <button type="button" className="sidebar-nav-item" onClick={handleOpenSheetGuide}>
            <span className="sidebar-nav-icon">📊</span>
            <div>
              <strong>{t.navSheet}</strong>
              <small>{t.navSheetSub}</small>
            </div>
          </button>

          <div className="sidebar-divider" />

          <button type="button" className="sidebar-nav-item sidebar-danger-item" onClick={handleLogout}>
            <span className="sidebar-nav-icon">🚪</span>
            <div>
              <strong>{t.navLogout}</strong>
              <small>{t.navLogoutSub}</small>
            </div>
          </button>
        </nav>

        <div className="sidebar-footer">
          <small className="muted">{t.navFooter}</small>
        </div>
      </aside>

      {/* Modal What's New (Simple WhatsApp-style) untuk halaman non-dashboard */}
      {notifOpen && pathname !== '/' && (
        <div className="modal modal-center" role="dialog" aria-modal="true" aria-labelledby="nav-notif-title">
          <div className="modal-backdrop" onClick={() => setNotifOpen(false)}></div>
          <div className="modal-sheet whats-new-sheet whats-new-wa-sheet">
            <button type="button" className="whats-new-wa-close" onClick={() => setNotifOpen(false)} aria-label="Close">
              &times;
            </button>
            <div className="whats-new-wa-body">
            <div className="whats-new-wa-hero">
                <div className="whats-new-wa-logo" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                    <path d="M8 7h8M8 11h8M8 15h5" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 id="nav-notif-title" className="whats-new-wa-title">
                      {lang === 'en' ? 'Fresh Improvements in CatatStruk' : 'Fitur Baru untuk Catatanmu'}
                    </h3>
                    <button
                      type="button"
                      className="notif-lang-pill"
                      onClick={handleToggleLang}
                      title={lang === 'en' ? 'Switch to ID' : 'Ganti ke EN'}
                    >
                      {lang === 'en' ? 'EN → 🇮🇩 ID' : 'ID → 🇬🇧 EN'}
                    </button>
                  </div>
                  <p className="whats-new-cs-sub">
                    {lang === 'en'
                      ? 'Everything you need to track receipts, split bills, and share places.'
                      : 'Semua yang kamu butuhkan untuk catat struk, patungan, dan berbagi tempat.'}
                  </p>
                </div>
              </div>

              <div className="whats-new-wa-list">
                <div className="whats-new-wa-row">
                  <span className="whats-new-wa-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </span>
                  <div>
                    <strong className="whats-new-cs-item-title">{lang === 'en' ? 'Batch Receipt Scanner' : 'Scan Banyak Struk Sekaligus'}</strong>
                    <p className="whats-new-wa-text">
                      {lang === 'en'
                        ? 'Upload up to 5 receipt photos in one go and let AI organize the items.'
                        : 'Unggah hingga 5 foto struk sekaligus dan biarkan AI merapikan itemnya.'}
                    </p>
                  </div>
                </div>
                <div className="whats-new-wa-row">
                  <span className="whats-new-wa-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                  <div>
                    <strong className="whats-new-cs-item-title">{lang === 'en' ? 'Smart Split & Reimburse' : 'Patungan & Klaim Kantor'}</strong>
                    <p className="whats-new-wa-text">
                      {lang === 'en'
                        ? 'Mark office claims in one tap and settle group bills without the hassle.'
                        : 'Tandai klaim kantor sekali klik dan bereskan tagihan grup tanpa ribet.'}
                    </p>
                  </div>
                </div>
                <div className="whats-new-wa-row">
                  <span className="whats-new-wa-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  </span>
                  <div>
                    <strong className="whats-new-cs-item-title">{lang === 'en' ? 'Trip & Budget Sync' : 'Anggaran & Jadwal Perjalanan'}</strong>
                    <p className="whats-new-wa-text">
                      {lang === 'en'
                        ? 'Link receipts to your Itinerary Planner to watch your remaining trip budget.'
                        : 'Hubungkan struk ke Itinerary Planner untuk pantau sisa budget perjalanan.'}
                    </p>
                  </div>
                </div>
                <div className="whats-new-wa-row">
                  <span className="whats-new-wa-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </span>
                  <div>
                    <strong className="whats-new-cs-item-title">Social Journal</strong>
                    <p className="whats-new-wa-text">
                      {lang === 'en'
                        ? 'Post reviews of your favorite cafes, hobbies, and stays straight from a receipt.'
                        : 'Bagikan ulasan kafe, hobi, atau penginapan favoritmu langsung dari struk.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="whats-new-wa-actions">
                <button type="button" className="btn btn-primary whats-new-wa-btn" onClick={() => setNotifOpen(false)}>
                  {lang === 'en' ? "Got it, let's explore" : 'Sip, Mulai Jelajahi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {screenLocked && (
        <div className="screen-lock-overlay" role="dialog" aria-modal="true" aria-labelledby="screen-lock-title">
          <div className="screen-lock-card">
            <div className="screen-lock-head">
              <div className="screen-lock-badge" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 id="screen-lock-title">
                {lang === 'en' ? 'Security Lock Active' : 'Kunci Keamanan Aktif'}
              </h3>
              <p>
                {lockReason === 'idle'
                  ? (lang === 'en'
                    ? `Session locked after 15 minutes of inactivity. Enter password for @${userInfo.username || 'user'} to continue.`
                    : `Sesi terkunci otomatis karena tidak aktif lebih dari 15 menit. Masukkan password @${userInfo.username || 'user'} untuk lanjut.`)
                  : (lang === 'en'
                    ? `For your security, re-enter password for @${userInfo.username || 'user'} to access this page.`
                    : `Demi keamanan, masukkan ulang password @${userInfo.username || 'user'} untuk membuka halaman ini.`)}
              </p>
            </div>
            <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field">
                <label htmlFor="lock-screen-password">Password</label>
                <PasswordInput
                  id="lock-screen-password"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder={lang === 'en' ? 'Enter your password' : 'Masukkan password Anda'}
                />
              </div>
              {unlockError && <p className="form-error">{unlockError}</p>}
              <button type="submit" className="btn btn-primary btn-full" disabled={unlockBusy}>
                {unlockBusy
                  ? (lang === 'en' ? 'Verifying...' : 'Memverifikasi...')
                  : (lang === 'en' ? 'Unlock Page' : 'Buka Kunci')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-full"
                onClick={() => {
                  try {
                    sessionStorage.removeItem(UNLOCKED_PATH_KEY);
                    localStorage.removeItem(LAST_ACTIVITY_KEY);
                  } catch { }
                  setScreenLocked(false);
                  handleLogout();
                }}
              >
                {lang === 'en' ? 'Sign Out' : 'Keluar Akun'}
              </button>
            </form>
          </div>
        </div>
      )}

      <LoadingOverlay
        visible={navLoading}
        fading={navFading}
        text={t.navLoading}
        ariaLabel={t.navLoading}
      />
    </>
  );
}
