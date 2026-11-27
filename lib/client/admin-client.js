import { enhanceAllSelects } from './select-ui.js';

const ADMIN_TOKEN_KEY = 'catatstruk_admin_token_v1';
const $ = (id) => document.getElementById(id);

let adminState = {
  token: '',
  users: [],
  search: '',
  tierFilter: 'all',
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, type = 'info') {
  const container = $('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 220);
  }, 3000);
}

async function adminRequest(path, { method = 'POST', body = undefined, skipAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (!skipAuth && adminState.token) {
    headers.Authorization = `Bearer ${adminState.token}`;
  }
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if ((res.status === 401 || res.status === 403) && !skipAuth) {
    logoutAdmin();
    throw new Error(data.error || 'Sesi admin berakhir.');
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Permintaan gagal.');
  }
  return data;
}

function logoutAdmin() {
  adminState.token = '';
  adminState.users = [];
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  $('admin-main')?.classList.add('hidden');
  $('btn-admin-logout')?.classList.add('hidden');
  $('modal-admin-login')?.classList.remove('hidden');
}

function getTierBadgeHtml(u) {
  if (u.is_lifetime) return '<span class="badge-tier lifetime">Premium Selamanya</span>';
  if (u.is_premium) return `<span class="badge-tier active">Premium s/d ${escapeHtml(u.is_premium_until)}</span>`;
  if (u.is_expired) return `<span class="badge-tier expired">Expired (${escapeHtml(u.is_premium_until)})</span>`;
  return '<span class="badge-tier regular">Reguler</span>';
}

function renderUsers() {
  const q = adminState.search.trim().toLowerCase();
  const filtered = adminState.users.filter((u) => {
    const matchQuery = !q ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q);
    if (!matchQuery) return false;
    if (adminState.tierFilter === 'premium') return u.is_premium;
    if (adminState.tierFilter === 'regular') return !u.is_premium && !u.is_expired;
    if (adminState.tierFilter === 'expired') return u.is_expired;
    return true;
  });

  const totalUsers = adminState.users.length;
  const premiumUsers = adminState.users.filter((u) => u.is_premium).length;
  if ($('stat-total-users')) $('stat-total-users').textContent = String(totalUsers);
  if ($('stat-premium-users')) $('stat-premium-users').textContent = String(premiumUsers);
  if ($('stat-regular-users')) $('stat-regular-users').textContent = String(totalUsers - premiumUsers);

  const tbody = $('admin-users-tbody');
  const emptyEl = $('admin-empty');
  if (!tbody || !emptyEl) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  tbody.innerHTML = filtered
    .map((u) => {
      const sheetCell = u.sheet_url
        ? `<a href="${escapeHtml(u.sheet_url)}" target="_blank" rel="noopener noreferrer" class="sheet-cell-link">Buka Sheet &nearr;</a>`
        : '<span class="muted">-</span>';
      return `
        <tr>
          <td><strong>${escapeHtml(u.username)}</strong></td>
          <td>${escapeHtml(u.email || '-')}</td>
          <td>${getTierBadgeHtml(u)}</td>
          <td>${sheetCell}</td>
          <td><small class="muted">${escapeHtml(u.created_at || '-')}</small></td>
          <td>
            <div class="admin-actions">
              <button type="button" class="btn btn-secondary btn-edit-user" data-username="${escapeHtml(u.username)}">Edit</button>
              <button type="button" class="btn btn-danger-outline btn-delete-user" data-username="${escapeHtml(u.username)}">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function loadUsers() {
  try {
    const data = await adminRequest('/api/admin/users', { method: 'GET' });
    adminState.users = Array.isArray(data.users) ? data.users : [];
    renderUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function toggleDateField() {
  const isDate = $('user-form-tier')?.value === 'date';
  $('user-form-date-wrap')?.classList.toggle('hidden', !isDate);
}

function setTierDropdownValue(val) {
  const safeVal = ['lifetime', 'date', 'regular'].includes(val) ? val : 'lifetime';
  if ($('user-form-tier')) $('user-form-tier').value = safeVal;
  const options = document.querySelectorAll('#tier-dropdown-menu .custom-select-option');
  options.forEach((opt) => {
    const isSel = opt.dataset.value === safeVal;
    opt.classList.toggle('selected', isSel);
    if (isSel) {
      if ($('tier-trigger-icon')) $('tier-trigger-icon').textContent = opt.dataset.icon || '👑';
      if ($('tier-trigger-label')) $('tier-trigger-label').textContent = opt.dataset.label || '';
    }
  });
  toggleDateField();
}

function closeTierDropdown() {
  $('tier-custom-select')?.classList.remove('open');
  $('tier-dropdown-menu')?.classList.add('hidden');
  $('tier-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
}

function openUserModal(user = null) {
  const isEdit = Boolean(user);
  $('user-form-mode').value = isEdit ? 'edit' : 'create';
  $('modal-user-title').textContent = isEdit ? `Edit User: ${user.username}` : 'Tambah User Baru';
  $('user-form-username').value = user?.username || '';
  $('user-form-username').readOnly = isEdit;
  $('user-form-email').value = user?.email || '';
  $('user-form-password').value = '';
  $('user-form-password').required = !isEdit;
  $('user-form-password-label').textContent = isEdit ? 'Password Baru (Kosongkan jika tetap)' : 'Password';
  $('user-form-sheet').value = user?.sheet_url || '';
  $('user-form-error').classList.add('hidden');

  if (!user || user.is_lifetime) {
    setTierDropdownValue('lifetime');
    $('user-form-until').value = '';
  } else if (user.is_premium_until) {
    setTierDropdownValue('date');
    $('user-form-until').value = user.is_premium_until;
  } else {
    setTierDropdownValue('regular');
    $('user-form-until').value = '';
  }
  closeTierDropdown();
  $('modal-user-form')?.classList.remove('hidden');
}

function bindEvents() {
  $('admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('admin-login-error');
    errEl.classList.add('hidden');
    const btn = $('btn-admin-login-submit');
    btn.disabled = true;
    try {
      const data = await adminRequest('/api/admin/login', {
        method: 'POST',
        body: { password: $('admin-password-input').value },
        skipAuth: true,
      });
      adminState.token = data.token;
      sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      $('admin-password-input').value = '';
      $('modal-admin-login').classList.add('hidden');
      $('admin-main').classList.remove('hidden');
      $('btn-admin-logout').classList.remove('hidden');
      await loadUsers();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  $('btn-admin-logout')?.addEventListener('click', logoutAdmin);
  $('btn-refresh-users')?.addEventListener('click', loadUsers);
  $('btn-new-user')?.addEventListener('click', () => openUserModal(null));

  $('tier-dropdown-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wrap = $('tier-custom-select');
    const menu = $('tier-dropdown-menu');
    const willOpen = menu.classList.contains('hidden');
    wrap.classList.toggle('open', willOpen);
    menu.classList.toggle('hidden', !willOpen);
    $('tier-dropdown-trigger').setAttribute('aria-expanded', String(willOpen));
  });

  document.querySelectorAll('#tier-dropdown-menu .custom-select-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      setTierDropdownValue(opt.dataset.value);
      closeTierDropdown();
    });
  });

  document.addEventListener('click', (e) => {
    if (!$('tier-custom-select')?.contains(e.target)) {
      closeTierDropdown();
    }
  });

  $('admin-search')?.addEventListener('input', (e) => {
    adminState.search = e.target.value;
    renderUsers();
  });

  $('admin-tier-filter')?.addEventListener('change', (e) => {
    adminState.tierFilter = e.target.value;
    renderUsers();
  });

  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => $(el.dataset.close)?.classList.add('hidden'));
  });

  $('admin-users-tbody')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit-user');
    if (editBtn) {
      const user = adminState.users.find((u) => u.username === editBtn.dataset.username);
      if (user) openUserModal(user);
      return;
    }

    const delBtn = e.target.closest('.btn-delete-user');
    if (delBtn) {
      const uname = delBtn.dataset.username;
      if (!confirm(`Hapus user "${uname}"?`)) return;
      try {
        await adminRequest('/api/admin/users', { method: 'DELETE', body: { username: uname } });
        showToast(`User "${uname}" dihapus.`, 'info');
        await loadUsers();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });

  $('user-crud-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('user-form-error');
    errEl.classList.add('hidden');
    const mode = $('user-form-mode').value;
    const tier = $('user-form-tier').value;
    let is_premium_until = null;
    if (tier === 'lifetime') is_premium_until = '9999-01-01';
    else if (tier === 'date') {
      is_premium_until = $('user-form-until').value;
      if (!is_premium_until) {
        errEl.textContent = 'Pilih tanggal berakhir Premium.';
        errEl.classList.remove('hidden');
        return;
      }
    }

    const btn = $('btn-user-form-submit');
    btn.disabled = true;
    try {
      const payload = {
        username: $('user-form-username').value.trim(),
        email: $('user-form-email').value.trim(),
        password: $('user-form-password').value,
        is_premium_until,
        sheet_url: $('user-form-sheet').value.trim(),
      };
      await adminRequest('/api/admin/users', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        body: payload,
      });
      $('modal-user-form').classList.add('hidden');
      showToast(mode === 'edit' ? 'Data user diperbarui!' : 'User baru berhasil dibuat!', 'success');
      await loadUsers();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });
}

export async function initAdmin() {
  const savedTheme = localStorage.getItem('catatstruk_theme_v1') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  adminState.token = sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
  enhanceAllSelects();
  bindEvents();

  if (adminState.token) {
    try {
      await adminRequest('/api/admin/verify', { method: 'POST' });
      $('modal-admin-login')?.classList.add('hidden');
      $('admin-main')?.classList.remove('hidden');
      $('btn-admin-logout')?.classList.remove('hidden');
      await loadUsers();
    } catch {
      logoutAdmin();
    }
  }
}
