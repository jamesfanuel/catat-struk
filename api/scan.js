const CATEGORIES = [
  'Makanan & Minuman',
  'Belanja',
  'Transportasi',
  'Tagihan',
  'Kesehatan',
  'Hiburan',
  'Lainnya',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: 'GEMINI_API_KEY belum diatur di server (.env / Vercel).',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { imageBase64, model = 'gemini-flash-lite-latest', today } = body;
    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: 'Gambar struk kosong.' });
    }

    const fallbackDate = /^\d{4}-\d{2}-\d{2}$/.test(today || '')
      ? today
      : new Date().toISOString().slice(0, 10);

    const prompt = `Kamu adalah asisten pencatat keuangan Indonesia yang ahli membaca struk cetak maupun nota tulisan tangan. Baca gambar struk/nota pembayaran ini dan ekstrak datanya ke JSON valid dengan struktur persis berikut:
{
  "merchant": "nama toko/bengkel/merchant (lihat kop/stempel jika ada)",
  "date": "YYYY-MM-DD (konversi format DD-MM-YY atau DD/MM/YY jika ada; gunakan ${fallbackDate} jika tidak terbaca)",
  "category": "salah satu dari: Makanan & Minuman, Belanja, Transportasi, Tagihan, Kesehatan, Hiburan, Lainnya",
  "total": 0,
  "paymentMethod": "salah satu dari: QRIS, Tunai, Debit, Kredit, E-Wallet, Transfer",
  "items": [
    { "name": "nama item", "qty": 1, "price": 0 }
  ],
  "notes": "ringkasan singkat 2-4 kata"
}
Aturan penting:
- Jika harga tertulis memakai 'K' atau 'rb' (misal 350K, 80K, 980K), konversi menjadi angka penuh Rupiah (350000, 80000, 980000).
- Pastikan total dan price berupa angka bulat Rupiah >= 0 tanpa titik/koma.`;

    const candidates = [
      model,
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
    ].filter((v, i, arr) => v && arr.indexOf(v) === i);

    let gemRes = null;
    let lastErrText = '';
    for (const m of candidates) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      gemRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });
      if (gemRes.ok) break;
      lastErrText = await gemRes.text();
      if (![404, 429, 500, 502, 503, 504].includes(gemRes.status)) break;
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!gemRes || !gemRes.ok) {
      const status = gemRes ? gemRes.status : 500;
      return res.status(status).json({
        ok: false,
        error: `Gemini API error (${status}): ${lastErrText.slice(0, 160)}`,
      });
    }

    const json = await gemRes.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ ok: false, error: 'Respon Gemini kosong.' });
    }

    const parsed = JSON.parse(rawText);
    return res.status(200).json({
      ok: true,
      data: {
        merchant: parsed.merchant || 'Struk Belanja',
        date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : fallbackDate,
        category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Lainnya',
        total: Math.max(0, Math.round(Number(parsed.total) || 0)),
        paymentMethod: parsed.paymentMethod || 'QRIS',
        items: Array.isArray(parsed.items)
          ? parsed.items.map((i) => ({
              name: String(i.name || ''),
              qty: Math.max(1, Math.round(Number(i.qty) || 1)),
              price: Math.max(0, Math.round(Number(i.price) || 0)),
            }))
          : [],
        notes: parsed.notes || '',
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Gagal memindai struk' });
  }
}
