const RATE = 140;

// ===== KOTAK 1 : SET GAMEPASS =====
function beforeTax() {
  const robux = parseFloat(document.getElementById("robuxGamepass").value);
  if (!robux || robux <= 0) {
    document.getElementById("hasilGamepass").innerText =
      "Masukkan jumlah robux yang valid";
    return;
  }

  const hasil = Math.floor(robux * 0.7);
  document.getElementById("hasilGamepass").innerText =
    `Before Tax: ${hasil} Robux`;
}

function afterTax() {
  const robux = parseFloat(document.getElementById("robuxGamepass").value);
  if (!robux || robux <= 0) {
    document.getElementById("hasilGamepass").innerText =
      "Masukkan jumlah robux yang valid";
    return;
  }

  const hasil = Math.ceil(robux / 0.7);
  document.getElementById("hasilGamepass").innerText =
    `After Tax: ${hasil} Robux (dapat ${robux})`;
}

// ===== KOTAK 2 : HITUNG DARI HARGA =====
document.getElementById("harga").addEventListener("input", () => {
  const harga = parseFloat(document.getElementById("harga").value);
  if (!harga || harga <= 0) {
    document.getElementById("hasilHarga").innerText =
      "Masukkan nominal yang valid";
    return;
  }

  const robux = Math.floor(harga / RATE);
  const afterTax = Math.ceil(robux / 0.7);

  document.getElementById("hasilHarga").innerText =
    `Robux: ${robux} | After Tax: ${afterTax}`;
});
