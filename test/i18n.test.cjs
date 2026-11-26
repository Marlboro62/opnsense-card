const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const source = readFileSync(join(__dirname, "../opnsense-card.js"), "utf8");

class Element extends EventTarget {
  appendChild(child) { this.child = child; }
  attachShadow() { return (this.shadowRoot = new Element()); }
}

function loadCard() {
  const elements = new Map();
  const document = {
    documentElement: { lang: "fr" },
    createElement: (tag) => new (elements.get(tag) || Element)(),
  };
  const window = {};
  const timers = new Map();
  let timerId = 0;
  const text = runInNewContext(source.replace(/\}\)\(\);\s*$/, "return TEXT;})();"), {
    document, window, HTMLElement: Element, Event, CustomEvent,
    customElements: { get: (tag) => elements.get(tag), define: (tag, ctor) => elements.set(tag, ctor) },
    console: { info: () => {} },
    setTimeout(fn, duration) { timers.set(++timerId, { fn, duration }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  });
  return { Card: elements.get("opnsense-card"), document, window, text, timers };
}

function render(config, hass, Card = loadCard().Card) {
  const card = new Card();
  card.setConfig({ type: "custom:opnsense-card", ...config });
  card.hass = hass;
  return card;
}

const markup = (card) => card.shadowRoot.innerHTML;
const languageOf = (card) => /<ha-card lang="([^"]+)"/.exec(markup(card))[1];
const state = (value, attributes = {}) => ({ state: String(value), attributes });

function integration() {
  const states = {
    "sensor.fb_cpu_usage": state(32),
    "sensor.fb_system_boottime": state(new Date(Date.now() - (3 * 24 + 4) * 3600e3).toISOString()),
    "sensor.fb_memory_used_percentage": state(25),
    "sensor.fb_memory_used": state(4.2, { unit_of_measurement: "GB" }),
    "sensor.fb_memory_physmem": state(16, { unit_of_measurement: "GB" }),
    "sensor.fb_dhcp_leases_all": state(12345),
    "sensor.fb_system_load_average_one_minute": state(1.25),
    "sensor.fb_memory_buffers_used_percentage": state("unavailable"),
    "sensor.fb_temp_cpu": state(67, { friendly_name: "OPNsense Temp CPU 0", unit_of_measurement: "°C" }),
    "sensor.fb_gateway_lan_status": state("online", { friendly_name: "OPNsense Gateway LAN Status" }),
    "sensor.fb_gateway_wan_status": state("delay+loss", { friendly_name: "OPNsense Gateway WAN Status" }),
    "sensor.fb_gateway_wan_delay": state(7.5),
    "sensor.fb_gateway_wan_loss": state(10),
    "sensor.fb_interface_wan_status": state("down"),
    "sensor.fb_interface_wan_traffic_in_rate": state(625, { unit_of_measurement: "kB/s" }),
    "sensor.fb_interface_wan_traffic_out_rate": state("unknown"),
    "update.fb_firmware": state("on", { installed_version: "26.7.7", latest_version: "26.7.8" }),
    "binary_sensor.fb_pending_notices_present": state("on"),
  };
  const entities = Object.fromEntries(Object.keys(states).map((id) => [id, { platform: "opnsense", device_id: "fw" }]));
  states["sensor.second_dhcp_leases_all"] = state(98765);
  entities["sensor.second_dhcp_leases_all"] = { platform: "opnsense", device_id: "second" };
  states["sensor.opnsense_cpu_usage"] = state(99);
  states["sensor.fb_memory_swap_used_percentage"] = state(12);
  entities["sensor.fb_memory_swap_used_percentage"] = { platform: "opnsense", device_id: "fw", hidden: true };
  return {
    states, entities, devices: { fw: { name: "Firewall A" }, second: { name: "Firewall B" } },
    language: "it-IT", services: { opnsense: { system_reboot: {}, system_halt: {} } },
  };
}

function rest() {
  return {
    states: {
      "sensor.other_cpu_usage": state(27),
      "sensor.other_gateways": state("ÉCHO,force_down,,,|alpha,unavailable,,,|WAN,none,6.2,0,2.1|LAN,loss,14,6,1"),
      "sensor.other_traffic": state("30|LAN,1500,2500|WAN,2500,3500|ÉCHO,1000,1500|alpha,1000,1200"),
      "sensor.other_temp_sonde_1": state(44, { friendly_name: "OPNsense Temp Sonde 1", unit_of_measurement: "°C" }),
      "binary_sensor.other_firmware_updates_available": state("on", { installed_version: "26.7.7", latest_version: "26.7.8" }),
      "sensor.other_memory_swap_used_percentage": state(17, { restored: true }),
    },
    entities: {},
    services: { rest_command: { opnsense_reboot: {}, opnsense_halt: {} } },
    callApi: async () => [[{ state: "15|LAN,0,0|WAN,100,500|ÉCHO,0,0|alpha,0,0" }]],
  };
}

test("language defaults, explicit values, regional tags and auto fallback", () => {
  const Card = loadCard().Card;
  const cases = [
    [{}, { language: "it" }, "fr"],
    [{ language: "fr" }, { language: "it" }, "fr"],
    [{ language: "it" }, { language: "fr" }, "it"],
    [{ language: " IT-it " }, {}, "it"],
    [{ language: "fr-FR" }, {}, "fr"],
    [{ language: "auto" }, { locale: { language: "it-IT" }, language: "fr" }, "it"],
    [{ language: "auto" }, { language: "fr-FR" }, "fr"],
    [{ language: "auto" }, { language: "de-DE" }, "fr"],
    [{ language: "auto" }, {}, "fr"],
  ];
  for (const invalid of [null, 42, {}, ["it"], true, "", "it-", "en-US", "constructor"]) {
    cases.push([{ language: invalid }, { language: "it" }, "fr"]);
  }
  for (const [config, hass, expected] of cases) {
    assert.equal(languageOf(render(config, { ...hass, states: {} }, Card)), expected, JSON.stringify([config, hass]));
  }
});

test("auto changes the rendered locale with unchanged sensor data", () => {
  const hass = integration();
  const card = render({ language: "auto" }, hass);
  assert.match(markup(card), /Informazioni/);
  card.hass = { ...hass, language: "fr-FR" };
  assert.match(markup(card), /Informations/);
  assert.doesNotMatch(markup(card), /Informazioni/);
});

test("editor updates labels, helper, options and preview via config-changed", () => {
  const { Card, window, document } = loadCard();
  const editor = Card.getConfigElement();
  const hass = integration();
  const config = { type: "custom:opnsense-card" };
  const preview = render(config, hass, Card);
  editor.setConfig(config);
  editor.hass = hass;
  const form = editor.child;
  const field = (name) => form.schema.find((item) => item.name === name);
  assert.equal(form.data.language, "fr");
  assert.equal(form.computeLabel(field("language")), "Langue de la carte");
  assert.deepEqual(Array.from(field("language").selector.select.options, ({ value }) => value), ["auto", "fr", "it"]);
  let emitted;
  editor.addEventListener("config-changed", (ev) => {
    assert.equal(ev.bubbles && ev.composed, true);
    emitted = ev.detail.config;
    preview.setConfig(emitted);
  });
  const change = (patch) => form.dispatchEvent(new CustomEvent("value-changed", { detail: { value: { ...form.data, ...patch } } }));
  change({ title: "Firewall personale" });
  assert.equal(Object.hasOwn(emitted, "language"), false);
  change({ language: "it" });
  assert.equal(emitted.language, "it");
  assert.equal(languageOf(preview), "it");
  assert.match(markup(preview), /Firewall personale/);
  assert.equal(editor.child, form);
  assert.equal(form.computeLabel(field("language")), "Lingua della scheda");
  assert.match(form.computeHelper(field("language")), /profilo Home Assistant/);
  assert.equal(field("language").selector.select.options[0].label, "Automatica (Home Assistant)");
  assert.equal(field("theme").selector.select.options[2].label, "Tema Home Assistant (chiaro o scuro)");
  change({ language: "auto" });
  assert.equal(languageOf(preview), "it");
  editor.hass = preview.hass = { ...hass, language: "fr" };
  assert.equal(form.lang, "fr");
  assert.equal(languageOf(preview), "fr");
  change({ language: "it" });
  change({ language: "fr" });
  assert.equal(emitted.language, "fr");
  assert.equal(languageOf(preview), "fr");
  assert.equal(window.customCards[0].name, "Carte OPNsense");
  document.documentElement.lang = "it-IT";
  assert.equal(window.customCards[0].name, "Scheda OPNsense");
  assert.match(window.customCards[0].description, /interfacce/);
});

test("HACS discovery, uptime, locale formatting and gateway states", () => {
  const hass = integration();
  const card = render({}, hass);
  assert.match(markup(card), /Firewall A/);
  assert.match(markup(card), /3 j 4 h/);
  assert.match(markup(card), /4,2 Go \/ 16,0 Go/);
  assert.match(markup(card), /12\u202f345/);
  assert.doesNotMatch(markup(card), /sensor\.(other|second|opnsense)_|data-entity="sensor.fb_memory_(buffers|swap)/);
  card.setConfig({ language: "it" });
  assert.match(markup(card), /3 g 4 h/);
  assert.match(markup(card), /12\.345/);
  assert.match(markup(card), /4,2 GB \/ 16,0 GB/);
  assert.match(markup(card), /1,25/);
  assert.match(markup(card), /5,00 Mbit\/s/);
  assert.match(markup(card), /Latenza e perdita di pacchetti/);
  assert.match(markup(card), /gateway degradato/);
  assert.match(markup(card), /Online · senza monitoraggio/);
  assert.match(markup(card), /class="opn-if bad"[^>]+>.*Disconnessa/);
  assert.match(markup(card), /Aggiornamento/);
  assert.match(markup(card), /26\.7\.8/);
  assert.match(markup(card), /Avvisi/);
  assert.match(markup(card), /data-entity="sensor.fb_gateway_wan_status".*\n.*<b>WAN<\/b>/);
  hass.states["sensor.fb_gateway_wan_status"] = state("down", { friendly_name: "OPNsense Gateway WAN <A> Status" });
  card.hass = hass;
  assert.match(markup(card), /<ha-card[^>]+srv-alert/);
  assert.match(markup(card), /WAN &lt;A&gt; offline/);
  assert.match(markup(card), /1 gateway offline/);
  hass.states["sensor.fb_gateway_lan_status"] = state("offline");
  card.hass = hass;
  assert.match(markup(card), /2 gateway offline/);
  card.setConfig({ language: "fr" });
  assert.match(markup(card), /2 passerelles hors ligne/);
  card.setConfig({ language: "it", device: "second" });
  assert.match(markup(card), /Firewall B/);
  assert.doesNotMatch(markup(card), /Firewall A|sensor\.fb_/);
});

test("REST discovery, history rates, sorting, optional services and localized probes", async () => {
  const hass = rest();
  const card = render({ language: "it", prefix: "other" }, hass);
  await Promise.resolve();
  const html = markup(card);
  const gatewayNames = [...html.matchAll(/class="opn-gw [^"]+"[^>]+>\s*<i[^>]+><\/i><div class="opn-n"><b>([^<]+)/g)].map((row) => row[1]);
  assert.deepEqual(gatewayNames, ["WAN", "LAN", "alpha", "ÉCHO"]);
  assert.match(html, /Online<\/small>/);
  assert.match(html, /Perdita<\/small>/);
  assert.match(html, /Non disponibile<\/small>/);
  assert.match(html, /Disabilitato<\/small>/);
  assert.match(html, /Sonda 1/);
  assert.match(html, /Ricezione · invio/);
  assert.match(html, /1 kbit\/s/);
  assert.match(html, /Da installare/);
  assert.doesNotMatch(html, /data-entity="sensor.other_memory_swap_used_percentage"/);
  card.setConfig({ language: "fr", prefix: "other", interfaces: ["LAN"], show_actions: false });
  assert.match(markup(card), /Sonde 1/);
  assert.match(markup(card), /Reçu · envoyé/);
  assert.equal((markup(card).match(/class="opn-if /g) || []).length, 1);
  assert.doesNotMatch(markup(card), /data-act=/);
});

test("actions require two clicks and keep their service targets in both data modes", () => {
  const { Card, timers } = loadCard();
  for (const [hass, config, domain, services, target] of [
    [integration(), { language: "it" }, "opnsense", ["system_reboot", "system_halt"], { device_id: "fw" }],
    [rest(), { language: "fr", prefix: "other" }, "rest_command", ["opnsense_reboot", "opnsense_halt"], {}],
  ]) {
    const calls = [];
    hass.callService = (...args) => calls.push(args);
    const card = render(config, hass, Card);
    const click = (action) => {
      const event = new Event("click");
      Object.defineProperty(event, "target", { value: { closest: () => ({ dataset: { act: action } }) } });
      card.shadowRoot.dispatchEvent(event);
    };
    for (const [i, action] of ["reboot", "halt"].entries()) {
      click(action);
      assert.equal(calls.length, i);
      assert.match(markup(card), config.language === "it" ? /aria-label="Conferma: / : /aria-label="Confirmer : /);
      assert.equal([...timers.values()].at(-1).duration, 5000);
      click(action);
      assert.deepEqual(JSON.parse(JSON.stringify(calls[i])), [domain, services[i], target]);
    }
    click("halt");
    [...timers.values()].at(-1).fn();
    click("halt");
    assert.equal(calls.length, 2);
  }
});

test("missing and unavailable entities render safely in the selected language", () => {
  const hass = integration();
  hass.states["sensor.fb_gateway_wan_status"] = state("unavailable");
  hass.states["sensor.fb_interface_wan_status"] = state("unknown");
  hass.states["update.fb_firmware"] = state("unavailable");
  const card = render({ language: "it" }, hass);
  assert.match(markup(card), /Non disponibile/);
  assert.match(markup(card), /Sconosciuto/);
  assert.doesNotMatch(markup(card), /Aggiornato|Disconnessa/);
  assert.match(markup(card), /—/);
  assert.match(markup(render({ language: "it" }, { states: {} })), /Nessun firewall OPNsense trovato/);
  assert.match(markup(render({}, { states: {} })), /Aucun pare-feu OPNsense trouvé/);
});

test("each locale has all French keys and the same interpolation variables", () => {
  const { text } = loadCard();
  function check(reference, translation) {
    assert.deepEqual(Object.keys(translation).sort(), Object.keys(reference).sort());
    for (const [key, value] of Object.entries(reference)) {
      if (typeof value === "object") check(value, translation[key]);
      else {
        assert.equal(typeof translation[key], "string", key);
        assert.ok(translation[key].trim(), key);
        const variables = (message) => (message.match(/\{\w+\}/g) || []).sort();
        assert.deepEqual(variables(translation[key]), variables(value), key);
      }
    }
  }
  for (const locale of Object.values(text)) check(text.fr, locale);
});
