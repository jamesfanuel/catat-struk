'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import CustomSelect from '@/components/CustomSelect';
import { I18N, getSavedLang } from '@/lib/i18n';

const SOCIAL_POSTS_KEY = 'catatstruk_social_posts_v1';

const SOCIAL_CATEGORIES = [
  { value: 'fnb', icon: '🍔', labelId: 'Food & Beverage', labelEn: 'Food & Beverage', bg1: '#0f766e', bg2: '#064e3b' },
  { value: 'hobby', icon: '🎨', labelId: 'Hobi & Kreatif', labelEn: 'Hobby & Creative', bg1: '#7c3aed', bg2: '#4c1d95' },
  { value: 'travel', icon: '✈️', labelId: 'Travel & Staycation', labelEn: 'Travel & Staycation', bg1: '#0369a1', bg2: '#0c4a6e' },
  { value: 'hiddengem', icon: '✨', labelId: 'Hidden Gem & Nongkrong', labelEn: 'Hidden Gems & Hangout', bg1: '#b45309', bg2: '#78350f' },
  { value: 'wellness', icon: '🌿', labelId: 'Self-Care & Wellness', labelEn: 'Self-Care & Wellness', bg1: '#059669', bg2: '#065f46' },
  { value: 'thrift', icon: '🛍️', labelId: 'Belanja & Thrift', labelEn: 'Shopping & Thrift', bg1: '#be123c', bg2: '#881337' },
];

function getCatMeta(catValue) {
  return SOCIAL_CATEGORIES.find((c) => c.value === catValue) || SOCIAL_CATEGORIES[0];
}

function mapReceiptCategoryToSocial(rawCat = '') {
  const c = String(rawCat).toLowerCase();
  if (c.includes('makan') || c.includes('minum') || c.includes('food') || c.includes('kopi')) return 'fnb';
  if (c.includes('hibur') || c.includes('game') || c.includes('hobi')) return 'hobby';
  if (c.includes('transport') || c.includes('travel') || c.includes('hotel')) return 'travel';
  if (c.includes('sehat') || c.includes('health') || c.includes('salon')) return 'wellness';
  if (c.includes('belanja') || c.includes('shop')) return 'thrift';
  return 'hiddengem';
}

function createFoodPreviewSvg(emoji, title, bg1, bg2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs>
    <rect width="640" height="400" fill="url(#g)"/>
    <circle cx="540" cy="70" r="90" fill="rgba(255,255,255,0.12)"/>
    <circle cx="90" cy="340" r="110" fill="rgba(255,255,255,0.08)"/>
    <text x="320" y="195" text-anchor="middle" font-size="96">${emoji}</text>
    <text x="320" y="275" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="24" fill="rgba(255,255,255,0.92)">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_COMMUNITY_POSTS = [
  {
    id: 'sample_1',
    resto: 'Nasi Goreng Kambing Kebon Sirih',
    menu: 'Nasi Goreng Kambing Rempah',
    cat: 'fnb',
    price: 42000,
    rating: 4.8,
    distanceKm: 1.2,
    location: 'Menteng, Jakarta',
    photo: createFoodPreviewSvg('🍛', 'Nasi Goreng Kambing', '#0f766e', '#064e3b'),
    note: 'Legendaris dengan bumbu rempah khas & acar segar, porsi pas buat makan malam.',
    tags: ['#nasigoreng', '#kulinerjakarta'],
  },
  {
    id: 'sample_2',
    resto: 'Fore Coffee Senopati',
    menu: 'Butterscotch Sea Salt Latte',
    cat: 'fnb',
    price: 35000,
    rating: 4.8,
    distanceKm: 0.8,
    location: 'Senopati, Jakarta',
    photo: createFoodPreviewSvg('☕', 'Sea Salt Latte', '#0d9488', '#115e59'),
    note: 'Spot WFC tenang, colokan banyak & Wi-Fi kencang.',
    tags: ['#wfc', '#kopisusu'],
  },
  {
    id: 'sample_3',
    resto: 'Gramedia & Creative Hub',
    menu: 'Workshop Watercolor & Journaling',
    cat: 'hobby',
    price: 85000,
    rating: 4.9,
    distanceKm: 1.5,
    location: 'Bandung Wetan',
    photo: createFoodPreviewSvg('🎨', 'Watercolor & Journaling', '#7c3aed', '#4c1d95'),
    note: 'Alat lengkap, cocok buat weekend santai bareng komunitas gambar.',
    tags: ['#hobi', '#journaling'],
  },
  {
    id: 'sample_4',
    resto: 'Tebet Eco Park Picnic Spot',
    menu: 'Morning Walk & Coffee Picnic',
    cat: 'hiddengem',
    price: 25000,
    rating: 4.7,
    distanceKm: 2.1,
    location: 'Tebet, Jakarta Selatan',
    photo: createFoodPreviewSvg('✨', 'Hidden Gem Picnic', '#b45309', '#78350f'),
    note: 'Datang jam 7 pagi masih sejuk, banyak spot foto estetik gratis.',
    tags: ['#hiddengem', '#healing'],
  },
  {
    id: 'sample_5',
    resto: 'Bobobox Pods Dago',
    menu: 'Weekend Short Staycation',
    cat: 'travel',
    price: 245000,
    rating: 4.6,
    distanceKm: 3.4,
    location: 'Dago, Bandung',
    photo: createFoodPreviewSvg('✈️', 'Staycation Dago', '#0369a1', '#0c4a6e'),
    note: 'Bersih, check-in gampang via app, dekat banyak cafe sarapan.',
    tags: ['#staycation', '#bandung'],
  },
  {
    id: 'sample_6',
    resto: 'Pasar Santa Thrift Corner',
    menu: 'Vintage Jacket & Vinyl Hunting',
    cat: 'thrift',
    price: 120000,
    rating: 4.7,
    distanceKm: 1.9,
    location: 'Kebayoran Baru',
    photo: createFoodPreviewSvg('🛍️', 'Thrift & Vinyl', '#be123c', '#881337'),
    note: 'Banyak pilihan jaket vintage kondisi mulus & kaset jadul.',
    tags: ['#thrift', '#vinyl'],
  },
];

function formatRupiah(num) {
  return 'Rp ' + Math.max(0, Math.round(Number(num) || 0)).toLocaleString('id-ID');
}

function parseLatLng(str) {
  const m = String(str || '').match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

function calcDistanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

export default function SocialPage() {
  const [transactions, setTransactions] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');
  const [locText, setLocText] = useState('');
  const [coords, setCoords] = useState(null);
  const [sortBy, setSortBy] = useState('rating-desc');
  const [copiedId, setCopiedId] = useState('');
  const [lang, setLang] = useState('id');

  // Composer state for sharing user's own review
  const [showComposer, setShowComposer] = useState(false);
  const [draftPlace, setDraftPlace] = useState('');
  const [draftMenu, setDraftMenu] = useState('');
  const [draftCat, setDraftCat] = useState('fnb');
  const [draftRating, setDraftRating] = useState(5);
  const [draftPrice, setDraftPrice] = useState('');
  const [draftLoc, setDraftLoc] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [postToast, setPostToast] = useState('');

  useEffect(() => {
    setLang(getSavedLang());
    const onLang = (e) => setLang(e.detail || getSavedLang());
    window.addEventListener('catatstruk-lang-change', onLang);
    return () => window.removeEventListener('catatstruk-lang-change', onLang);
  }, []);

  const t = I18N[lang] || I18N.id;

  useEffect(() => {
    try {
      const rawTx = localStorage.getItem('catatstruk_transactions_v1');
      const txList = rawTx ? JSON.parse(rawTx) : [];
      if (Array.isArray(txList)) setTransactions(txList);

      const rawPosts = localStorage.getItem(SOCIAL_POSTS_KEY);
      const postList = rawPosts ? JSON.parse(rawPosts) : [];
      if (Array.isArray(postList)) setUserPosts(postList);

      fetch('/api/social-journal')
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && Array.isArray(d.posts) && d.posts.length > 0) {
            const hydrated = d.posts.map((p) => {
              const meta = getCatMeta(p.cat);
              return {
                ...p,
                photo: p.photo || createFoodPreviewSvg(meta.icon, (p.resto || '').slice(0, 24), meta.bg1, meta.bg2),
                isUserPost: true,
              };
            });
            setUserPosts(hydrated);
            localStorage.setItem(SOCIAL_POSTS_KEY, JSON.stringify(hydrated));
          }
        })
        .catch(() => { });
    } catch { }

    // Auto-open composer if redirected after saving a receipt (?compose=1&merchant=...)
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('compose') === '1') {
        setShowComposer(true);
        if (sp.get('merchant')) setDraftPlace(sp.get('merchant'));
        if (sp.get('items')) setDraftMenu(sp.get('items'));
        if (sp.get('total')) {
          const num = Math.max(0, Number(sp.get('total')) || 0);
          if (num > 0) setDraftPrice(num.toLocaleString('id-ID'));
        }
        if (sp.get('category')) setDraftCat(mapReceiptCategoryToSocial(sp.get('category')));
        if (sp.get('location')) setDraftLoc(sp.get('location'));
      }
    } catch { }
  }, []);

  const saveUserPosts = (next) => {
    setUserPosts(next);
    try {
      localStorage.setItem(SOCIAL_POSTS_KEY, JSON.stringify(next));
    } catch { }
  };

  const handlePublishReview = (e) => {
    e.preventDefault();
    if (!draftPlace.trim()) return;
    const meta = getCatMeta(draftCat);
    const priceNum = Math.max(0, parseInt(String(draftPrice).replace(/[^\d]/g, ''), 10) || 0);
    const parsedTags = draftTags
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('#') ? s : `#${s}`))
      .slice(0, 4);

    const newPost = {
      id: `user_post_${Date.now()}`,
      resto: draftPlace.trim(),
      menu: draftMenu.trim() || meta.labelEn,
      cat: draftCat,
      price: priceNum,
      rating: Number(draftRating) || 5,
      location: draftLoc.trim() || locText.trim() || 'Indonesia',
      photo: createFoodPreviewSvg(meta.icon, draftPlace.trim().slice(0, 24), meta.bg1, meta.bg2),
      note: draftNote.trim() || (lang === 'en' ? 'Shared from my receipt experience!' : 'Dibagikan dari pengalaman kunjungan saya!'),
      tags: parsedTags,
      isUserPost: true,
      createdAt: Date.now(),
    };

    saveUserPosts([newPost, ...userPosts]);
    try {
      const authRaw = localStorage.getItem('catatstruk_auth_v1');
      const auth = authRaw ? JSON.parse(authRaw) : null;
      fetch('/api/social-journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({ post: newPost }),
      }).catch(() => { });
    } catch { }
    setDraftPlace('');
    setDraftMenu('');
    setDraftPrice('');
    setDraftLoc('');
    setDraftNote('');
    setDraftTags('');
    setDraftRating(5);
    setShowComposer(false);
    setCat('all');
    setPostToast(lang === 'en' ? 'Your review is now live in Social Journal!' : 'Ulasan Anda berhasil dibagikan ke Social Journal!');
    setTimeout(() => setPostToast(''), 3000);
  };

  const handleDeleteUserPost = (postId) => {
    saveUserPosts(userPosts.filter((p) => p.id !== postId));
    fetch(`/api/social-journal?id=${encodeURIComponent(postId)}`, { method: 'DELETE' }).catch(() => { });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const locQ = locText.trim().toLowerCase();
    const list = [];

    // 1. User's published Social Reviews
    userPosts.forEach((p) => {
      const matchCat = cat === 'all' || p.cat === cat;
      const matchQ =
        !q ||
        (p.resto || '').toLowerCase().includes(q) ||
        (p.menu || '').toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q) ||
        (p.tags || []).some((tg) => tg.toLowerCase().includes(q));
      const matchLoc = !locQ || coords || (p.location || '').toLowerCase().includes(locQ);
      if (matchCat && matchQ && matchLoc) {
        list.push({
          ...p,
          distanceKm: null,
          source: lang === 'en' ? 'Your Review' : 'Ulasan Anda',
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.resto} ${p.location || ''}`.trim())}`,
        });
      }
    });

    // 2. Community sample posts
    SAMPLE_COMMUNITY_POSTS.forEach((s) => {
      const matchCat = cat === 'all' || s.cat === cat;
      const matchQ =
        !q ||
        s.menu.toLowerCase().includes(q) ||
        s.resto.toLowerCase().includes(q) ||
        s.note.toLowerCase().includes(q) ||
        (s.tags || []).some((tg) => tg.toLowerCase().includes(q));
      const matchLoc = !locQ || coords || (s.location || '').toLowerCase().includes(locQ);
      if (matchCat && matchQ && matchLoc) {
        list.push({
          ...s,
          source: s.location || (lang === 'en' ? 'Community' : 'Komunitas'),
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.resto} ${s.location || locText}`.trim())}`,
        });
      }
    });

    // 3. Matching receipts from user's own history (if user searches)
    if (q) {
      transactions.forEach((tx) => {
        if (tx.status === 'outstanding') return;
        const matchedItem = (tx.items || []).find((it) => (it.name || '').toLowerCase().includes(q));
        const merchantMatch = (tx.merchant || '').toLowerCase().includes(q);
        if (!matchedItem && !merchantMatch) return;
        const txCoords = parseLatLng(tx.location);
        const dist = coords && txCoords ? calcDistanceKm(coords, txCoords) : null;
        const mappedCat = mapReceiptCategoryToSocial(tx.category);
        if (cat !== 'all' && mappedCat !== cat) return;
        list.push({
          id: `tx_${tx.id}`,
          resto: tx.merchant,
          menu: matchedItem ? matchedItem.name : tx.merchant,
          cat: mappedCat,
          price: matchedItem ? Math.max(0, Number(matchedItem.price) || Number(tx.total) || 0) : Math.max(0, Number(tx.total) || 0),
          rating: 4.9,
          distanceKm: dist,
          photo: tx.thumb || createFoodPreviewSvg('🧾', tx.merchant, '#0f766e', '#115e59'),
          note: tx.notes || (lang === 'en' ? 'From your recorded receipt.' : 'Dari catatan struk kunjungan Anda.'),
          source: lang === 'en' ? 'Your Receipt' : 'Struk Anda',
          tags: ['#catatstruk'],
          mapsUrl: tx.location && tx.location.startsWith('http')
            ? tx.location
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tx.merchant} ${locText}`.trim())}`,
        });
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
      if (sortBy === 'price-asc') return (a.price || 999999999) - (b.price || 999999999);
      if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
      return (b.rating || 0) - (a.rating || 0) || (b.createdAt || 0) - (a.createdAt || 0);
    });

    return list;
  }, [transactions, userPosts, cat, query, locText, coords, sortBy, lang]);

  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
      };
      setCoords(c);
      setLocText(`${c.lat}, ${c.lng}`);
    });
  };

  const buildCaption = (items) => {
    const lines = items.map((r, i) => `${i + 1}. ${r.resto} — ${r.menu} (${r.price > 0 ? formatRupiah(r.price) : 'Harga bervariasi'}, ⭐ ${r.rating.toFixed(1)})`);
    return `${lang === 'en' ? 'Recommendations on CatatStruk' : 'Rekomendasi dari CatatStruk'}:\n${lines.join('\n')}\n\n#CatatStruk #SocialFeed`;
  };

  const handleCopy = async (text, id = 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2200);
    } catch { }
  };

  const fullCaption = buildCaption(results.slice(0, 3));
  const mapsSearchHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    coords ? `${query || 'cafe'} near ${coords.lat},${coords.lng}` : `${query || 'spot hits'} ${locText || 'near me'}`
  )}`;

  const categoryOptions = [
    { value: 'all', label: lang === 'en' ? '🌐 All Categories' : '🌐 Semua Kategori' },
    ...SOCIAL_CATEGORIES.map((c) => ({
      value: c.value,
      label: `${c.icon} ${lang === 'en' ? c.labelEn : c.labelId}`,
    })),
  ];

  const composerCategoryOptions = SOCIAL_CATEGORIES.map((c) => ({
    value: c.value,
    label: `${c.icon} ${lang === 'en' ? c.labelEn : c.labelId}`,
  }));

  return (
    <div className="app-shell">
      <AppNavigation />

      <div className="route-page-head">
        <div>
          <span className="auth-badge">{t.socialBadge}</span>
          <h2>{lang === 'en' ? 'Community Reviews & Recommendations' : 'Ulasan & Rekomendasi Tempat'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowComposer((prev) => !prev)}
          >
            {showComposer
              ? (lang === 'en' ? '✕ Close Form' : '✕ Tutup Form')
              : (lang === 'en' ? '+ Share Review' : '+ Bagikan Ulasan')}
          </button>
          <Link href="/" className="btn btn-secondary">{t.backDashboard}</Link>
        </div>
      </div>

      {postToast && (
        <div className="card" style={{ padding: '12px 16px', background: 'rgba(15, 118, 110, 0.1)', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.88rem' }}>
          ✓ {postToast}
        </div>
      )}

      {/* Composer Form untuk User Bagikan Ulasan Tempat */}
      {showComposer && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1.5px solid var(--primary)' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h3>✍️ {lang === 'en' ? 'Share Your Place Review' : 'Bagikan Ulasan Tempat Anda'}</h3>
          </div>
          <form onSubmit={handlePublishReview} className="form-grid">
            <div className="field">
              <label>{lang === 'en' ? 'Place / Venue Name *' : 'Nama Tempat / Toko *'}</label>
              <input
                type="text"
                required
                value={draftPlace}
                onChange={(e) => setDraftPlace(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Kopi Tuku Cipete' : 'cth. Kopi Tuku Cipete'}
              />
            </div>
            <div className="field">
              <label>{lang === 'en' ? 'Category' : 'Kategori'}</label>
              <CustomSelect
                value={draftCat}
                onChange={(val) => setDraftCat(val)}
                options={composerCategoryOptions}
              />
            </div>
            <div className="field">
              <label>{lang === 'en' ? 'Highlight Menu / Activity' : 'Menu / Aktivitas Andalan'}</label>
              <input
                type="text"
                value={draftMenu}
                onChange={(e) => setDraftMenu(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Es Kopi Susu Tetangga' : 'cth. Es Kopi Susu Tetangga'}
              />
            </div>
            <div className="field">
              <label>{lang === 'en' ? 'Spend / Price (Rp)' : 'Perkiraan Harga (Rp)'}</label>
              <div className="currency-input">
                <span className="currency-prefix">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draftPrice}
                  onChange={(e) => {
                    const num = Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0);
                    setDraftPrice(num > 0 ? num.toLocaleString('id-ID') : '');
                  }}
                  placeholder="35.000"
                />
              </div>
            </div>
            <div className="field">
              <label>{lang === 'en' ? 'City / Area' : 'Kota / Lokasi'}</label>
              <input
                type="text"
                value={draftLoc}
                onChange={(e) => setDraftLoc(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Jakarta Selatan' : 'cth. Jakarta Selatan'}
              />
            </div>
            <div className="field">
              <label>{lang === 'en' ? 'Rating' : 'Penilaian'}</label>
              <div style={{ display: 'flex', gap: '6px', paddingTop: '4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`btn ${draftRating >= star ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '7px 11px', fontSize: '0.88rem' }}
                    onClick={() => setDraftRating(star)}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>
            <div className="field full" style={{ gridColumn: '1 / -1' }}>
              <label>{lang === 'en' ? 'Your Review / Tips' : 'Ulasan & Pengalaman Anda'}</label>
              <textarea
                rows={2}
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                placeholder={lang === 'en' ? 'What did you love? Ambience, taste, price, parking...' : 'Ceritakan rasa, suasana, harga, atau tips berkunjung...'}
              />
            </div>
            <div className="field full" style={{ gridColumn: '1 / -1' }}>
              <label>{lang === 'en' ? 'Hashtags (optional)' : 'Tagar (opsional)'}</label>
              <input
                type="text"
                value={draftTags}
                onChange={(e) => setDraftTags(e.target.value)}
                placeholder="#wfc #murah #recommended"
              />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowComposer(false)}>
                {lang === 'en' ? 'Cancel' : 'Batal'}
              </button>
              <button type="submit" className="btn btn-primary">
                🚀 {lang === 'en' ? 'Publish Review' : 'Terbitkan Ulasan'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filter Bar Rapi dengan Label Jelas */}
      <section className="card social-filter-card">
        <div className="social-filter-row">
          <div className="field">
            <label>{lang === 'en' ? 'Category' : 'Kategori'}</label>
            <CustomSelect
              value={cat}
              onChange={(val) => setCat(val)}
              ariaLabel="Category"
              options={categoryOptions}
            />
          </div>
          <div className="field social-query-field">
            <label>{lang === 'en' ? 'Search Place, Menu, or Review' : 'Cari Tempat, Menu, atau Ulasan'}</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === 'en' ? 'e.g. nasi goreng, watercolor, staycation...' : 'cth. nasi goreng, kopi, staycation...'}
            />
          </div>
          <div className="field">
            <label>{lang === 'en' ? 'Location / Area' : 'Filter Lokasi / Kota'}</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={locText}
                onChange={(e) => { setCoords(null); setLocText(e.target.value); }}
                placeholder={lang === 'en' ? 'City or area...' : 'Kota / area...'}
              />
              <button type="button" className="btn btn-secondary" onClick={handleUseGps} title="GPS" style={{ whiteSpace: 'nowrap', padding: '0 10px' }}>
                📍 GPS
              </button>
            </div>
          </div>
          <div className="field">
            <label>{t.socialSortLbl}</label>
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              ariaLabel={t.socialSortLbl}
              options={[
                { value: 'rating-desc', label: t.socialSortRating },
                { value: 'newest', label: lang === 'en' ? '🆕 Newest' : '🆕 Terbaru' },
                { value: 'price-asc', label: t.socialSortCheap },
                { value: 'price-desc', label: t.socialSortExpensive },
              ]}
            />
          </div>
        </div>

        <div className="social-toolbar-bottom">
          <div className="social-popular-tags">
            {SOCIAL_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`merchant-chip${cat === c.value ? ' active' : ''}`}
                onClick={() => setCat(cat === c.value ? 'all' : c.value)}
              >
                {c.icon} {lang === 'en' ? c.labelEn : c.labelId}
              </button>
            ))}
          </div>

          <div className="social-global-actions">
            <button type="button" className="btn btn-secondary" onClick={() => handleCopy(fullCaption, 'all')}>
              {copiedId === 'all' ? t.socialCopied : t.socialCopyAll}
            </button>
            <a className="btn btn-secondary" href={mapsSearchHref} target="_blank" rel="noopener noreferrer">
              {t.socialOpenMaps}
            </a>
            <a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(fullCaption)}`} target="_blank" rel="noopener noreferrer">
              {t.socialShareWa}
            </a>
          </div>
        </div>
      </section>

      {/* Tumblr-Style Visual Feed Cards */}
      <section className="tumblr-feed-grid" aria-label="Feed Ulasan Komunitas">
        {results.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '28px 16px' }}>
            <p className="muted" style={{ marginBottom: '10px' }}>
              {lang === 'en' ? 'No reviews match your filter yet.' : 'Belum ada ulasan yang cocok dengan filter ini.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setShowComposer(true)}>
              + {lang === 'en' ? 'Be the first to share a review' : 'Jadilah yang pertama membagikan ulasan'}
            </button>
          </div>
        ) : (
          results.map((r) => {
            const catMeta = getCatMeta(r.cat);
            return (
              <article key={r.id} className="tumblr-post-card">
                <div className="tumblr-photo-wrap">
                  <img src={r.photo} alt={`${r.resto} - ${r.menu}`} className="tumblr-photo" loading="lazy" />
                  <span className="tumblr-rating-pill">⭐ {Number(r.rating || 5).toFixed(1)}</span>
                  {r.distanceKm !== null && r.distanceKm !== undefined && (
                    <span className="tumblr-dist-pill">📍 {r.distanceKm} km</span>
                  )}
                </div>

                <div className="tumblr-card-body">
                  <div className="tumblr-tags-row">
                    <span className="social-tag-pill">{catMeta.icon} {lang === 'en' ? catMeta.labelEn : catMeta.labelId}</span>
                    {(r.tags || []).slice(0, 2).map((tg) => (
                      <span key={tg} className="social-tag-pill">{tg}</span>
                    ))}
                    <span className="tumblr-source-label">{r.source}</span>
                  </div>

                  <h3 className="tumblr-resto-title">{r.resto}</h3>
                  <p className="tumblr-menu-name">{r.menu}</p>
                  <p className="tumblr-note">{r.note}</p>

                  <div className="tumblr-price-row">
                    <span className="tumblr-price">{r.price > 0 ? formatRupiah(r.price) : (lang === 'en' ? 'Price varies' : 'Lihat harga di lokasi')}</span>
                  </div>

                  <div className="tumblr-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleCopy(buildCaption([r]), r.id)}
                    >
                      {copiedId === r.id ? t.socialCopied : t.socialCopyCard}
                    </button>
                    <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                      {t.socialViewLoc}
                    </a>
                    {r.isUserPost && (
                      <button
                        type="button"
                        className="btn btn-danger-outline"
                        onClick={() => handleDeleteUserPost(r.id)}
                        title={lang === 'en' ? 'Delete' : 'Hapus'}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
