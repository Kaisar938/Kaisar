// ============================================
// KaisarStore — Server + Telegram Bot
// Jalankan: node server.js
// ============================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

// ─── KONFIGURASI ────────────────────────────
const BOT_TOKEN = "8633268323:AAHpTJSlWDTQDaolSzrhdm9MlCZBNQM_FNI"; // dari @BotFather
const ADMIN_ID  = "7842003730";   // ID Telegram kamu (angka)
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "harga.json");
// ────────────────────────────────────────────

// Baca / buat file harga
function readHarga() {
  if (!fs.existsSync(DATA_FILE)) {
    const def = { rate: 105, rate_coret: 112, maintenance: false };
    fs.writeFileSync(DATA_FILE, JSON.stringify(def, null, 2));
    return def;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveHarga(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ─── HTTP SERVER (API) ───────────────────────
const server = http.createServer((req, res) => {
  // CORS agar index.html bisa fetch
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/harga" && req.method === "GET") {
    res.writeHead(200);
    res.end(JSON.stringify(readHarga()));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`✅ API berjalan di http://localhost:${PORT}/harga`);
});

// ─── TELEGRAM BOT (Long Polling) ─────────────
let lastUpdateId = 0;

function telegramRequest(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sendMsg(chatId, text) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  });
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  // Cek apakah pengirim adalah admin
  if (chatId !== String(ADMIN_ID)) {
    await sendMsg(chatId, "❌ Kamu tidak punya akses.");
    return;
  }

  const harga = readHarga();

  // ── /start ──
  if (text === "/start" || text === "/help") {
    await sendMsg(chatId,
      `*KaisarStore Bot* 🛡️\n\n` +
      `Perintah yang tersedia:\n\n` +
      `*/setharga [angka]* — Ubah rate harga\nContoh: \`/setharga 110\`\n\n` +
      `*/setcoret [angka]* — Ubah harga dicoret\nContoh: \`/setcoret 115\`\n\n` +
      `*/maintenance on* — Aktifkan maintenance\n` +
      `*/maintenance off* — Matikan maintenance\n\n` +
      `*/cek* — Lihat harga & status sekarang`
    );
    return;
  }

  // ── /cek ──
  if (text === "/cek") {
    await sendMsg(chatId,
      `📊 *Status KaisarStore*\n\n` +
      `Rate: *Rp ${harga.rate} / Robux*\n` +
      `Harga coret: *Rp ${harga.rate_coret} / Robux*\n` +
      `Maintenance: *${harga.maintenance ? "🔴 ON" : "🟢 OFF"}*`
    );
    return;
  }

  // ── /setharga ──
  if (text.startsWith("/setharga")) {
    const args = text.split(" ");
    const angka = parseInt(args[1]);
    if (!angka || angka < 1 || angka > 99999) {
      await sendMsg(chatId, "❌ Format salah. Contoh: `/setharga 110`");
      return;
    }
    harga.rate = angka;
    saveHarga(harga);
    await sendMsg(chatId, `✅ Rate berhasil diubah ke *Rp ${angka} / Robux*`);
    return;
  }

  // ── /setcoret ──
  if (text.startsWith("/setcoret")) {
    const args = text.split(" ");
    const angka = parseInt(args[1]);
    if (!angka || angka < 1 || angka > 99999) {
      await sendMsg(chatId, "❌ Format salah. Contoh: `/setcoret 115`");
      return;
    }
    harga.rate_coret = angka;
    saveHarga(harga);
    await sendMsg(chatId, `✅ Harga coret berhasil diubah ke *Rp ${angka} / Robux*`);
    return;
  }

  // ── /maintenance ──
  if (text.startsWith("/maintenance")) {
    const args = text.split(" ");
    if (args[1] === "on") {
      harga.maintenance = true;
      saveHarga(harga);
      await sendMsg(chatId, "🔴 Maintenance *diaktifkan*. Website tampil overlay.");
      return;
    }
    if (args[1] === "off") {
      harga.maintenance = false;
      saveHarga(harga);
      await sendMsg(chatId, "🟢 Maintenance *dimatikan*. Website normal.");
      return;
    }
    await sendMsg(chatId, "❌ Gunakan: `/maintenance on` atau `/maintenance off`");
    return;
  }

  await sendMsg(chatId, "❓ Perintah tidak dikenal. Ketik /help untuk bantuan.");
}

async function polling() {
  try {
    const res = await telegramRequest("getUpdates", {
      offset: lastUpdateId + 1,
      timeout: 30,
    });
    if (res.ok && res.result.length > 0) {
      for (const update of res.result) {
        lastUpdateId = update.update_id;
        await handleUpdate(update);
      }
    }
  } catch (e) {
    console.error("Polling error:", e.message);
  }
  setTimeout(polling, 1000);
}

// Mulai polling setelah 2 detik
setTimeout(() => {
  console.log("🤖 Bot Telegram aktif...");
  polling();
}, 2000);