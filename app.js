// =============================================
// BASEMAP OSM
// =============================================
const osmLayer = new ol.layer.Tile({
  source: new ol.source.OSM(),
  visible: true,
});

// =============================================
// BASEMAP SATELIT
// =============================================
const satelliteLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
  }),
  visible: false,
});

// =============================================
// BASEMAP MINIMALIS (CartoDB)
// =============================================
const minimalisLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    attributions: '© <a href="https://carto.com/">CARTO</a>',
  }),
  visible: false,
});

// =============================================
// MAP
// =============================================
const map = new ol.Map({
  target: "map",
  layers: [osmLayer, minimalisLayer, satelliteLayer],
  view: new ol.View({
    center: ol.proj.fromLonLat([110.3695, -7.7956]),
    zoom: 12,
  }),
  controls: ol.control.defaults.defaults({
    zoom: true,
    attribution: true,
    rotate: false,
  }),
});

// =============================================
// BASEMAP SWITCHER — 3 PILIHAN
// =============================================
const basemapMap = {
  osm: osmLayer,
  minimalis: minimalisLayer,
  satelit: satelliteLayer,
};

document.querySelectorAll(".basemap-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    const selected = this.dataset.basemap;
    // Sembunyikan semua basemap
    Object.values(basemapMap).forEach((l) => l.setVisible(false));
    // Tampilkan yang dipilih
    basemapMap[selected].setVisible(true);
    // Update tombol aktif
    document.querySelectorAll(".basemap-btn").forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
  });
});

// =============================================
// WMS LAYER 1 — Batas Administrasi Indonesia (BNPB)
// =============================================
const wmsLayer = new ol.layer.Tile({
  source: new ol.source.TileWMS({
    url: "https://geoserver.bnpb.go.id/geoserver/bnpb/wms",
    params: {
      LAYERS: "bnpb:batas_kab_kota_desil_ina",
      TILED: true,
      FORMAT: "image/png",
      TRANSPARENT: true,
    },
    serverType: "geoserver",
    crossOrigin: "anonymous",
  }),
  visible: false,
  opacity: 0.55,
});
map.addLayer(wmsLayer);

// =============================================
// WMS LAYER 2 — Natural Earth (citra raster bumi)
// =============================================
const wmsNaturalEarth = new ol.layer.Tile({
  source: new ol.source.TileWMS({
    url: "https://ahocevar.com/geoserver/wms",
    params: {
      LAYERS: "ne:NE1_HR_LC_SR_W_DR",
      TILED: true,
    },
    serverType: "geoserver",
  }),
  visible: false,
  opacity: 0.6,
});
map.addLayer(wmsNaturalEarth);

// =============================================
// VECTOR SOURCE
// =============================================
const markerSource = new ol.source.Vector();

// =============================================
// KATEGORI CONFIG
// =============================================
const kategoriConfig = {
  wisata: { color: "#e53935", emoji: "🏛️", label: "Wisata" },
  universitas: { color: "#43a047", emoji: "🎓", label: "Universitas" },
  perbelanjaan: { color: "#fb8c00", emoji: "🛍️", label: "Perbelanjaan" },
  transportasi: { color: "#8e24aa", emoji: "🚌", label: "Transportasi" },
  penginapan: { color: "#1e88e5", emoji: "🏨", label: "Penginapan" },
};

// =============================================
// EMOJI MARKER — CANVAS
// =============================================
const emojiCanvasCache = {};

function makeEmojiCanvas(emoji, color, size = 36) {
  const key = `${emoji}-${color}-${size}`;
  if (emojiCanvasCache[key]) return emojiCanvasCache[key];

  const canvas = document.createElement("canvas");
  canvas.width = size + 8;
  canvas.height = size + 14; // extra bawah untuk "ekor" pin
  const ctx = canvas.getContext("2d");

  const cx = (size + 8) / 2;
  const cy = size / 2 + 2;
  const r = size / 2;

  // Lingkaran background berwarna
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Border putih
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "white";
  ctx.stroke();

  // Ekor pin segitiga kecil
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + r - 2);
  ctx.lineTo(cx + 5, cy + r - 2);
  ctx.lineTo(cx, cy + r + 8);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Emoji di tengah
  ctx.font = `${size * 0.5}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, cx, cy);

  emojiCanvasCache[key] = canvas;
  return canvas;
}

function emojiStyle(emoji, color, selected = false) {
  const size = selected ? 44 : 34;
  const canvas = makeEmojiCanvas(emoji, color, size);
  return new ol.style.Style({
    image: new ol.style.Icon({
      img: canvas,
      imgSize: [canvas.width, canvas.height],
      anchor: [0.5, 1],
      anchorXUnits: "fraction",
      anchorYUnits: "fraction",
    }),
    zIndex: selected ? 999 : 1,
  });
}

// =============================================
// GET STYLE BERDASARKAN KATEGORI
// =============================================
function getKategoriKey(kategori) {
  if (!kategori) return null;
  const k = kategori.toLowerCase();
  for (const key of Object.keys(kategoriConfig)) {
    if (k.includes(key)) return key;
  }
  return null;
}

function getColorByKategori(kategori) {
  const key = getKategoriKey(kategori);
  return key ? kategoriConfig[key].color : "#e91e63";
}

function getEmojiByKategori(kategori) {
  const key = getKategoriKey(kategori);
  return key ? kategoriConfig[key].emoji : "📍";
}

function getStyle(feature) {
  const kat = feature.get("kategori");
  return emojiStyle(getEmojiByKategori(kat), getColorByKategori(kat));
}

// =============================================
// VECTOR LAYER
// =============================================
const markerLayer = new ol.layer.Vector({
  source: markerSource,
  style: getStyle,
});
map.addLayer(markerLayer);

// =============================================
// CSV GOOGLE SHEETS
// =============================================
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSkqlTGfsfreLJ2v6EnSg2lg0va75TgGYhLtIldwwC683YOtsbVU-yLvKRdYfZKdI9j-0SvqxCfKccS/pub?output=csv";

let allFeatures = [];
let activeCategory = "all";

// =============================================
// LOAD CSV
// =============================================
fetch(csvUrl)
  .then((r) => r.text())
  .then((data) => {
    const rows = data.trim().split("\n");
    rows.slice(1).forEach((row) => {
      const cols = row.split(",");
      const nama = cols[0]?.trim();
      const lon = parseFloat(cols[1]);
      const lat = parseFloat(cols[2]);
      const kategori = cols[3]?.trim().toLowerCase();
      const deskripsi = cols[4]?.trim();

      if (isNaN(lon) || isNaN(lat)) return;

      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        nama,
        kategori,
        deskripsi,
      });
      allFeatures.push(feature);
      markerSource.addFeature(feature);
    });

    updateCount();
  })
  .catch(() => {
    // Fallback sample data jika CSV gagal dimuat
    const samples = [
      { nama: "Keraton Yogyakarta", lon: 110.3643, lat: -7.8052, kategori: "wisata", deskripsi: "Istana kerajaan Kasultanan Ngayogyakarta Hadiningrat." },
      { nama: "UGM", lon: 110.3782, lat: -7.7714, kategori: "universitas", deskripsi: "Universitas Gadjah Mada, salah satu universitas terbaik Indonesia." },
      { nama: "Malioboro", lon: 110.3641, lat: -7.7928, kategori: "perbelanjaan", deskripsi: "Pusat perbelanjaan dan wisata ikonik di Yogyakarta." },
      { nama: "Stasiun Tugu", lon: 110.3617, lat: -7.7889, kategori: "transportasi", deskripsi: "Stasiun utama Yogyakarta, pintu gerbang kota." },
      { nama: "Hotel Mutiara", lon: 110.37, lat: -7.795, kategori: "penginapan", deskripsi: "Hotel bersejarah di pusat kota Yogyakarta." },
      { nama: "Candi Borobudur", lon: 110.2038, lat: -7.6079, kategori: "wisata", deskripsi: "Candi Buddha terbesar di dunia, Warisan UNESCO." },
      { nama: "UNY", lon: 110.3861, lat: -7.7719, kategori: "universitas", deskripsi: "Universitas Negeri Yogyakarta." },
      { nama: "Ambarrukmo Plaza", lon: 110.3975, lat: -7.7856, kategori: "perbelanjaan", deskripsi: "Pusat perbelanjaan modern terbesar di Yogyakarta." },
      { nama: "Terminal Giwangan", lon: 110.3897, lat: -7.8284, kategori: "transportasi", deskripsi: "Terminal bus utama Yogyakarta." },
      { nama: "Prambanan", lon: 110.4913, lat: -7.7519, kategori: "wisata", deskripsi: "Kompleks candi Hindu terbesar di Indonesia." },
    ];
    samples.forEach(({ nama, lon, lat, kategori, deskripsi }) => {
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lon, lat])),
        nama,
        kategori,
        deskripsi,
      });
      allFeatures.push(feature);
      markerSource.addFeature(feature);
    });
    updateCount();
  });

// =============================================
// UPDATE COUNT BADGE
// =============================================
function updateCount() {
  let count = 0;
  allFeatures.forEach((f) => {
    const k = f.get("kategori") || "";
    if (activeCategory === "all" || k.includes(activeCategory)) count++;
  });
  document.getElementById("visible-count").textContent = count;
}

// =============================================
// FILTER — INTERACTIVE
// =============================================
document.querySelectorAll(".filter-btn").forEach((button) => {
  button.addEventListener("click", function () {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    this.classList.add("active");

    activeCategory = this.dataset.cat;
    closePopup();

    markerLayer.setStyle(function (feature) {
      const k = feature.get("kategori") || "";
      if (activeCategory === "all" || k.includes(activeCategory)) {
        return getStyle(feature);
      }
      return null;
    });

    updateCount();
  });
});

// =============================================
// POPUP OVERLAY
// =============================================
const popupElement = document.createElement("div");
popupElement.className = "ol-popup";

const popup = new ol.Overlay({
  element: popupElement,
  positioning: "bottom-center",
  stopEvent: true,
  offset: [0, -14],
});
map.addOverlay(popup);

function closePopup() {
  popup.setPosition(undefined);
  if (selectedFeature) {
    selectedFeature.setStyle(getStyle(selectedFeature));
    selectedFeature = null;
  }
}

let selectedFeature = null;

// =============================================
// HOVER — HIGHLIGHT
// =============================================
map.on("pointermove", function (evt) {
  const hit = map.hasFeatureAtPixel(evt.pixel);
  map.getTargetElement().style.cursor = hit ? "pointer" : "";
});

// =============================================
// CLICK MARKER — POPUP
// =============================================
map.on("singleclick", function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f);

  // Klik di luar marker — tutup popup
  if (!feature) {
    closePopup();
    return;
  }

  // Reset style marker sebelumnya
  if (selectedFeature && selectedFeature !== feature) {
    selectedFeature.setStyle(getStyle(selectedFeature));
  }

  selectedFeature = feature;
  const kat = feature.get("kategori");
  const color = getColorByKategori(kat);
  const emoji = getEmojiByKategori(kat);
  feature.setStyle(emojiStyle(emoji, color, true));

  const coordinates = feature.getGeometry().getCoordinates();
  popup.setPosition(coordinates);

  const key = getKategoriKey(feature.get("kategori"));
  const config = key ? kategoriConfig[key] : { emoji: "📍", label: feature.get("kategori") || "" };

  popupElement.innerHTML = `
    <div class="popup-header" style="position:relative">
      <div class="popup-name">${feature.get("nama") || "-"}</div>
      <div class="popup-kategori">
        <span>${config.emoji}</span>
        <span style="text-transform:capitalize">${config.label}</span>
      </div>
      <button class="popup-close" title="Tutup">✕</button>
    </div>
    <div class="popup-body">
      ${feature.get("deskripsi") || "Tidak ada deskripsi."}
    </div>
  `;

  popupElement.querySelector(".popup-close").addEventListener("click", closePopup);
});
