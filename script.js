const bloodPanels = {
  // Neue Blutbilder können hier ergänzt werden (Struktur beibehalten)
  // Beispiel: "Neues Profil": { parameterKey: { label: "Parameter", description: "Kurzer Satz", reference: { male: { min, max }, female: { min, max } } } }
  "Großes Blutbild": {
    hemoglobin: {
      label: "Hämoglobin (g/dl)",
      description: "Transportiert Sauerstoff zu Organen und Gewebe.",
      reference: {
        male: { min: 13.8, max: 17.2 },
        female: { min: 12.1, max: 15.1 },
      },
    },
    leukocytes: {
      label: "Leukozyten (10^9/l)",
      description: "Wichtiger Marker für Immunaktivität.",
      reference: {
        male: { min: 4.0, max: 10.0 },
        female: { min: 4.0, max: 10.0 },
      },
    },
    platelets: {
      label: "Thrombozyten (10^9/l)",
      description: "Essentiell für die Blutgerinnung.",
      reference: {
        male: { min: 150, max: 400 },
        female: { min: 150, max: 400 },
      },
    },
  },
  "Hormonlabor": {
    tsh: {
      label: "TSH (mIU/l)",
      description: "Steuert die Schilddrüsenhormonproduktion.",
      reference: {
        male: { min: 0.4, max: 4.0 },
        female: { min: 0.4, max: 4.0 },
      },
    },
    cortisol: {
      label: "Cortisol morgens (µg/dl)",
      description: "Reguliert Stoffwechsel und Stressreaktion.",
      reference: {
        male: { min: 6.0, max: 18.0 },
        female: { min: 6.0, max: 18.0 },
      },
    },
  },
  "Kleines Blutbild": {
    erythrocytes: {
      label: "Erythrozyten (10^12/l)",
      description: "Transportieren Sauerstoff zu den Zellen.",
      reference: {
        male: { min: 4.3, max: 5.9 },
        female: { min: 3.5, max: 5.5 },
      },
    },
    hematocrit: {
      label: "Hämatokrit (%)",
      description: "Anteil der Zellen am Blutvolumen.",
      reference: {
        male: { min: 40, max: 52 },
        female: { min: 36, max: 48 },
      },
    },
  },
};

// Farben für zu hoch / normal / zu niedrig können hier angepasst werden
const statusColors = {
  low: { label: "Zu niedrig", color: "#80b8ff" },
  normal: { label: "Normal", color: "#5ad1a7" },
  high: { label: "Zu hoch", color: "#c75050" },
};

const genderSelect = document.getElementById("gender");
const panelSelect = document.getElementById("panelSelect");
const inputsContainer = document.getElementById("inputs");
const resultsContainer = document.getElementById("results");
const analyzeBtn = document.getElementById("analyzeBtn");
const downloadBtn = document.getElementById("downloadPdf");
const resetBtn = document.getElementById("resetForm");
let chartInstance;

function initPanelOptions() {
  if (!panelSelect) return;
  Object.keys(bloodPanels).forEach((panel) => {
    const option = document.createElement("option");
    option.value = panel;
    option.textContent = panel;
    panelSelect.appendChild(option);
  });
}

function renderInputs() {
  if (!inputsContainer) return;
  inputsContainer.innerHTML = "";
  const panel = bloodPanels[panelSelect.value];

  Object.keys(panel).forEach((key) => {
    const field = document.createElement("label");
    field.className = "field";
    field.innerHTML = `
      <span>${panel[key].label}</span>
      <input type="number" step="any" data-key="${key}" placeholder="Wert eintragen">
      <small class="hint">Referenzwerte für ${panelSelect.value} können hier im Objekt <code>bloodPanels</code> angepasst werden.</small>
    `;
    inputsContainer.appendChild(field);
  });
}

function evaluateValue(value, min, max) {
  if (value < min) return "low";
  if (value > max) return "high";
  return "normal";
}

function analyze() {
  if (!resultsContainer) return;
  const gender = genderSelect.value;
  const panelKey = panelSelect.value;
  const panel = bloodPanels[panelKey];
  const results = [];

  Object.keys(panel).forEach((key) => {
    const input = inputsContainer.querySelector(`input[data-key="${key}"]`);
    const raw = input.value.trim();
    const numeric = raw === "" ? null : Number(raw);
    const ref = panel[key].reference[gender];
    const status = numeric === null || Number.isNaN(numeric)
      ? null
      : evaluateValue(numeric, ref.min, ref.max);

    results.push({
      key,
      label: panel[key].label,
      description: panel[key].description,
      value: numeric,
      reference: ref,
      status,
    });
  });

  renderResults(results);
  drawChart(results);
  return results;
}

function renderResults(results) {
  resultsContainer.innerHTML = "";
  results.forEach((result) => {
    const card = document.createElement("div");
    card.className = "result-card";
    const statusClass = result.status ? `status ${result.status}` : "status";
    const statusLabel = result.status ? statusColors[result.status].label : "Kein Wert";
    const statusColor = result.status ? statusColors[result.status].color : "#8b95ad";

    card.innerHTML = `
      <div class="status ${result.status || ''}" style="color:${statusColor}">${statusLabel}</div>
      <strong>${result.label}</strong>
      <div class="range">Referenz: ${result.reference.min} – ${result.reference.max}</div>
      <div class="note">${result.description}</div>
      <div class="note">Eingabe: ${result.value !== null && !Number.isNaN(result.value) ? result.value : 'Noch kein Wert'}</div>
    `;
    resultsContainer.appendChild(card);
  });
}

function drawChart(results) {
  const ctx = document.getElementById("pieChart");
  if (!ctx) return;

  const counts = { low: 0, normal: 0, high: 0 };
  results.forEach((res) => {
    if (res.status) counts[res.status] += 1;
  });

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Zu niedrig", "Normal", "Zu hoch"],
      datasets: [
        {
          data: [counts.low, counts.normal, counts.high],
          backgroundColor: ["#80b8ff", "#5ad1a7", "#c75050"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#e7edf7",
            font: { family: "Manrope", weight: "700" },
          },
        },
      },
    },
  });
}

function downloadPdf(results) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const date = new Date().toLocaleString("de-DE");

  doc.setFontSize(16);
  doc.text("BloodCheck Auswertung", 14, 20);
  doc.setFontSize(10);
  doc.text(`Datum: ${date}`, 14, 28);
  doc.text(`Geschlecht: ${genderSelect.value}`, 14, 34);
  doc.text(`Blutbild: ${panelSelect.value}`, 14, 40);

  let y = 52;
  results.forEach((res) => {
    doc.setFont(undefined, "bold");
    doc.text(res.label, 14, y);
    doc.setFont(undefined, "normal");
    const valueText = res.value !== null && !Number.isNaN(res.value) ? res.value : "Kein Wert";
    doc.text(`Eingabe: ${valueText}`, 14, y + 6);
    doc.text(`Referenz: ${res.reference.min} - ${res.reference.max}`, 14, y + 12);
    doc.text(`Status: ${res.status ? statusColors[res.status].label : "Keine Angabe"}`, 14, y + 18);
    doc.text(res.description, 14, y + 24, { maxWidth: 180 });
    y += 34;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`BloodCheck_${date.replace(/\s|\.|:/g, "-")}.pdf`);
}

function resetForm() {
  document.querySelectorAll("input[type='number']").forEach((input) => {
    input.value = "";
  });
  analyze();
}

function init() {
  if (!panelSelect) return;
  initPanelOptions();
  renderInputs();
  analyze();

  panelSelect.addEventListener("change", () => {
    renderInputs();
    analyze();
  });

  genderSelect?.addEventListener("change", analyze);
  analyzeBtn?.addEventListener("click", analyze);
  resetBtn?.addEventListener("click", resetForm);
  downloadBtn?.addEventListener("click", () => {
    const results = analyze();
    downloadPdf(results);
  });
}

document.addEventListener("DOMContentLoaded", init);
