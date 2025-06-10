
// ===============================
// DOM-Elemente selektieren
// ===============================


const kalenderContainer = document.getElementById("kalender");
const jahrUeberschrift = document.getElementById("kalenderjahr");

const burger = document.getElementById("burger");
const overlay = document.getElementById("overlayTopbar");
const jahrSelect = document.getElementById("jahrwahl");
const resetBtn = document.getElementById("zuruecksetzen");

const popup = document.getElementById("feiertagPopup");
const popupText = document.getElementById("popupText");
const popupClose = document.getElementById("popupClose");

const darkToggle = document.getElementById("darkToggle");


// ===============================
// Darkmode bei Seitenstart aktivieren (aus localStorage)
// ===============================


// Darkmode beim Laden aus localStorage wiederherstellen
const gespeicherterDarkmode = localStorage.getItem("darkMode");
if (gespeicherterDarkmode === "true") {
  document.body.classList.add("dark");
  darkToggle.textContent = "☼";
} else {
  darkToggle.textContent = "☽";
}

// ===============================
// Konstanten definieren
// ===============================

const AKTUELLES_JAHR = new Date().getFullYear();

const monate = [
  "Januar", "Februar", "März", "April",
  "Mai", "Juni", "Juli", "August",
  "September", "Oktober", "November", "Dezember"
];

const emojiZuFeiertag = {
    "Neujahr": "🎆",
    "Tag der Arbeit": "🛠️",
    "Tag der Deutschen Einheit": "🇩🇪",
    "Reformationstag": "✝️",
    "1. Weihnachtsfeiertag": "🎄",
    "2. Weihnachtsfeiertag": "🎁",
    "Karfreitag": "🙏",
    "Ostermontag": "🐣",
    "Himmelfahrt": "☁️",
    "Pfingstmontag": "🔥",
    "Buß- und Bettag": "🙇"
};

let feiertage = [];

// ===============================
// EVENT: Darkmode Toggle
// ===============================

darkToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");

  // Icon setzen
  darkToggle.textContent = isDark ? "☼" : "☽";

  // Im localStorage speichern
  localStorage.setItem("darkMode", isDark ? "true" : "false");
});

// ===============================
// EVENT: Menü (Burger) öffnen/schließen
// ===============================

burger.addEventListener("click", () => {
  overlay.classList.toggle("active");
});

// ===============================
// EVENT: Jahr geändert → Kalender neu laden
// ===============================

jahrSelect.addEventListener("change", () => {
  const jahr = parseInt(jahrSelect.value);
  ladeFeiertage(jahr).then(() => generiereKalender(jahr));
  overlay.classList.remove("active");
});

// ===============================
// EVENT: Button „Aktuelles Jahr“ klicken
// ===============================

resetBtn.addEventListener("click", () => {
  jahrSelect.value = AKTUELLES_JAHR;
  ladeFeiertage(AKTUELLES_JAHR).then(() => generiereKalender(AKTUELLES_JAHR));
  overlay.classList.remove("active");
});

// ===============================
// EVENT: Popup-Fenster schließen
// ===============================

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

// Popup auch schließen bei Klick auf Hintergrund
popup.addEventListener("click", (e) => {
  if (e.target === popup) popup.classList.add("hidden");
});

// ===============================
// EVENT: Overlay schließen
// ===============================

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.remove("active");
});

// ===============================
// Hilfsfunktionen: Berechnen
// ===============================

// Berechnet das Datum des Ostersonntags nach der Gaußschen Osterformel
function berechneOstern(jahr) {

    // Säkularzahl
    const k = Math.floor(jahr / 100); 

    // säkulare Mondschaltung
    const m = 15 + Math.floor ((3 * k + 3 ) / 4) - Math.floor((8 * k + 13 ) / 25 );

    // säkulare Sonnenschaltung
    const s = 2 -((3 * k + 3) / 4);

    // Mondparameter
    const a = jahr % 19;

    // Keim für den 1. Vollmond im Frühling
    const d = ((19 * a + m) % 30);

    // kalendarische Korrekturgröße
    const r = (((d + a) / 11) / 29);

    // Ostergrenze
    const og = 21 + d - r;

    // erster Sonntag im März
    const sz = 7 - ((jahr + (jahr / 4) + s) % 7);

    // Entfernung des Ostersonntags von der Ostergrenze
    // (Osterentfernung in Tagen)
    const oe = 7 - ((og - sz) % 7);

    // Datum des Ostersonntags als Märzdatum
    const ostersonntag = og + oe;

    const os_monat = ostersonntag > 31 ? 3 : 2;
    const os_tag = ostersonntag > 31 ? ostersonntag - 31 : ostersonntag;

    return new Date(jahr,os_monat,os_tag)
}

// Berechnet den Buß- und Bettag (Mittwoch vor dem 23. November)
function berechneBussUndBettag(jahr) {
    const nov23 = new Date(jahr,10,23);
    const tag = nov23.getDay();
    const diff = (tag + 4) % 7;
    nov23.setDate(nov23.getDate() - diff);
    return nov23;
}

// Berechnet die Kalenderwoche nach ISO 8601
function berechneKW(datum) {
  const ziel = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()));
  const tag = ziel.getUTCDay() || 7;
  ziel.setUTCDate(ziel.getUTCDate() + 4 - tag);
  const jahrStart = new Date(Date.UTC(ziel.getUTCFullYear(), 0, 1));
  const kw = Math.ceil(((ziel - jahrStart) / 86400000 + 1) / 7);
  return kw;
}

// ===============================
// Hilfsfunktionen: Rest
// ===============================

// Füllt die Jahr-Auswahl von 2000 bis 2099 im Dropdown-Menü
function fuelleJahrliste(aktJahr) {
  jahrSelect.innerHTML = "";

  for (let j = 2000; j <= 2099; j++) {
    const option = document.createElement("option");
    option.value = j;
    option.textContent = j;
    if (j === aktJahr) option.selected = true;
    jahrSelect.appendChild(option);
  }
}

// Lädt Feiertage für das gewählte Jahr (statisch + dynamisch)
async function ladeFeiertage(jahr) {
    const response = await fetch("feiertage.json");
    const daten = await response.json();
    feiertage = [];

    //Statische Feiertage
    daten.statisch.forEach(f => {
        feiertage.push({
            name: f.name,
            tag: f.tag,
            monat: f.monat,
            jahr,
        })
    })

    //Dynamische Feiertage berechnen
    const ostersonntag = berechneOstern(jahr);

    const karfreitag = new Date(ostersonntag);
    karfreitag.setDate(karfreitag.getDate() - 2);

    const ostermontag = new Date(ostersonntag);
    ostermontag.setDate(ostermontag.getDate() + 1);

    const himmelfahrt = new Date(ostersonntag);
    himmelfahrt.setDate(himmelfahrt.getDate() + 39);

    const pfingstmontag = new Date(ostersonntag);
    pfingstmontag.setDate(pfingstmontag.getDate() + 49);

    const bussundbettag = berechneBussUndBettag(jahr);

    [
        {name: "Karfreitag", datum: karfreitag},
        {name: "Ostermontag", datum: ostermontag},
        {name: "Himmelfahrt", datum: himmelfahrt},
        {name: "Pfingstmontag", datum: pfingstmontag},
        {name: "Buß- und Bettag", datum: bussundbettag},
    ].forEach(f => {
        feiertage.push({
            name: f.name,
            tag: f.datum.getDate(),
            monat: f.datum.getMonth() + 1,
            jahr
        })
    })

}

// Prüft, ob das übergebene Datum dem heutigen Datum entspricht
function istHeute(tag, monat, jahr) {
  const heute = new Date();
  return (
    tag === heute.getDate() &&
    monat === heute.getMonth() &&
    jahr === heute.getFullYear()
  );
}

// Baut den kompletten Kalender für das gewählte Jahr auf
function generiereKalender(jahr) {
  kalenderContainer.innerHTML = "";
  jahrUeberschrift.textContent = jahr;
  document.title = "Kalender " + jahr;

  for (let monat = 0; monat < 12; monat++) {
    const anzahlTage = new Date(jahr, monat + 1, 0).getDate();
    const ersterTag = new Date(jahr, monat, 1);
    const offset = (ersterTag.getDay() + 6) % 7;

    // Monat-Container erstellen
    const feld = document.createElement("div");
    feld.classList.add("monat");

    // Monat-Name zum Container hinzufügen
    const titel = document.createElement("h3");
    titel.textContent = monate[monat];
    feld.appendChild(titel);

    // Kopfzeile-Container erstellen
    const kopfzeile = document.createElement("div");
    kopfzeile.classList.add("tage-grid"); 

    // KW + Wochentage
    const wochenKopf = ["KW", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    wochenKopf.forEach(text => {
      const zelle = document.createElement("div");
      zelle.textContent = text;
      zelle.style.fontWeight = "bold";
      kopfzeile.appendChild(zelle);
    });
    
    feld.appendChild(kopfzeile);

    // Gitter-Container erstellen
    const grid = document.createElement("div");
    grid.classList.add("tage-grid");

    // Anfangstag
    let tag = 1;

    // Schleife für befüllen von Wochen
    for (let woche = 0; tag <= anzahlTage;) {
        
      // Neue Woche: KW-Zelle einfügen
      const ersterTagWoche = new Date(jahr, monat, tag);
      const kw = berechneKW(ersterTagWoche);

      // Kalendewoche-Container erstellen
      const kwZelle = document.createElement("div");
      kwZelle.textContent = kw;
      kwZelle.style.fontWeight = "bold";
      grid.appendChild(kwZelle);

      // Schleife für befüllen von Tagen
      for (let wochentag = 0; wochentag < 7; wochentag++) {

        // Tag-Container erstellen
        const zelle = document.createElement("div");

        const aktuellesDatum = new Date(jahr, monat, tag);
        const aktuellerWochentag = (aktuellesDatum.getDay() + 6) % 7;

        // Vor dem Monatsanfang: leere Zellen einfügen
        if (tag === 1 && wochentag < offset) {
          zelle.textContent = "";
        } else if (tag > anzahlTage) {
          zelle.textContent = ""; // Nach dem Monatsende
        } else {
          if (wochentag === aktuellerWochentag) {

            // heutiges Datum herausfinden
            const istAktuell = istHeute(tag,monat,jahr);

            // Feiertage aus dem array laden und untersuchen
            const feiertag = feiertage.find(f => f.tag === tag && f.monat === monat + 1 && f.jahr === jahr);

            let emoji = "";
            
            // Wenn Feiertag und Heute auf den gleichen Tag fallen
            if (istAktuell && feiertag){
                zelle.classList.add("kombiniert-tag");
                zelle.title = feiertag.name + " (heute)";
                emoji = emojiZuFeiertag[feiertag.name];
            }
            
            // Wenn es Heute ist
            else if (istAktuell){
                zelle.classList.add("heute");
            }
            
            // Wenn es Feiertag ist
            else if (feiertag){
                zelle.classList.add("feiertag");
                emoji = emojiZuFeiertag[feiertag.name];
                zelle.title = feiertag.name;

                // Click-Handler für Popup
                zelle.addEventListener("click", () => {
                popupText.textContent = feiertag.name;
                popupText.style.font = "bold";
                popup.classList.remove("hidden");
                });
            }

            zelle.innerHTML = `
            <div class="tag-zahl">${tag}</div>
            <div class="tag-emoji">${emoji}</div>
            `;

            tag++;

          } else {
                zelle.textContent = "";
          }

        }
        grid.appendChild(zelle);
      }
      woche++;
    }

    feld.appendChild(grid);
    kalenderContainer.appendChild(feld);
  }
}

// ===============================
// Initialisierung bei Seitenstart
// ===============================

fuelleJahrliste(AKTUELLES_JAHR);
ladeFeiertage(AKTUELLES_JAHR).then(() => generiereKalender(AKTUELLES_JAHR));


// ===============================
// Service Worker Registrierung
// ===============================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').then(reg => {
      console.log("Service Worker registriert:", reg.scope);
    }).catch(err => {
      console.error("Service Worker Registrierung fehlgeschlagen:", err);
    });
  });
}

