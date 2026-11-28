# Local Development JSON Data (`db/`)

Folder ini menyimpan data dummy lokal berbentuk JSON untuk **Development Mode** (`APP_ENV=development` tanpa koneksi Supabase/database eksternal).
Semua file `db/*.json` di-ignore oleh `.gitignore` agar data testing lokal tidak ter-commit ke repository.

> **Catatan:** Jika sebelumnya file `db/*.json` sudah sempat ter-track oleh Git, jalankan sekali:
> ```bash
> git rm --cached db/*.json
> ```

---

## Daftar File & Bentuk Struktur Data

### 1. `db/users.json`
Menyimpan daftar akun lokal.
```json
[
  {
    "username": "premium",
    "email": "premium@example.com",
    "password": "123456",
    "is_premium_until": "9999-01-01",
    "sheet_url": ""
  },
  {
    "username": "demo",
    "email": "demo@example.com",
    "password": "123456",
    "is_premium_until": null,
    "sheet_url": ""
  }
]
```

### 2. `db/friend_groups.json`
Menyimpan grup teman per user.
```json
[
  {
    "username": "premium",
    "group_name": "Trip Bali Squad",
    "created_at": "2026-11-28 20:00:00"
  },
  {
    "username": "premium",
    "group_name": "Tim Kantor Dev",
    "created_at": "2026-11-28 18:30:00"
  }
]
```

### 3. `db/friends.json`
Menyimpan relasi teman dan keanggotaan grup.
```json
[
  {
    "username": "premium",
    "friend_username": "andi.pratama",
    "friend_email": "andi.pratama@example.com",
    "group_name": "Trip Bali Squad",
    "created_at": "2026-11-28 20:00:00"
  }
]
```

### 4. `db/itineraries.json`
Menyimpan rencana perjalanan & anggaran (Itinerary Planner).
```json
[
  {
    "username": "premium",
    "id": "itin_dev_bali",
    "title": "Trip Bali Squad (3H2M)",
    "limit": 3000000,
    "groupName": "Trip Bali Squad",
    "items": [
      {
        "id": "it_b1",
        "day": 1,
        "time": "08:00",
        "activity": "Tiket Pesawat PP (Bayar Sendiri)",
        "cost": 1450000,
        "payMode": "personal"
      },
      {
        "id": "it_b2",
        "day": 1,
        "time": "14:00",
        "activity": "Villa Seminyak (Split Bill Grup)",
        "cost": 1800000,
        "payMode": "split"
      }
    ]
  }
]
```

### 5. `db/social_journal.json`
Menyimpan ulasan **Social Journal** (kategori: `fnb`, `hobby`, `travel`, `hiddengem`, `wellness`, `thrift`).
```json
[
  {
    "id": "post_dev_1",
    "username": "premium",
    "resto": "Bebek Tepi Sawah Ubud",
    "menu": "Crispy Duck & Sambal Matah",
    "cat": "fnb",
    "price": 135000,
    "rating": 4.9,
    "location": "Ubud, Bali",
    "note": "Tempatnya luas dengan pemandangan sawah, bebeknya renyah!",
    "tags": ["#ubud", "#kulinerbali", "#tripbalisquad"],
    "createdAt": 1795880000000
  }
]
```

### 6. `db/transactions.json` (Expenses, Reimburse, & Outstanding Split Bills)
Field sensitif transaksi (`merchant`, `date`, `total`, `items`, `reimburse`, `itineraryId`) disimpan dalam `encrypted_payload` menggunakan enkripsi lokal.
**Cara paling mudah generate data dummy transaksi** adalah lewat helper `insertMissingTransactions` agar payload otomatis terenkripsi dengan benar:

```bash
node --input-type=module -e "
import { insertMissingTransactions } from './lib/server/transactions-service.js';

await insertMissingTransactions('premium', [
  {
    id: 'cs_dev_1',
    date: '2026-11-28',
    merchant: 'Indomaret Point',
    category: 'Kebutuhan Harian',
    total: 76500,
    paymentMethod: 'QRIS',
    items: [{ name: 'Kopi & Snack', qty: 2, price: 38250 }],
    status: 'expense'
  },
  {
    id: 'cs_dev_reimb_1',
    date: '2026-11-27',
    merchant: 'GrabCar Airport',
    category: 'Transportasi',
    total: 185000,
    paymentMethod: 'Kartu Kredit',
    items: [{ name: 'GrabCar Airport', qty: 1, price: 185000 }],
    reimburse: true,
    reimburseStatus: 'pending',
    itineraryId: 'itin_dev_dinas',
    status: 'expense'
  },
  {
    id: 'cs_dev_out_1',
    date: '2026-11-28',
    merchant: 'Bebek Tepi Sawah',
    category: 'Makanan',
    total: 135000,
    paymentMethod: 'QRIS',
    items: [{ name: 'Bebek Crispy (Split Bill)', qty: 1, price: 135000 }],
    status: 'outstanding',
    sharedBy: 'andi.pratama'
  }
]);
"
```

### 7. `db/audit_logs.json` & `db/version_history.json`
- `db/audit_logs.json`: dibuat otomatis sebagai `[]` saat ada aktivitas login/transaksi/admin.
- `db/version_history.json`: opsional; jika kosong akan fallback ke catatan default di `lib/server/version-service.js`.
