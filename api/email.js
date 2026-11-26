function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderEmailTemplate(template, data = {}) {
  const username = escapeHtml(data.username || 'Pengguna');
  const untilLabel = escapeHtml(data.untilLabel || 'Selamanya');
  const daysRemaining = Number(data.daysRemaining || 0);
  const appUrl = escapeHtml(data.appUrl || 'https://catat-struk.vercel.app');

  if (template === 'expiry_reminder') {
    return {
      subject: `Masa Premium CatatStruk Anda Tersisa ${daysRemaining} Hari`,
      html: `
<!DOCTYPE html>
<html lang="id">
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:24px;color:#ffffff;">
      <h2 style="margin:0;font-size:20px;">CatatStruk</h2>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Pengingat Masa Aktif Premium</p>
    </div>
    <div style="padding:24px;line-height:1.6;font-size:15px;">
      <p style="margin-top:0;">Halo <strong>${username}</strong>,</p>
      <p>Masa aktif paket <strong>Premium</strong> CatatStruk Anda tersisa <strong>${daysRemaining} hari lagi</strong> (berakhir pada <strong>${untilLabel}</strong>).</p>
      <p>Setelah masa aktif berakhir, akun Anda akan beralih ke <strong>User Reguler</strong> (Mode Demo) dan sinkronisasi otomatis ke Google Sheet akan dinonaktifkan.</p>
      <div style="margin:22px 0;text-align:center;">
        <a href="${appUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px;">Buka CatatStruk</a>
      </div>
      <p style="font-size:12px;color:#64748b;margin-bottom:0;">Email ini dikirim otomatis oleh sistem CatatStruk.</p>
    </div>
  </div>
</body>
</html>`,
    };
  }

  // Default: 'welcome'
  return {
    subject: 'Selamat Datang di CatatStruk — Akun Anda Siap Digunakan!',
    html: `
<!DOCTYPE html>
<html lang="id">
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:24px;color:#ffffff;">
      <h2 style="margin:0;font-size:20px;">Selamat Datang di CatatStruk</h2>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Foto Struk Belanja &rarr; Otomatis Masuk Google Sheet</p>
    </div>
    <div style="padding:24px;line-height:1.6;font-size:15px;">
      <p style="margin-top:0;">Halo <strong>${username}</strong>,</p>
      <p>Akun CatatStruk Anda berhasil dibuat! Berikut ringkasan akun Anda:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin:14px 0;">
        <div><strong>Username:</strong> ${username}</div>
        <div><strong>Status Premium:</strong> ${untilLabel}</div>
      </div>
      <p>Anda dapat langsung memfoto struk belanja dan menghubungkan link Google Sheet pribadi Anda.</p>
      <div style="margin:22px 0;text-align:center;">
        <a href="${appUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px;">Mulai Catat Struk</a>
      </div>
      <p style="font-size:12px;color:#64748b;margin-bottom:0;">Terima kasih telah menggunakan CatatStruk.</p>
    </div>
  </div>
</body>
</html>`,
  };
}

export async function sendTemplateEmail({ to, template = 'welcome', data = {}, subject, html }) {
  const recipient = String(to || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return { ok: false, skipped: true, reason: 'Alamat email tidak valid' };
  }

  const rendered = template === 'custom' && html
    ? { subject: subject || 'Notifikasi CatatStruk', html }
    : renderEmailTemplate(template, data);

  // Opsi 1: Resend API (gratis 3.000 email/bulan)
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'CatatStruk <onboarding@resend.dev>',
        to: [recipient],
        subject: rendered.subject,
        html: rendered.html,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[email] Resend error:', res.status, out);
      return { ok: false, error: out?.message || 'Gagal kirim email via Resend' };
    }
    return { ok: true, id: out.id || 'resend_ok' };
  }

  // Opsi 2: Fallback gratis via Google Apps Script MailApp
  if (process.env.APPS_SCRIPT_BRIDGE_URL) {
    const res = await fetch(process.env.APPS_SCRIPT_BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'send_email',
        to: recipient,
        subject: rendered.subject,
        htmlBody: rendered.html,
      }),
    });
    const out = await res.json().catch(() => ({ ok: res.ok }));
    if (!res.ok || out.ok === false) {
      console.error('[email] Apps Script MailApp error:', out);
      return { ok: false, error: out.error || 'Gagal kirim email via Apps Script' };
    }
    return { ok: true, id: 'gas_mail_ok' };
  }

  return { ok: false, skipped: true, reason: 'Provider email belum dikonfigurasi' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const result = await sendTemplateEmail(body);
    return res.status(result.ok || result.skipped ? 200 : 500).json(result);
  } catch (err) {
    console.error('[email] Internal error:', err);
    return res.status(500).json({ ok: false, error: 'Gagal memproses pengiriman email.' });
  }
}
