/*
 * Carte OPNsense (custom:opnsense-card) pour Home Assistant, au style des cartes
 * MyElectricalData new (Carte Enedis Linky New) et des Cartes Serveur HA :
 * passerelles (état, latence, pertes, gigue), débits des interfaces, CPU, RAM, disque,
 * table d'états, tampons réseau, températures, baux DHCP, mise à jour d'OPNsense,
 * redémarrage et arrêt confirmés en deux clics.
 *
 * Données : l'intégration OPNsense de HACS (travisghansen/hass-opnsense), ou, sans intégration,
 * le package REST fourni dans le dépôt (packages/opnsense.yaml). Voir le README.
 */

(() => {
const CARD_VERSION = "0.1.0-beta.1";


/* ------------------------------------------------------------- affichage */

const fmt = (n, digits = 1) =>
  n === null || n === undefined
    ? "—"
    : Number(n).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Classe de thème de la carte :
 *  v2   : style MyElectricalData, toujours bleu nuit ;
 *  auto : style MyElectricalData, bleu nuit si Home Assistant est en mode sombre, clair sinon ;
 *  ha   : couleurs du thème Home Assistant (clair ou sombre). */
const themeClass = (theme, hass) => {
  const light = hass?.themes?.darkMode === false;
  if (theme === "ha") return `th-ha${light ? " light" : ""}`;
  if (theme === "auto") return `th-v2${light ? " light" : ""}`;
  return "th-v2";
};


const since = (iso) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mn = m % 60;
  return d ? `${d} j ${h} h` : h ? `${h} h ${String(mn).padStart(2, "0")} min` : `${mn} min`;
};


const level = (v, warn, alert) => (v === null ? "" : v >= alert ? "b-alert" : v >= warn ? "b-warn" : "b-ok");

const SRV_STYLE = `<style>
ha-card { display: block; padding-bottom: 12px; }
ha-card.srv-alert { border-color: var(--t-red); }
.brand .srv-box { fill: none; stroke: var(--med-green); stroke-width: 2.4; }
.srv-head { margin-top: 2px; font-variant-numeric: tabular-nums; }
.srv-leds { display: flex; flex-wrap: wrap; gap: 6px; }
.srv-led { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: .74rem;
  background: var(--med-surface); border: 1px solid var(--med-line); cursor: pointer; }
.srv-led i { width: 8px; height: 8px; border-radius: 50%; background: var(--med-muted); }
.srv-led.ok i { background: var(--med-down); } .srv-led.bad i { background: var(--t-red); } .srv-led.bad { border-color: var(--t-red); }
.srv-sec { margin: 12px 12px 0; }
.srv-h { display: flex; align-items: center; gap: 6px; font-size: .86rem; font-weight: 600; margin: 0 2px 8px; }
.srv-h ha-icon { --mdc-icon-size: 18px; color: var(--med-blue); }
.srv-tiles { margin: 0 !important; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)) !important; }
.srv-t { cursor: pointer; }
.srv-t .tile-l { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--med-text); margin-bottom: 4px; }
.srv-t .tile-l ha-icon, .srv-b ha-icon { --mdc-icon-size: 18px; color: var(--med-blue); }
.srv-t .tile-v { font-size: 1.2rem; }
.srv-kv { display: flex; justify-content: space-between; gap: 8px; font-size: .78rem; color: var(--med-muted); }
.srv-kv b { color: var(--med-text); font-weight: 600; text-align: right; }
.srv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
.srv-g { padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; }
.srv-gt { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: .82rem; }
.srv-gt span { display: inline-flex; align-items: center; gap: 6px; color: var(--med-muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.srv-gt ha-icon { --mdc-icon-size: 18px; color: var(--med-muted); }
.srv-gt b { font-size: 1.15rem; white-space: nowrap; flex: none; }
.srv-gt small { font-size: .74rem; font-weight: 500; color: var(--med-muted); }
.g-bar { position: relative; height: 8px; border-radius: 6px; background: var(--med-line); margin: 8px 0 2px; overflow: hidden; }
.g-bar i { display: block; height: 100%; border-radius: 6px; background: var(--med-blue); }
.g-bar.b-ok i { background: linear-gradient(90deg, var(--med-blue), var(--med-green)); }
.g-bar.b-warn i { background: #f0a33a; } .g-bar.b-alert i { background: var(--t-red); }
.srv-in .g-bar i { background: var(--med-down); } .srv-out .g-bar i { background: var(--med-up); }
.srv-wide { grid-column: 1 / -1; }
.srv-gs { font-size: .72rem; color: var(--med-muted); margin-top: 4px; }
.srv-state { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); font-size: .84rem; cursor: pointer; }
.srv-state span { flex: 1; } .srv-state ha-icon { --mdc-icon-size: 20px; color: var(--med-muted); }
.srv-state.ok { background: color-mix(in srgb, var(--med-down) 12%, transparent); border-color: color-mix(in srgb, var(--med-down) 55%, transparent); }
.srv-state.ok b, .srv-state.ok ha-icon { color: var(--med-down); }
.srv-state.bad { background: color-mix(in srgb, var(--t-red) 16%, transparent); border-color: var(--t-red); }
.srv-state.bad b, .srv-state.bad ha-icon { color: var(--t-red); }
.srv-bk { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 6px; }
.srv-b { cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 8px; }
.srv-b .tile-l { font-size: .74rem; }
.srv-bv { font-weight: 700; font-size: .95rem; white-space: nowrap; }
.srv-b .tile-n { white-space: nowrap; font-size: .68rem; }
.srv-b.warn { border-color: #f0a33a; } .srv-b.warn .srv-bv { color: #f0a33a; }
.srv-icon { --mdc-icon-size: 34px; width: 34px; height: 34px; }
.srv-fan.on { border-color: color-mix(in srgb, var(--med-down) 45%, transparent); background: color-mix(in srgb, var(--med-down) 10%, transparent); }
.srv-fan.on .tile-l ha-icon { color: var(--med-down); animation: srv-spin 2.5s linear infinite; }
.srv-fan.off { border-color: color-mix(in srgb, var(--t-red) 35%, transparent); }
.srv-fan.off .tile-l ha-icon, .srv-fan.off .tile-v { color: var(--t-red); }
@keyframes srv-spin { to { transform: rotate(360deg); } }
.g-bar.srv-free i { background: #1f6feb; }
.srv-pw { flex-direction: column; align-items: stretch; gap: 8px; }
.srv-pwh { display: flex; align-items: center; gap: 10px; }
.srv-pwh span { flex: 1; }
.srv-tl { display: flex; gap: 2px; height: 11px; }
.srv-tl i { flex: 1 1 0; min-width: 2px; border-radius: 2px; background: color-mix(in srgb, var(--med-muted) 35%, transparent); cursor: help; }
.srv-b.good { border-color: color-mix(in srgb, var(--med-down) 45%, transparent); } .srv-b.good .srv-bv, .srv-b.good ha-icon { color: var(--med-down); }
.srv-b.last { border-color: color-mix(in srgb, var(--med-down) 40%, transparent); } .srv-b.last ha-icon, .srv-b.last .srv-bv { color: var(--med-down); }
.srv-b.next { border-color: color-mix(in srgb, #f0a33a 40%, transparent); } .srv-b.next ha-icon, .srv-b.next .srv-bv { color: #f0a33a; }
.srv-b.bad { border-color: var(--t-red); } .srv-b.bad .srv-bv, .srv-b.bad ha-icon { color: var(--t-red); }
@media (prefers-reduced-motion: reduce) { .srv-fan.on .tile-l ha-icon { animation: none; } }
code { font-size: .78rem; }
</style>`;


const PVE_STYLE = `<style>
.pve-tabs { display: flex; gap: 6px; padding: 2px 12px 0; overflow-x: auto; scrollbar-width: none; }
.pve-tab { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; white-space: nowrap;
  border: 1px solid var(--med-line); background: var(--med-surface); font-size: .82rem; font-weight: 600; }
.pve-tab small { color: var(--med-muted); font-weight: 500; }
.pve-tab.on { border-color: var(--med-blue); box-shadow: inset 0 -2px 0 var(--med-blue); }
.pve-tab:focus-visible { outline: 2px solid var(--med-blue); }
.pve-up { --mdc-icon-size: 15px; color: #f0a33a; }
.pve-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: none; background: var(--med-muted); }
.pve-dot.ok { background: var(--med-down); } .pve-dot.bad { background: var(--t-red); } .pve-dot.warn { background: #f0a33a; }
.pve-st { display: flex; align-items: center; gap: 6px; font-weight: 700; margin-top: 2px; }
.pve-st i { width: 8px; height: 8px; border-radius: 50%; background: var(--med-muted); }
.pve-st.ok { color: var(--med-down); } .pve-st.ok i { background: var(--med-down); }
.pve-st.bad { color: var(--t-red); } .pve-st.bad i { background: var(--t-red); }
.pve-res { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-top: 8px; }
.srv-sec > .pve-res:first-child { margin-top: 0; }
.pve-n { font-weight: 500; color: var(--med-muted); font-size: .76rem; margin-left: 4px; }
.pve-list { display: grid; gap: 4px; }
.pve-g, .pve-gh { display: grid; grid-template-columns: 22px minmax(0, 1fr) 96px 64px; align-items: center; gap: 10px; }
.pve-g { padding: 8px 10px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; }
.pve-gh { padding: 0 10px; font-size: .7rem; color: var(--med-muted); }
.pve-g.off { opacity: .55; }
.pve-gi { --mdc-icon-size: 20px; color: var(--med-blue); }
.pve-gn { min-width: 0; display: grid; }
.pve-gn b { font-size: .86rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pve-gn span { display: flex; align-items: center; gap: 5px; font-size: .72rem; color: var(--med-muted); white-space: nowrap; overflow: hidden; }
.pve-gm { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; text-align: right; font-size: .8rem; font-weight: 600; }
.pve-gh .pve-gm { font-weight: 500; }
.pve-ga { display: flex; gap: 4px; justify-content: flex-end; min-width: 30px; }
.pve-btn { all: unset; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 30px; height: 30px; padding: 0 6px; box-sizing: border-box;
  border-radius: 9px; border: 1px solid var(--med-line); color: var(--med-muted); font-size: .74rem; font-weight: 700; }
.pve-btn ha-icon { --mdc-icon-size: 17px; }
.pve-btn:hover { border-color: var(--med-blue); color: var(--med-text); }
.pve-btn:focus-visible { outline: 2px solid var(--med-blue); }
.pve-btn.go { color: var(--med-down); border-color: color-mix(in srgb, var(--med-down) 45%, transparent); }
.pve-btn.stop { color: var(--t-red); border-color: color-mix(in srgb, var(--t-red) 40%, transparent); }
.pve-btn.armed { color: #f0a33a; border-color: #f0a33a; background: color-mix(in srgb, #f0a33a 18%, transparent); animation: pve-pulse 1s ease-in-out infinite; }
@keyframes pve-pulse { 50% { box-shadow: 0 0 0 3px color-mix(in srgb, #f0a33a 30%, transparent); } }
@media (prefers-reduced-motion: reduce) { .pve-btn.armed { animation: none; } }
.pve-btn.wide { padding: 0 12px; height: 36px; }
.pve-lock { display: inline-flex; color: var(--med-muted); } .pve-lock ha-icon { --mdc-icon-size: 18px; }
.pve-na { display: flex; flex-wrap: wrap; gap: 6px; }
.pve-na .pve-btn::after { content: attr(title); font-weight: 600; }
.pve-na .pve-btn.armed::after { content: none; }
.pve-guard { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.pve-guard ha-icon { --mdc-icon-size: 16px; }
.srv-led.upd i { background: #f0a33a; } .srv-led.upd { border-color: #f0a33a; }
@container (max-width: 360px) { .pve-g, .pve-gh { grid-template-columns: 20px minmax(0, 1fr) 80px 64px; gap: 6px; } }
</style>`;


/* ------------------------------------------------------------------ style */

const STYLE = `<style>
:host {
  --med-bg: #1a2434; --med-surface: #212d40; --med-line: #2f3d55;
  --med-text: #e7edf5; --med-muted: #8fa0b8;
  --med-green: #96d21f; --med-blue: #1d93e3;
  --med-hc: #4a7bd8; --med-hp: #d27333;
  --t-blue: #3f7ff0; --t-white: #e9eef4; --t-red: #ee4a4a;
  --med-up: #f08a4b; --med-down: #5fcf8a;
}
ha-card { background: var(--med-bg); color: var(--med-text); border: 1px solid var(--med-line);
  border-radius: 18px; overflow: hidden; font-variant-numeric: tabular-nums; container-type: inline-size; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px 8px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 10px; }
.brand svg { width: 34px; height: 34px; fill: none; }
.brand .house { stroke: var(--med-green); stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; }
.brand .bolt { fill: var(--med-blue); }
.title { font-size: 1.15rem; font-weight: 700; letter-spacing: .2px; }
.sub { font-size: .78rem; color: var(--med-muted); }
.tempo { display: flex; gap: 8px; }
.pill { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px;
  background: var(--med-surface); border: 1px solid var(--med-line); font-size: .78rem; }
.pill-l { color: var(--med-muted); }
.pill-v { font-weight: 600; }
.dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; background: var(--med-muted); flex: none; }
.t-blue .dot { background: var(--t-blue); } .t-white .dot { background: var(--t-white); } .t-red .dot { background: var(--t-red); }
.t-none .pill-v { color: var(--med-muted); font-weight: 400; }
.quotas { display: flex; align-items: center; gap: 14px; padding: 0 18px 10px; font-size: .82rem; }
.quota { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; }
.quota small { color: var(--med-muted); font-weight: 400; }
.quota-l { color: var(--med-muted); }

.hero { margin: 4px 12px 0; padding: 16px; border-radius: 14px; background: var(--med-surface);
  border: 1px solid var(--med-line); display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; }
.hero-l { color: var(--med-muted); font-size: .85rem; }
.hero-v { font-size: 2.4rem; font-weight: 700; line-height: 1.1; }
.hero-v span, .tile-v span { font-size: .9rem; font-weight: 500; color: var(--med-muted); margin-left: 4px; }
.hero-r { text-align: right; align-self: center; }
.cost { font-size: 1.6rem; font-weight: 700; color: var(--med-green); }
.cost.none { color: var(--med-muted); }
.cost.est { color: var(--med-text); opacity: .85; }
.hero-p { font-size: .75rem; color: var(--med-muted); margin-top: 6px; }
.cost-l { font-size: .75rem; color: var(--med-muted); max-width: 160px; }
.evo { font-size: .8rem; font-weight: 600; margin-top: 2px; }
.evo.up { color: var(--med-up); } .evo.down { color: var(--med-down); }
.split { grid-column: 1 / -1; margin-top: 6px; }
.split.wait { font-size: .8rem; color: var(--med-muted); border-top: 1px dashed var(--med-line); padding-top: 8px; }
.bar { display: flex; height: 8px; border-radius: 6px; overflow: hidden; background: var(--med-line); }
.bar i { display: block; } .bar .hc { background: var(--med-hc); } .bar .hp { background: var(--med-hp); }
.split-l { display: flex; justify-content: space-between; font-size: .78rem; margin-top: 6px; }
.k-hc { color: #8fb0f0; } .k-hp { color: #eaa070; }

.tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 10px 12px 0; }
@container (min-width: 620px) { .tiles { grid-template-columns: repeat(4, 1fr); } }
@container (min-width: 620px) { .tiles.six { grid-template-columns: repeat(3, 1fr); } }
.tile { padding: 12px; border-radius: 12px; border: 1px solid var(--med-line); }
.tile-l { font-size: .78rem; color: var(--med-muted); }
.tile-v { font-size: 1.35rem; font-weight: 700; margin-top: 2px; }
.tile-n { font-size: .72rem; color: var(--med-muted); margin-top: 4px; }

.chart { margin: 14px 12px 0; }
.chart-h { display: flex; justify-content: space-between; font-size: .82rem; color: var(--med-muted); margin: 0 4px 6px; }
.legend { display: flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; margin-left: 6px; }
.legend .k-hc { background: var(--med-hc); } .legend .k-hp { background: var(--med-hp); }
.chart svg { width: 100%; height: 130px; display: block; }
.chart rect.hc { fill: var(--med-hc); } .chart rect.hp { fill: var(--med-hp); }
.chart rect.partial { fill: var(--med-muted); opacity: .35; }
.chart g.est { opacity: .45; }
.chart rect.sel { fill: rgba(255,255,255,.06); }
.chart rect.hit { fill: transparent; cursor: pointer; }
.days { display: grid; margin-top: 4px; }
.day { all: unset; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 4px 0; border-radius: 8px; font-size: .68rem; color: var(--med-muted); text-transform: capitalize; }
.day b { color: var(--med-text); font-size: .78rem; }
.day .dot { width: 6px; height: 6px; margin-top: 2px; }
.day.on { background: var(--med-surface); }
.day:focus-visible { outline: 2px solid var(--med-blue); }

.detail { margin: 8px 12px 0; padding: 10px 12px; border-radius: 12px; background: var(--med-surface); border: 1px solid var(--med-line); }
.detail-h { display: flex; align-items: center; gap: 8px; font-size: .8rem; color: var(--med-muted); }
.tag { padding: 1px 8px; border-radius: 999px; font-size: .72rem; font-weight: 700; color: #0f1724; }
.tag.t-blue { background: var(--t-blue); color: #fff; } .tag.t-white { background: var(--t-white); } .tag.t-red { background: var(--t-red); color: #fff; }
.detail-v { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 4px; font-size: .9rem; }
.sep { width: 1px; height: 12px; background: var(--med-line); }
.detail-p { font-size: .78rem; color: var(--med-muted); margin-top: 4px; }
.warn { color: var(--t-red); font-style: normal; font-weight: 600; }

.power { margin: 10px 12px 0; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--med-line); }
.power.is-over { border-color: var(--t-red); }
.power-t { display: flex; justify-content: space-between; font-size: .85rem; }
.gauge { height: 6px; border-radius: 6px; background: var(--med-line); margin: 8px 0 6px; overflow: hidden; }
.gauge i { display: block; height: 100%; background: linear-gradient(90deg, var(--med-green), var(--med-blue)); }
.is-over .gauge i { background: var(--t-red); }
.power-n { font-size: .75rem; color: var(--med-muted); }

.eco { margin: 10px 12px 0; padding: 8px 12px; border-radius: 12px; border: 1px solid var(--med-line); font-size: .82rem; display: flex; align-items: center; gap: 8px; }
.eco.e-ok .dot { background: var(--med-down); }
.eco.e-warn { border-color: #f0a33a; } .eco.e-warn .dot { background: #f0a33a; }
.eco.e-alert { border-color: var(--t-red); } .eco.e-alert .dot { background: var(--t-red); }
.eco-l { color: var(--med-muted); }
footer { padding: 10px 18px 14px; font-size: .7rem; color: var(--med-muted); }
.empty { padding: 18px; display: flex; flex-direction: column; gap: 6px; font-size: .9rem; }
.empty span { color: var(--med-muted); }
/* Thème Home Assistant : fond, textes et bordures suivent le thème clair ou sombre */
ha-card.th-ha {
  --med-bg: var(--ha-card-background, var(--card-background-color, #fff));
  --med-surface: color-mix(in srgb, var(--primary-text-color, #000) 5%, transparent);
  --med-line: var(--divider-color, rgba(127, 127, 127, .25));
  --med-text: var(--primary-text-color, #1f2937);
  --med-muted: var(--secondary-text-color, #6b7280);
  border-radius: var(--ha-card-border-radius, 12px);
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
}
ha-card.th-ha.light { --med-green: #4c8a0b; --med-up: #c2560f; --med-down: #1d8a4b; }
/* Style MyElectricalData en version claire (theme: auto quand Home Assistant est en mode clair) */
ha-card.th-v2.light {
  --med-bg: #ffffff; --med-surface: #f2f5f9; --med-line: #dbe2ec;
  --med-text: #1a2434; --med-muted: #5b6b82;
  --med-green: #4c8a0b; --med-blue: #1673b8; --med-up: #c2560f; --med-down: #1d8a4b;
  box-shadow: 0 1px 3px rgba(26, 36, 52, .08);
}
ha-card.light .k-hc { color: #2f5fb8; }
ha-card.light .k-hp { color: #b35619; }
ha-card.light .t-white .dot, ha-card.light .tag.t-white { box-shadow: inset 0 0 0 1px #aab3c0; }
ha-card.light .chart rect.sel { fill: rgba(0, 0, 0, .05); }
ha-card.light .tag.t-white { color: #1f2937; }
@media (max-width: 420px) { .hero-v { font-size: 2rem; } .tempo { width: 100%; } }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>`;

/* ----------------------------------------------------------------- éditeur */

const THEME_SELECT = {
  name: "theme",
  selector: {
    select: {
      mode: "dropdown",
      options: [
        { value: "v2", label: "Style MyElectricalData (bleu nuit)" },
        { value: "auto", label: "Style MyElectricalData, clair ou sombre selon Home Assistant" },
        { value: "ha", label: "Thème Home Assistant (clair ou sombre)" },
      ],
    },
  },
};

/** Éditeur visuel : formulaire Home Assistant construit à partir du schéma. */
function makeEditor(schema, labels, defaults) {
  const hasDays = schema.some((s) => s.name === "days");
  return class extends HTMLElement {
    setConfig(config) {
      this._config = { ...config };
      this._draw();
    }

    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;
      else this._draw();
    }

    _draw() {
      if (!this._hass || !this._config) return;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => labels[s.name] || s.name;
        this._form.addEventListener("value-changed", (ev) => {
          const v = { ...ev.detail.value };
          if (hasDays && v.days !== undefined) v.days = Number(v.days);
          this._config = v;
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: v }, bubbles: true, composed: true }));
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.schema = schema;
      this._form.data = hasDays
        ? { ...defaults, ...this._config, days: String(this._config.days || defaults.days) }
        : { ...defaults, ...this._config };
    }
  };
}


/* ============================================================== OPNsense */

/*
 * Carte OPNsense (custom:opnsense-card) pour l'intégration hass-opnsense (HACS) :
 * état et mise à jour du pare-feu, ressources (CPU, RAM, disque, tables), températures,
 * passerelles (état, latence, pertes), débits des interfaces, baux DHCP, et redémarrage ou
 * arrêt confirmés en deux clics.
 */
const OPN_DEFAULTS = {
  title: "",
  icon: "mdi:wall-fire",
  icon_color: "",
  show_info: true, show_resources: true, show_gateways: true, show_interfaces: true, show_actions: true,
  interfaces: [], // interfaces affichées (vide = celles qui ont des débits)
  theme: "v2",
};
/** Rôle d'une entité OPNsense d'après la fin de son nom (noms anglais fixés par l'intégration). */
const OPN_ROLES = [
  ["cpu", /_cpu_usage$/], ["mem", /_memory_used_percentage$/], ["mem_used", /_memory_used$/], ["mem_total", /_memory_physmem$/],
  ["swap", /_memory_swap_used_percentage$/], ["mbuf", /_memory_buffers_used_percentage$/], ["pf", /_pf_state_table_used_percentage$/],
  ["load1", /_system_load_average_one_minute$/], ["boot", /_system_boottime$/], ["dhcp", /_dhcp_leases_all$/], ["certs", /_certificates$/],
  ["disk", /_filesystem_used_percentage(?:_root)?$/], ["ups", /_ups_status$/], ["ups_batt", /_ups_battery_charge$/],
];
/** État d'une passerelle (dpinger) et d'une interface, en français. */
const OPN_GW = { online: ["En ligne", "ok"], none: ["En ligne", "ok"], down: ["Hors ligne", "bad"], loss: ["Pertes", "warn"], delay: ["Latence", "warn"], delay_loss: ["Latence et pertes", "warn"], force_down: ["Désactivée", "off"], offline: ["Hors ligne", "bad"], latency: ["Latence", "warn"], packetloss: ["Pertes", "warn"] };
const opnGw = (s) => OPN_GW[String(s ?? "").toLowerCase().replace(/[+\s]+/g, "_")] || [s ? String(s) : "Inconnu", "off"];
/** Débit en bit/s d'un capteur, selon son unité (kB/s par défaut de l'intégration, ou converti par Home Assistant). */
const OPN_RATE = { "b/s": 8, "kb/s": 8e3, "kib/s": 8192, "mb/s": 8e6, "mib/s": 8388608, "gb/s": 8e9, "bit/s": 1, "kbit/s": 1e3, "mbit/s": 1e6, "gbit/s": 1e9 };
/** Ordre d'affichage : WAN d'abord, puis LAN, puis le reste par nom. */
const opnRank = (n) => (/^wan/i.test(n) ? 0 : /^lan/i.test(n) ? 1 : /wan/i.test(n) ? 0.5 : 2);
const bitrate = (bps) => (bps === null ? "—" : bps >= 1e9 ? `${fmt(bps / 1e9, 2)} Gbit/s` : bps >= 1e6 ? `${fmt(bps / 1e6, bps < 1e7 ? 2 : 1)} Mbit/s` : bps >= 1e3 ? `${fmt(bps / 1e3, 0)} kbit/s` : `${fmt(bps, 0)} bit/s`);

class OpnsenseCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("opnsense-card-editor");
  }

  static getStubConfig() {
    return {};
  }

  setConfig(config) {
    this._config = { ...OPN_DEFAULTS, ...(config || {}) };
    this._map = null;
    this._sig = null;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (!this._clicks) {
      this.shadowRoot.addEventListener("click", (this._clicks = (ev) => {
        const act = ev.target.closest?.("[data-act]");
        if (act) {
          // Redémarrer, arrêter : premier clic arme, second clic dans les 5 s confirme (service de l'intégration)
          ev.stopPropagation();
          const what = act.dataset.act;
          if (this._armed === what) {
            this._armed = null;
            if (this._map?.rest) this._hass?.callService("rest_command", `opnsense_${what === "reboot" ? "reboot" : "halt"}`, {});
            else this._hass?.callService("opnsense", what === "reboot" ? "system_reboot" : "system_halt", this._map?.device ? { device_id: this._map.device } : {});
          } else {
            this._armed = what;
            clearTimeout(this._armTimer);
            this._armTimer = setTimeout(() => { this._armed = null; this._sig = null; this._render(); }, 5000);
          }
          this._sig = null; this._render(); return;
        }
        const el = ev.target.closest?.("[data-entity]");
        if (el?.dataset.entity) {
          const e = new Event("hass-more-info", { bubbles: true, composed: true });
          e.detail = { entityId: el.dataset.entity };
          this.dispatchEvent(e);
        }
      }));
    }
    this._render();
  }

  set hass(hass) {
    if (this._hass?.entities !== hass.entities || this._hass?.devices !== hass.devices) this._map = null;
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 8;
  }

  _st(id) {
    return id ? this._hass?.states?.[id] : undefined;
  }

  _num(id) {
    const s = this._st(id);
    if (!s || s.state === "unavailable" || s.state === "unknown" || s.state === "") return null;
    const v = Number(s.state);
    return Number.isFinite(v) ? v : null;
  }

  /** Entités d'un pare-feu OPNsense (appareil choisi, sinon le premier) rangées par rôle, interfaces et passerelles. */
  _resolve() {
    if (this._map) return this._map;
    const hass = this._hass, c = this._config, reg = hass.entities || {};
    // entités restaurées (plus fournies par aucune intégration, ex. ancien package) : ignorées
    const live = (id) => !reg[id]?.hidden && !hass.states[id]?.attributes?.restored;
    let ids = Object.keys(hass.states).filter((id) => reg[id]?.platform === "opnsense" && live(id));
    // Sans intégration : capteurs du package REST (packages/opnsense.yaml), reconnus à leur préfixe
    const rest = !ids.length;
    if (rest) {
      const pre = new RegExp(`^(sensor|binary_sensor|update)\\.${String(c.prefix || "opnsense").toLowerCase().replace(/[^a-z0-9_]/g, "")}_`);
      ids = Object.keys(hass.states).filter((id) => pre.test(id) && live(id));
    }
    const device = rest ? null : c.device || reg[ids.find((id) => id.startsWith("sensor."))]?.device_id || null;
    const mine = ids.filter((id) => !device || reg[id]?.device_id === device);
    const m = { device, rest, roles: {}, ifaces: {}, gws: {}, temps: [], update: null, notices: null };
    for (const id of mine) {
      const dom = id.split(".")[0];
      if (dom === "update" || (dom === "binary_sensor" && /_firmware_updates?_available$/.test(id))) { m.update ||= id; continue; }
      if (dom === "binary_sensor" && /_pending_notices_present$/.test(id)) { m.notices = id; continue; }
      if (dom !== "sensor") continue;
      // package REST : toutes les passerelles et toutes les interfaces dans un capteur chacun
      if (/_gateways$/.test(id)) { m.gwAll = id; continue; }
      if (/_traffic$/.test(id)) { m.traffic = id; continue; }
      let x = /_interface_(.+?)_(status|traffic_in_rate|traffic_out_rate)$/.exec(id);
      if (x) { (m.ifaces[x[1]] ||= { key: x[1] })[x[2] === "status" ? "status" : x[2] === "traffic_in_rate" ? "in" : "out"] = id; continue; }
      x = /_gateway_(.+?)_(status|delay|loss|stddev|address)$/.exec(id);
      if (x) { (m.gws[x[1]] ||= { key: x[1] })[x[2]] = id; continue; }
      if (/_temp_/.test(id) && /°C|°F/.test(hass.states[id].attributes?.unit_of_measurement || "")) { m.temps.push(id); continue; }
      for (const [role, re] of OPN_ROLES) if (re.test(id)) { m.roles[role] ||= id; break; }
    }
    const dev = hass.devices?.[device];
    m.name = c.title || dev?.name_by_user || dev?.name || "OPNsense";
    m.version = dev?.sw_version || null;
    m.model = [dev?.manufacturer, dev?.model].filter(Boolean).join(" ");
    this._map = m;
    return m;
  }

  /** Nom lisible d'une interface ou d'une passerelle : nom de l'entité sans le préfixe de l'appareil. */
  _label(id, re, fallback) {
    const fn = String(this._st(id)?.attributes?.friendly_name || "");
    const x = re.exec(fn);
    return x ? x[1] : fallback.replace(/_/g, " ").toUpperCase();
  }

  /** Passerelles du package REST : « nom,état,latence,pertes,gigue|… » (valeurs en ms et %). */
  _gwPack(id) {
    const n = (v) => (v === "" || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
    return String(this._st(id)?.state || "").split("|").map((row) => row.split(",")).filter((f) => f.length >= 2 && f[0])
      .map(([name, st, d, l, j]) => ({ key: name, status: id, name, state: opnGw(st), delay: n(d), loss: n(l), jitter: n(j), ip: null }))
      .sort((a, b) => opnRank(a.name) - opnRank(b.name) || a.name.localeCompare(b.name, "fr"));
  }

  /** Interfaces du package REST : « heure|nom,octets reçus,octets envoyés|… ». La carte calcule les
   *  débits entre deux relevés (le précédent est repris de l'historique au chargement de la page). */
  _trafPack(id) {
    const parse = (state) => {
      const [t, ...rows] = String(state || "").split("|");
      const out = { t: Number(t), i: {} };
      for (const row of rows) { const [name, rx, tx] = row.split(","); if (name) out.i[name] = [Number(rx), Number(tx)]; }
      return Number.isFinite(out.t) && out.t > 0 ? out : null;
    };
    const cur = parse(this._st(id)?.state);
    if (!cur) return [];
    const tr = (this._tr ||= { last: null, rates: {} });
    if (tr.last && cur.t > tr.last.t) {
      const dt = cur.t - tr.last.t;
      for (const [name, [rx, tx]] of Object.entries(cur.i)) {
        const p = tr.last.i[name];
        // compteur remis à zéro (redémarrage) : pas de débit négatif
        if (p) tr.rates[name] = [Math.max(0, ((rx - p[0]) * 8) / dt), Math.max(0, ((tx - p[1]) * 8) / dt)];
      }
    }
    if (!tr.last || cur.t > tr.last.t) tr.last = cur;
    if (!tr.seeded && this._hass?.callApi) {
      tr.seeded = true;
      const start = new Date(Date.now() - 10 * 60000).toISOString();
      this._hass.callApi("GET", `history/period/${start}?filter_entity_id=${encodeURIComponent(id)}&minimal_response&no_attributes&significant_changes_only=0`)
        .then((res) => {
          const prev = (res?.[0] || []).map((h) => parse(h.state)).filter((x) => x && x.t < cur.t).pop();
          if (!prev || Object.keys(tr.rates).length) return;
          tr.last = prev;
          this._trafPack(id); // recalcule avec le relevé précédent
          this._sig = null;
          this._render();
        })
        .catch(() => { /* sans historique : le débit s'affiche au relevé suivant */ });
    }
    return Object.keys(cur.i).map((name) => ({ key: name, in: id, out: id, name, up: null, rin: tr.rates[name]?.[0] ?? null, rout: tr.rates[name]?.[1] ?? null }))
      .sort((a, b) => opnRank(a.name) - opnRank(b.name) || a.name.localeCompare(b.name, "fr"));
  }

  _bps(id) {
    const v = this._num(id);
    if (v === null) return null;
    const u = String(this._st(id)?.attributes?.unit_of_measurement || "kB/s").toLowerCase().replace(/\s/g, "");
    return Math.max(0, v * (OPN_RATE[u] || 8e3)); // un compteur remis à zéro donne une dérivée négative
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const c = this._config, m = this._resolve();
    const ids = [...Object.values(m.roles), ...Object.values(m.ifaces).flatMap((i) => Object.values(i)), ...Object.values(m.gws).flatMap((g) => Object.values(g)), ...m.temps, m.update, m.notices, m.gwAll, m.traffic];
    const sig = `${c.theme}|${this._hass.themes?.darkMode}|${this._armed}|${Math.floor(Date.now() / 60000)}|` + ids.map((id) => this._st(id)?.state ?? "-").join("|");
    if (sig === this._sig) return;
    this._sig = sig;

    const sec = (icon, t, body) => (body ? `<div class="srv-sec"><div class="srv-h"><ha-icon icon="${icon}"></ha-icon>${t}</div>${body}</div>` : "");
    const gauge = (id, icon, label, v, sub, warn = 75, alert = 90) => (v === null ? "" : `<div class="srv-g" data-entity="${esc(id)}">
        <div class="srv-gt"><span><ha-icon icon="${icon}"></ha-icon>${label}</span><b>${fmt(v, 0)}<small> %</small></b></div>
        <div class="g-bar ${level(v, warn, alert)}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>${sub ? `<div class="srv-gs">${sub}</div>` : ""}</div>`);
    const led = (ok, label, id, cls = "") => `<span class="srv-led ${ok === null ? "na" : ok ? "ok" : "bad"} ${cls}" data-entity="${esc(id || "")}"><i></i>${label}</span>`;

    const found = Object.keys(m.roles).length || Object.keys(m.gws).length || Object.keys(m.ifaces).length || m.gwAll || m.traffic;
    if (!found) {
      this.shadowRoot.innerHTML = `${STYLE}${SRV_STYLE}${PVE_STYLE}<ha-card class="${themeClass(c.theme, this._hass)}">
        <header><div class="brand"><ha-icon class="srv-icon" icon="${esc(c.icon || "mdi:wall-fire")}" style="color:${esc(c.icon_color || "var(--med-blue)")}"></ha-icon><div><div class="title">${esc(c.title || "OPNsense")}</div></div></div></header>
        <div class="empty">Aucun pare-feu OPNsense trouvé<span>Installez l'intégration OPNsense (HACS : travisghansen/hass-opnsense), ou le package REST fourni avec la carte (packages/opnsense.yaml), puis rechargez la page.</span></div></ha-card>`;
      return;
    }

    // --- passerelles : la passerelle par défaut d'abord (WAN), puis les autres
    const gwRows = Object.values(m.gws).length ? Object.values(m.gws) : [];
    let gws = gwRows.map((g) => ({ ...g, name: this._label(g.status || g.delay, /Gateway (.+?) (?:status|delay|loss|stddev|address)$/i, g.key),
      state: opnGw(this._st(g.status)?.state), delay: this._num(g.delay), loss: this._num(g.loss), jitter: this._num(g.stddev), ip: this._st(g.address)?.state }))
      .sort((a, b) => opnRank(a.name) - opnRank(b.name) || a.name.localeCompare(b.name, "fr"));
    if (!gws.length && m.gwAll) gws = this._gwPack(m.gwAll);
    const gwDown = gws.filter((g) => g.state[1] === "bad"), gwWarn = gws.filter((g) => g.state[1] === "warn");
    const upd = this._st(m.update), updOn = upd?.state === "on";
    const notice = this._st(m.notices)?.state === "on";
    const leds = [
      gws.length ? led(!gwDown.length, gwDown.length > 1 ? `${gwDown.length} passerelles hors ligne` : gwDown.length ? `${gwDown[0].name} hors ligne` : "Passerelles", (gwDown[0] || gws[0]).status) : "",
      upd ? `<span class="srv-led ${updOn ? "upd" : "ok"}" data-entity="${esc(m.update)}"><i></i>${updOn ? "Mise à jour" : "À jour"}</span>` : "",
      notice ? led(false, "Alertes", m.notices) : "",
    ].join("");

    // --- informations
    const boot = this._st(m.roles.boot)?.state;
    const inst = upd?.attributes?.installed_version || m.version, last = upd?.attributes?.latest_version;
    const dhcp = this._num(m.roles.dhcp), load = this._num(m.roles.load1);
    const info = c.show_info !== false ? [
      boot && since(boot) ? `<div class="tile srv-t" data-entity="${esc(m.roles.boot)}"><div class="tile-l"><ha-icon icon="mdi:clock-start"></ha-icon>Uptime</div><div class="tile-v opn-up">${esc(since(boot))}</div></div>` : "",
      inst || upd ? `<div class="tile srv-t ${updOn ? "opn-upd" : ""}"${m.update ? ` data-entity="${esc(m.update)}"` : ""}><div class="tile-l"><ha-icon icon="${updOn ? "mdi:package-up" : "mdi:package-check"}"></ha-icon>OPNsense</div>
        <div class="srv-kv"><span>${updOn ? "Dispo" : "Version"}</span><b class="${updOn ? "bad" : ""}">${esc((updOn ? last : inst) || "—")}</b></div>
        ${upd ? `<div class="srv-kv"><span>État</span><b class="${updOn ? "bad" : "ok"}">${updOn ? "À installer" : "À jour"}</b></div>` : ""}</div>` : "",
      dhcp !== null ? `<div class="tile srv-t" data-entity="${esc(m.roles.dhcp)}"><div class="tile-l"><ha-icon icon="mdi:devices"></ha-icon>Baux DHCP</div><div class="tile-v">${fmt(dhcp, 0)}</div></div>` : "",
      load !== null ? `<div class="tile srv-t" data-entity="${esc(m.roles.load1)}"><div class="tile-l"><ha-icon icon="mdi:chart-line"></ha-icon>Charge</div><div class="tile-v">${fmt(load, 2)}</div></div>` : "",
    ].filter(Boolean) : [];

    // --- ressources
    const memPct = this._num(m.roles.mem), memUsed = this._num(m.roles.mem_used), memTot = this._num(m.roles.mem_total);
    const memU = String(this._st(m.roles.mem_total)?.attributes?.unit_of_measurement || "B");
    const toGo = (v, u) => (v === null ? null : v / ({ b: 1e9, kb: 1e6, kib: 1048576, mb: 1e3, mib: 1024 / 1.048576, gb: 1, gib: 1 / 1.073741824 }[u.toLowerCase()] || 1e9));
    const res = c.show_resources !== false ? [
      gauge(m.roles.cpu, "mdi:cpu-64-bit", "CPU", this._num(m.roles.cpu), "", 70, 90),
      gauge(m.roles.mem, "mdi:memory", "RAM", memPct, memUsed !== null && memTot !== null ? `${fmt(toGo(memUsed, memU), 1)} Go / ${fmt(toGo(memTot, memU), 1)} Go` : "", 80, 92),
      gauge(m.roles.disk, "mdi:harddisk", "Disque", this._num(m.roles.disk), "", 80, 90),
      gauge(m.roles.pf, "mdi:table-network", "Table d'états", this._num(m.roles.pf), "", 70, 90),
      gauge(m.roles.mbuf, "mdi:memory-arrow-down", "Tampons réseau", this._num(m.roles.mbuf), m.rest ? "" : "utilisés / alloués", m.rest ? 80 : 101, m.rest ? 95 : 101),
      gauge(m.roles.swap, "mdi:swap-horizontal", "Swap", this._num(m.roles.swap), "", 50, 80),
    ].filter(Boolean) : [];
    const temps = c.show_resources !== false ? m.temps.map((id) => {
      const v = this._num(id);
      if (v === null) return "";
      const label = this._label(id, /Temp (.+)$/i, id.split("_temp_").pop());
      return `<div class="tile srv-b ${v >= 80 ? "warn" : ""}" data-entity="${esc(id)}"><ha-icon icon="mdi:thermometer"></ha-icon><div class="tile-l">${esc(label)}</div><div class="srv-bv">${fmt(v, 0)} °C</div></div>`;
    }).filter(Boolean) : [];

    // --- passerelles
    const gwHtml = c.show_gateways !== false ? gws.map((g) => `<div class="opn-gw ${g.state[1]}" data-entity="${esc(g.status || g.delay || "")}">
        <i class="opn-dot ${g.state[1]}"></i><div class="opn-n"><b>${esc(g.name)}</b><small>${esc(g.state[1] === "ok" && g.delay === null && g.loss === null && g.jitter === null ? "En ligne · sans surveillance" : g.state[0])}${g.ip && !/^(unknown|unavailable|~)$/.test(g.ip) ? ` · ${esc(g.ip)}` : ""}</small></div>
        <div class="opn-m"><span title="Latence">${g.delay === null ? "—" : `${fmt(g.delay, g.delay < 10 ? 1 : 0)} ms`}</span><span title="Pertes" class="${(g.loss || 0) >= 5 ? "bad" : ""}">${g.loss === null ? "—" : `${fmt(g.loss, 0)} %`}</span><span title="Gigue">${g.jitter === null ? "—" : `± ${fmt(g.jitter, 1)} ms`}</span></div></div>`).join("") : "";
    const gwHead = gws.length ? `<div class="opn-gh"><span></span><span></span><div class="opn-m"><span>Latence</span><span>Pertes</span><span>Gigue</span></div></div>` : "";

    // --- interfaces : débits entrant et sortant
    const want = (Array.isArray(c.interfaces) ? c.interfaces : String(c.interfaces || "").split(/[,\s]+/)).map((x) => String(x).toLowerCase()).filter(Boolean);
    const ifs = Object.values(m.ifaces).filter((i) => (i.in || i.out) && (!want.length || want.includes(i.key.toLowerCase()) || want.includes(this._label(i.in || i.out, /Interface (.+?) Traffic/i, i.key).toLowerCase())))
      .map((i) => ({ ...i, name: this._label(i.in || i.out || i.status, /Interface (.+?) (?:Traffic|Status)/i, i.key), up: this._st(i.status)?.state, rin: this._bps(i.in), rout: this._bps(i.out) }))
      .sort((a, b) => opnRank(a.name) - opnRank(b.name) || a.name.localeCompare(b.name, "fr"));
    if (!ifs.length && m.traffic) ifs.push(...this._trafPack(m.traffic).filter((i) => !want.length || want.includes(i.name.toLowerCase())));
    const ifHtml = c.show_interfaces !== false ? ifs.map((i) => {
      const down = i.up && !/^(up|active|connected|unknown|unavailable)$/i.test(i.up);
      return `<div class="opn-if ${down ? "bad" : ""}" data-entity="${esc(i.in || i.out)}"><div class="opn-n"><b>${esc(i.name)}</b><small>${down ? `<span class="bad">Déconnectée</span>` : i.up === null ? "Reçu · envoyé" : "Connectée"}</small></div>
        <span class="opn-r in" title="Reçu"><ha-icon icon="mdi:arrow-down"></ha-icon>${bitrate(i.rin)}</span><span class="opn-r out" title="Envoyé"><ha-icon icon="mdi:arrow-up"></ha-icon>${bitrate(i.rout)}</span></div>`;
    }).join("") : "";

    // --- actions
    const act = (what, icon, label, cls) => {
      const armed = this._armed === what;
      return `<button class="pve-btn wide ${cls} ${armed ? "armed" : ""}" data-act="${what}" title="${esc(armed ? `${label} : cliquez encore pour confirmer` : label)}" aria-label="${esc(armed ? `Confirmer : ${label}` : label)}"><ha-icon icon="${armed ? "mdi:check-bold" : icon}"></ha-icon>${armed ? "<span>Confirmer</span>" : ""}</button>`;
    };
    // Intégration : services opnsense.* ; package REST : rest_command.opnsense_reboot et opnsense_halt, s'ils sont déclarés
    const svc = this._hass.services || {};
    const can = (what) => (m.rest ? !!svc.rest_command?.[`opnsense_${what}`] : !!svc.opnsense?.[what === "reboot" ? "system_reboot" : "system_halt"]);
    const acts = c.show_actions !== false ? [can("reboot") ? act("reboot", "mdi:restart", "Redémarrer", "") : "", can("halt") ? act("halt", "mdi:power", "Arrêter", "stop") : ""].join("") : "";

    const sub = [inst ? `OPNsense ${inst}` : m.model, gws.length ? (gwDown.length ? `${gwDown.length} passerelle${gwDown.length > 1 ? "s" : ""} hors ligne` : gwWarn.length ? "passerelle dégradée" : "Internet OK") : ""].filter(Boolean).join(" · ");
    const body = [
      c.show_info !== false && info.length ? sec("mdi:information-outline", "Informations", `<div class="tiles srv-tiles">${info.join("")}</div>`) : "",
      res.length || temps.length ? sec("mdi:speedometer", "Ressources", `${res.length ? `<div class="srv-grid pve-res opn-res">${res.join("")}</div>` : ""}${temps.length ? `<div class="tiles srv-tiles opn-tm">${temps.join("")}</div>` : ""}`) : "",
      sec("mdi:router-network", "Passerelles", gwHtml ? `<div class="opn-list">${gwHead}${gwHtml}</div>` : ""),
      sec("mdi:swap-vertical", "Interfaces", ifHtml ? `<div class="opn-list">${ifHtml}</div>` : ""),
      sec("mdi:gesture-tap-button", "Actions", acts ? `<div class="pve-na">${acts}</div><div class="srv-gs pve-guard"><ha-icon icon="mdi:alert-outline"></ha-icon>Le redémarrage coupe Internet le temps du démarrage (et Home Assistant s'il passe par ce pare-feu).</div>` : ""),
    ].join("");
    const alertCls = gwDown.length ? "srv-alert" : "";
    this.shadowRoot.innerHTML = `${STYLE}${SRV_STYLE}${PVE_STYLE}${OPN_STYLE}<ha-card class="${themeClass(c.theme, this._hass)} ${alertCls}">
      <header>
        <div class="brand"><ha-icon class="srv-icon" icon="${esc(c.icon || "mdi:wall-fire")}" style="color:${esc(c.icon_color || "var(--med-blue)")}"></ha-icon>
          <div><div class="title">${esc(m.name)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div></div>
        ${leds ? `<div class="srv-leds">${leds}</div>` : ""}
      </header>
      ${body}
    </ha-card>`;
  }
}

const OPN_STYLE = `<style>
.opn-list { display: grid; gap: 6px; }
.opn-gw, .opn-if, .opn-gh { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.opn-gw, .opn-if { padding: 8px 12px; border-radius: 12px; border: 1px solid var(--med-line); background: var(--med-surface); cursor: pointer; }
.opn-if { grid-template-columns: minmax(0, 1fr) auto auto; }
.opn-gw.bad, .opn-if.bad { border-color: var(--t-red); } .opn-gw.warn { border-color: #f0a33a; }
.opn-gh { padding: 0 12px; font-size: .68rem; color: var(--med-muted); }
.opn-n { display: flex; flex-direction: column; min-width: 0; } .opn-n b { color: var(--med-text); font-size: .86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.opn-n small { font-size: .72rem; color: var(--med-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.opn-n small .bad, .opn-m .bad { color: var(--t-red); }
.opn-m { display: grid; grid-template-columns: 58px 46px 72px; gap: 4px; text-align: right; font-size: .8rem; font-weight: 600; color: var(--med-text); }
.opn-gw.warn .opn-m span:first-child { color: #f0a33a; }
.opn-res { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)) !important; }
.opn-gh .opn-m { font-weight: 500; font-size: .68rem; color: var(--med-muted); }
.opn-r { display: inline-flex; align-items: center; gap: 3px; font-size: .8rem; font-weight: 600; white-space: nowrap; min-width: 88px; justify-content: flex-end; }
.opn-r ha-icon { --mdc-icon-size: 15px; } .opn-r.in ha-icon { color: var(--med-down); } .opn-r.out ha-icon { color: var(--med-up, #1d93e3); }
.opn-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--med-muted); }
.opn-dot.ok { background: var(--med-down); } .opn-dot.bad { background: var(--t-red); } .opn-dot.warn { background: #f0a33a; }
.opn-up { font-size: 1rem !important; }
.opn-upd { border-color: #f0a33a; } .srv-kv b.bad { color: #f0a33a; } .srv-kv b.ok { color: var(--med-down); }
.srv-led.na i { background: var(--med-muted); }
.opn-tm { margin-top: 8px !important; }
@container (max-width: 380px) { .opn-m { grid-template-columns: 52px 40px 64px; } .opn-r { min-width: 74px; } }
</style>`;

const OPN_SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "icon_color", selector: { text: {} } },
  { name: "device", selector: { device: { integration: "opnsense" } } },
  { name: "prefix", selector: { text: {} } },
  { name: "interfaces", selector: { text: { multiple: true } } },
  { name: "show_info", selector: { boolean: {} } },
  { name: "show_resources", selector: { boolean: {} } },
  { name: "show_gateways", selector: { boolean: {} } },
  { name: "show_interfaces", selector: { boolean: {} } },
  { name: "show_actions", selector: { boolean: {} } },
  THEME_SELECT,
];
const OPN_LABELS = {
  title: "Titre (vide = nom du pare-feu)",
  icon: "Icône",
  icon_color: "Couleur de l'icône",
  device: "Pare-feu OPNsense (vide = le premier)",
  prefix: "Sans intégration : début du nom des capteurs du package REST (vide = opnsense)",
  interfaces: "Interfaces affichées (vide = toutes celles qui ont des débits)",
  show_info: "Section Informations (uptime, version, baux DHCP, charge)",
  show_resources: "Section Ressources (CPU, RAM, disque, tables, températures)",
  show_gateways: "Section Passerelles (état, latence, pertes)",
  show_interfaces: "Section Interfaces (débits)",
  show_actions: "Boutons redémarrer et arrêter (deux clics)",
  theme: "Couleurs de la carte",
};
const OpnsenseCardEditor = makeEditor(OPN_SCHEMA, OPN_LABELS, OPN_DEFAULTS);

/* ---------------------------------------------------------- enregistrement */

if (typeof customElements !== "undefined") {
  if (!customElements.get("opnsense-card")) customElements.define("opnsense-card", OpnsenseCard);
  if (!customElements.get("opnsense-card-editor")) customElements.define("opnsense-card-editor", OpnsenseCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((c) => c.type === "opnsense-card")) {
    window.customCards.push({
      type: "opnsense-card",
      name: "Carte OPNsense",
      description: "Pare-feu OPNsense : passerelles (état, latence, pertes), débits des interfaces, CPU, RAM, table d'états, températures, mise à jour, redémarrage confirmé.",
      preview: true,
    });
  }
  console.info(`%c OPNSENSE-CARD %c ${CARD_VERSION} `, "background:#d94f00;color:#fff;font-weight:700", "background:#1d93e3;color:#fff");
}
})();
