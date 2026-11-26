import math
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FPS = 30
DURATION = 30.0
TOTAL_FRAMES = int(FPS * DURATION)
OUT_PATH = r"d:\Menuju Milyader\marketing\CatatStruk-Promo.mp4"


def load_font(name, size):
    for candidate in (name, "segoeui.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            continue
    return ImageFont.load_default()


F_PILL = load_font("segoeuib.ttf", 26)
F_TITLE = load_font("segoeuib.ttf", 62)
F_HERO = load_font("segoeuib.ttf", 92)
F_SUB = load_font("segoeui.ttf", 33)
F_CARD_H = load_font("segoeuib.ttf", 35)
F_CARD_B = load_font("segoeui.ttf", 27)
F_MONO_B = load_font("consolab.ttf", 32)
F_MONO = load_font("consola.ttf", 24)
F_BUBBLE = load_font("segoeuib.ttf", 27)


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease_out(x):
    return 1.0 - (1.0 - clamp(x)) ** 3


def make_gradient_bg():
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    # Linear gradient #071318 -> #0b2229 -> #071017
    r = np.where(y < 0.55, 7 + (11 - 7) * (y / 0.55), 11 + (7 - 11) * ((y - 0.55) / 0.45))
    g = np.where(y < 0.55, 19 + (34 - 19) * (y / 0.55), 34 + (16 - 34) * ((y - 0.55) / 0.45))
    b = np.where(y < 0.55, 24 + (41 - 24) * (y / 0.55), 41 + (23 - 41) * ((y - 0.55) / 0.45))

    # Ambient teal glow top-left + emerald glow bottom-right
    d1 = np.sqrt(((x - 0.24) * W) ** 2 + ((y - 0.20) * H) ** 2)
    g1 = np.clip(1.0 - d1 / 480.0, 0.0, 1.0) ** 2 * 0.26
    d2 = np.sqrt(((x - 0.76) * W) ** 2 + ((y - 0.77) * H) ** 2)
    g2 = np.clip(1.0 - d2 / 480.0, 0.0, 1.0) ** 2 * 0.20

    r = np.clip(r + g1 * 20 + g2 * 16, 0, 255).astype(np.uint8)
    g = np.clip(g + g1 * 184 + g2 * 185, 0, 255).astype(np.uint8)
    b = np.clip(b + g1 * 166 + g2 * 129, 0, 255).astype(np.uint8)
    rgb = np.stack([r, g, b], axis=-1)
    return Image.fromarray(rgb, mode="RGB").convert("RGBA")


BASE_BG = make_gradient_bg()


def draw_pill(d, text, y=120):
    d.rounded_rectangle([W // 2 - 290, y, W // 2 + 290, y + 66], radius=33, fill=(20, 184, 166, 42), outline=(45, 212, 191, 130), width=3)
    d.text((W // 2, y + 33), text, fill="#5eead4", font=F_PILL, anchor="mm")


def draw_title(d, lines, y, color="#ffffff", font=F_TITLE, gap=78):
    for i, line in enumerate(lines):
        d.text((W // 2, y + i * gap), line, fill=color, font=font, anchor="mm")


def draw_user(d, x, y, scale, mood, t, hair="#1e293b", shirt="#0d9488", glasses=False):
    bob = int(math.sin(t * 5) * 5 * scale)
    cy = y + bob

    def s(v):
        return int(v * scale)

    d.rounded_rectangle([x - s(72), cy + s(60), x + s(72), cy + s(165)], radius=s(40), fill=shirt)
    d.rounded_rectangle([x - s(18), cy + s(38), x + s(18), cy + s(68)], radius=s(10), fill="#f1c29b")
    d.ellipse([x - s(56), cy - s(56), x + s(56), cy + s(56)], fill="#fbd3b1")
    d.pieslice([x - s(58), cy - s(64), x + s(58), cy + s(32)], start=180, end=360, fill=hair)

    blink = (t % 3.2) > 3.05
    if blink:
        d.rectangle([x - s(26), cy - s(4), x - s(12), cy], fill="#0f172a")
        d.rectangle([x + s(12), cy - s(4), x + s(26), cy], fill="#0f172a")
    else:
        d.ellipse([x - s(25), cy - s(10), x - s(13), cy + s(2)], fill="#0f172a")
        d.ellipse([x + s(13), cy - s(10), x + s(25), cy + s(2)], fill="#0f172a")

    if glasses:
        d.rectangle([x - s(33), cy - s(16), x - s(5), cy + s(6)], outline="#334155", width=3)
        d.rectangle([x + s(5), cy - s(16), x + s(33), cy + s(6)], outline="#334155", width=3)
        d.line([x - s(5), cy - s(6), x + s(5), cy - s(6)], fill="#334155", width=3)

    if mood == "stressed":
        d.arc([x - s(18), cy + s(18), x + s(18), cy + s(34)], start=180, end=360, fill="#0f172a", width=4)
    else:
        d.arc([x - s(18), cy + s(6), x + s(18), cy + s(30)], start=15, end=165, fill="#0f172a", width=4)

    w_arm = int(math.sin(t * 8) * s(14))
    if mood == "stressed":
        d.line([x - s(66), cy + s(92), x - s(104), cy + s(36) + w_arm], fill="#fbd3b1", width=s(16))
        d.line([x + s(66), cy + s(92), x + s(104), cy + s(36) - w_arm], fill="#fbd3b1", width=s(16))
    elif mood == "photo":
        d.line([x + s(66), cy + s(96), x + s(106), cy + s(40)], fill="#fbd3b1", width=s(16))
        d.rounded_rectangle([x + s(90), cy - s(12), x + s(132), cy + s(58)], radius=s(10), fill="#1e293b", outline="#38bdf8", width=3)
    else:
        d.line([x - s(66), cy + s(98), x - s(96), cy + s(58) + w_arm // 2], fill="#fbd3b1", width=s(16))
        d.line([x + s(66), cy + s(98), x + s(96), cy + s(58) - w_arm // 2], fill="#fbd3b1", width=s(16))


def draw_bubble(d, x, y, w, h, text, bg="#ffffff", fg="#0f172a"):
    d.rounded_rectangle([x - w // 2, y, x + w // 2, y + h], radius=24, fill=bg)
    d.text((x, y + h // 2), text, fill=fg, font=F_BUBBLE, anchor="mm")


def draw_check(d, cx, cy, color="#a7f3d0"):
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(255, 255, 255, 38))
    d.line([cx - 7, cy, cx - 2, cy + 6, cx + 8, cy - 6], fill=color, width=4)


def draw_feature_icon(d, cx, cy, kind):
    d.rounded_rectangle([cx - 34, cy - 34, cx + 34, cy + 34], radius=18, fill=(20, 184, 166, 38), outline="#14b8a6", width=2)
    if kind == "phone":
        d.rounded_rectangle([cx - 12, cy - 20, cx + 12, cy + 20], radius=5, outline="#5eead4", width=3)
        d.ellipse([cx - 2, cy + 12, cx + 2, cy + 16], fill="#5eead4")
    elif kind == "bolt":
        d.polygon([(cx + 2, cy - 20), (cx - 12, cy + 2), (cx, cy + 2), (cx - 4, cy + 20), (cx + 12, cy - 2), (cx, cy - 2)], fill="#fbbf24")
    elif kind == "rp":
        d.ellipse([cx - 19, cy - 19, cx + 19, cy + 19], outline="#34d399", width=3)
        d.text((cx, cy), "Rp", fill="#34d399", font=load_font("segoeuib.ttf", 19), anchor="mm")
    elif kind == "moon":
        d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill="#93c5fd")
        d.ellipse([cx - 6, cy - 20, cx + 22, cy + 8], fill="#131c24")


def render_scene_1(d, lt):
    draw_pill(d, "STOP RIBET CATAT KEUANGAN", 120)
    draw_title(d, ["Uang Habis Ke Mana?", "Struk Numpuk Males Nyatet?"], 285)

    # Immediate lively motion from frame 0
    if lt <= 2.6:
        for i in range(4):
            ang = lt * 2.0 + i * (math.pi / 2)
            rx = int(W // 2 + math.cos(ang) * 290)
            ry = int(795 + math.sin(ang * 1.4) * 110)
            d.rounded_rectangle([rx - 62, ry - 80, rx + 62, ry + 80], radius=14, fill="#f8fafc")
            d.text((rx, ry + 10), "Rp ???", fill="#ef4444", font=F_BUBBLE, anchor="mm")
        draw_user(d, W // 2, 790, 1.5, "stressed", lt + 0.4, "#1e293b", "#dc2626", False)
        draw_bubble(d, W // 2, 500, 460, 74, "Aduh, ribet ngetik satu-satu!", "#fee2e2", "#991b1b")
    else:
        draw_user(d, W // 2, 790, 1.55, "photo", lt, "#1e293b", "#0d9488", False)
        draw_bubble(d, W // 2, 500, 500, 78, "Cukup FOTO, langsung tercatat!", "#ccfbf1", "#0f766e")

    slide = int((1.0 - ease_out(lt / 0.9)) * 80)
    d.rounded_rectangle([90, 1210 + slide, 990, 1520 + slide], radius=32, fill="#131c24", outline="#14b8a6", width=3)
    draw_title(d, ["Kenalin: CatatStruk"], 1300 + slide, "#5eead4", F_TITLE)
    draw_title(d, ["Foto struk belanja pakai kamera HP,", "AI ekstrak semua datanya dalam 3 detik!"], 1405 + slide, "#e2e8f0", F_SUB, 46)


def render_scene_2(d, lt):
    draw_pill(d, "1. FOTO STRUK  ->  OTOMATIS RAPI", 110)
    draw_title(d, ["Tinggal Jepret,", "AI yang Kerja!"], 265)
    draw_user(d, 175, 860, 1.05, "photo", lt, "#1e293b", "#0f766e", False)

    px, py, pw, ph = 340, 460, 640, 1190
    d.rounded_rectangle([px, py, px + pw, py + ph], radius=48, fill="#131c24", outline="#334155", width=7)
    d.rounded_rectangle([px + 45, py + 65, px + pw - 45, py + 515], radius=20, fill="#fafaf9")
    d.text((px + pw // 2, py + 125), "INDOMARET POINT", fill="#0f172a", font=F_MONO_B, anchor="mm")
    d.text((px + pw // 2, py + 205), "Air Mineral x2   Rp 12.000", fill="#475569", font=F_MONO, anchor="mm")
    d.text((px + pw // 2, py + 255), "Roti Gandum x1   Rp 19.000", fill="#475569", font=F_MONO, anchor="mm")
    d.text((px + pw // 2, py + 305), "Sabun Cair x1    Rp 29.500", fill="#475569", font=F_MONO, anchor="mm")
    d.text((px + pw // 2, py + 415), "TOTAL: Rp 60.500", fill="#0f766e", font=F_MONO_B, anchor="mm")

    laser_y = int(py + 85 + ((math.sin(lt * 4.5) + 1) / 2) * 410)
    d.line([px + 50, laser_y, px + pw - 50, laser_y], fill="#34d399", width=5)

    if lt > 0.7:
        d.rounded_rectangle([px + 38, py + 550, px + pw - 38, py + 1130], radius=28, fill="#0f766e")
        rows = [
            "Toko: Indomaret Point",
            "Tanggal: 26 Nov 2026",
            "Kategori: Belanja",
            "Metode: QRIS (Anti-Minus)",
            "Item & Harga: 3 baris terpisah",
        ]
        for i, r in enumerate(rows):
            ry = py + 635 + i * 74
            draw_check(d, px + 84, ry + 14)
            d.text((px + 112, ry), r, fill="#ffffff", font=F_CARD_B)
        d.text((px + 72, py + 1020), "Total: Rp 60.500", fill="#a7f3d0", font=F_CARD_H)


def render_scene_3(d, lt):
    draw_pill(d, "2. NYAMAN UNTUK SEMUA USIA", 110)
    draw_title(d, ["Orang Tua Juga", "Langsung Bisa Pakai!"], 265)

    draw_user(d, 300, 610, 1.15, "happy", lt, "#94a3b8", "#0f766e", True)
    draw_bubble(d, 300, 405, 360, 68, "Tulisannya besar & jelas!", "#fef3c7", "#92400e")

    draw_user(d, 780, 610, 1.15, "happy", lt + 1.0, "#1e293b", "#2563eb", False)
    draw_bubble(d, 780, 405, 360, 68, "Super ringan di HP!", "#dbeafe", "#1e40af")

    features = [
        ("phone", "Menu Bawah Ramah Jempol", "Tombol besar & label teks jelas, mudah ditekan."),
        ("bolt", "Super Ringan (~67 KB)", "Buka langsung di browser/HP tanpa install berat."),
        ("rp", "Format Rupiah & Anti-Minus", "Angka rapi otomatis, item & harga terpisah."),
        ("moon", "Mode Terang & Gelap", "Nyaman di mata siang maupun malam hari."),
    ]
    for i, (icon_kind, title, desc) in enumerate(features):
        if lt < i * 0.45:
            continue
        p = ease_out((lt - i * 0.45) / 0.55)
        y = 860 + i * 205 + int((1.0 - p) * 35)
        d.rounded_rectangle([85, y, 995, y + 175], radius=28, fill="#131c24", outline="#24323f", width=3)
        draw_feature_icon(d, 155, y + 88, icon_kind)
        d.text((215, y + 48), title, fill="#5eead4", font=F_CARD_H)
        d.text((215, y + 104), desc, fill="#cbd5e1", font=F_CARD_B)


def render_scene_4(d, lt):
    draw_pill(d, "3. GOOGLE SHEET PRIBADI (2-ARAH)", 110)
    draw_title(d, ["Connect, Export &", "Import Google Sheet!"], 265)

    d.rounded_rectangle([95, 490, 355, 670], radius=28, fill="#0f766e")
    d.text((225, 558), "HP Kamu", fill="#ffffff", font=F_BUBBLE, anchor="mm")
    d.text((225, 612), "CatatStruk", fill="#ccfbf1", font=F_CARD_B, anchor="mm")

    d.rounded_rectangle([410, 490, 670, 670], radius=28, fill="#15803d")
    d.text((540, 558), "Google Sheet", fill="#ffffff", font=F_BUBBLE, anchor="mm")
    d.text((540, 612), "Akun Pribadi", fill="#dcfce7", font=F_CARD_B, anchor="mm")

    d.rounded_rectangle([725, 490, 985, 670], radius=28, fill="#1e293b", outline="#38bdf8", width=3)
    d.text((855, 558), "Laptop / HP Baru", fill="#ffffff", font=F_BUBBLE, anchor="mm")
    d.text((855, 612), "Import Data", fill="#bae6fd", font=F_CARD_B, anchor="mm")

    for i in range(3):
        prog = (lt * 1.3 + i * 0.33) % 1.0
        dx1 = int(360 + prog * 45)
        dx2 = int(675 + prog * 45)
        d.ellipse([dx1 - 7, 573, dx1 + 7, 587], fill="#34d399")
        d.ellipse([dx2 - 7, 573, dx2 + 7, 587], fill="#34d399")

    d.rounded_rectangle([90, 740, 990, 1120], radius=34, fill="#0f766e")
    d.rounded_rectangle([140, 795, 188, 843], radius=12, fill=(255, 255, 255, 45))
    d.text((164, 819), "^", fill="#ffffff", font=F_CARD_H, anchor="mm")
    d.text((208, 800), "EXPORT KE GOOGLE SHEET", fill="#ffffff", font=F_CARD_H)
    d.text((145, 885), "• Otomatis kirim setiap selesai foto struk.", fill="#ccfbf1", font=F_CARD_B)
    d.text((145, 945), "• Kolom rapi: Tanggal, Toko, Item, Total, Bayar.", fill="#ccfbf1", font=F_CARD_B)
    d.text((145, 1005), "• 100% gratis pakai Google Apps Script pribadi.", fill="#ccfbf1", font=F_CARD_B)

    if lt > 0.5:
        d.rounded_rectangle([90, 1180, 990, 1560], radius=34, fill="#131c24", outline="#14b8a6", width=4)
        d.rounded_rectangle([140, 1235, 188, 1283], radius=12, fill=(20, 184, 166, 45))
        d.text((164, 1259), "v", fill="#5eead4", font=F_CARD_H, anchor="mm")
        d.text((208, 1240), "IMPORT DARI GOOGLE SHEET", fill="#5eead4", font=F_CARD_H)
        d.text((145, 1325), "• Ganti HP atau hapus cache? Data tetap aman!", fill="#e2e8f0", font=F_CARD_B)
        d.text((145, 1385), "• Tarik semua riwayat dari Sheet dalam 1 klik.", fill="#e2e8f0", font=F_CARD_B)
        d.text((145, 1445), "• Anti duplikat & langsung masuk grafik bulanan.", fill="#e2e8f0", font=F_CARD_B)


def render_scene_5(d, lt):
    draw_pill(d, "GRATIS  •  RINGAN  •  PRIVAT", 130)
    draw_user(d, W // 2, 470, 1.45, "happy", lt, "#1e293b", "#0d9488", False)
    draw_bubble(d, W // 2, 230, 520, 78, "Keuangan rapi tanpa pusing!", "#ccfbf1", "#0f766e")

    draw_title(d, ["CatatStruk"], 830, "#ffffff", F_HERO)
    draw_title(d, ["Foto Struk • AI Scanner • Format Rupiah", "Export & Import Google Sheet Pribadi"], 940, "#5eead4", F_SUB, 48)

    d.rounded_rectangle([150, 1140, 930, 1285], radius=72, fill="#ffffff")
    d.text((W // 2, 1212), "Cobain Gratis Sekarang!", fill="#0f172a", font=F_CARD_H, anchor="mm")
    d.text((W // 2, 1385), "Bagikan ke keluarga & teman biar makin hemat!", fill="#94a3b8", font=F_SUB, anchor="mm")


def main():
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(OUT_PATH, fourcc, FPS, (W, H))
    if not writer.isOpened():
        raise RuntimeError("Failed to open MP4 VideoWriter")

    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / FPS
        img = BASE_BG.copy()
        d = ImageDraw.Draw(img, "RGBA")

        if t < 5.5:
            lt = t
            render_scene_1(d, lt)
        elif t < 12.0:
            lt = t - 5.5
            render_scene_2(d, lt)
        elif t < 18.5:
            lt = t - 12.0
            render_scene_3(d, lt)
        elif t < 25.0:
            lt = t - 18.5
            render_scene_4(d, lt)
        else:
            lt = t - 25.0
            render_scene_5(d, lt)

        # Gentle cross-fade transition at scene boundaries (0.45s)
        if lt < 0.45 and t > 0.5:
            alpha = int((1.0 - lt / 0.45) * 165)
            d.rectangle([0, 0, W, H], fill=(7, 19, 24, alpha))

        d.rectangle([80, H - 70, W - 80, H - 60], fill="#1e293b")
        d.rectangle([80, H - 70, 80 + int((W - 160) * clamp(t / DURATION)), H - 60], fill="#14b8a6")

        bgr = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
        writer.write(bgr)

    writer.release()
    print("MP4 generated:", OUT_PATH, os.path.getsize(OUT_PATH), "bytes")


if __name__ == "__main__":
    main()
