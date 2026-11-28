import { NextResponse } from 'next/server';
import { listVersionHistory } from '@/lib/server/version-service';

export async function GET() {
  try {
    const versions = await listVersionHistory();
    const latestVersion = versions[0]?.version || 'v1.1';
    return NextResponse.json({
      ok: true,
      latestVersion,
      versions,
    });
  } catch (err) {
    console.error('GET /api/version error:', err);
    return NextResponse.json(
      { ok: false, error: 'Gagal memuat riwayat versi dari database.' },
      { status: 500 }
    );
  }
}
