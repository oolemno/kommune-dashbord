// Kommune-dashbord datautforskning
// Kjør: npx tsx utforsk-kommune.ts

const OSLO = "0301";
const LILLESAND = "4215";
const KOMMUNER = [
  { nr: OSLO, navn: "Oslo" },
  { nr: LILLESAND, navn: "Lillesand" },
];

const SSB_BASE = "https://data.ssb.no/api/v0/no/table";
const TIMEOUT_MS = 15_000;

// Rate limiting for SSB
let lastSsbCall = 0;
async function ssbDelay() {
  const now = Date.now();
  const diff = now - lastSsbCall;
  if (diff < 1000) {
    await new Promise((r) => setTimeout(r, 1000 - diff));
  }
  lastSsbCall = Date.now();
}

// Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// SSB metadata (GET)
async function ssbMetadata(tableId: string): Promise<any> {
  await ssbDelay();
  const url = `${SSB_BASE}/${tableId}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`SSB metadata ${tableId}: ${res.status}`);
  return res.json();
}

// SSB data (POST)
async function ssbQuery(tableId: string, query: any): Promise<any> {
  await ssbDelay();
  const url = `${SSB_BASE}/${tableId}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, response: { format: "json-stat2" } }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SSB query ${tableId}: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Find region codes that match our kommunenummer in metadata
function findRegionCodes(
  meta: any,
  kommuneNr: string
): { code: string; text: string } | null {
  for (const v of meta.variables || []) {
    if (
      v.code?.toLowerCase().includes("region") ||
      v.code?.toLowerCase().includes("kommune") ||
      v.text?.toLowerCase().includes("region") ||
      v.text?.toLowerCase().includes("kommune")
    ) {
      for (let i = 0; i < (v.values?.length || 0); i++) {
        if (v.values[i] === kommuneNr) {
          return { code: v.code, text: v.valueTexts?.[i] || kommuneNr };
        }
      }
    }
  }
  return null;
}

// Find the time variable and get last N values
function findTimeValues(meta: any, lastN: number): { code: string; values: string[] } | null {
  for (const v of meta.variables || []) {
    if (
      v.code?.toLowerCase().includes("tid") ||
      v.code?.toLowerCase().includes("år") ||
      v.code?.toLowerCase() === "tid" ||
      v.text?.toLowerCase().includes("år") ||
      v.text?.toLowerCase().includes("tid")
    ) {
      const vals = v.values || [];
      return { code: v.code, values: vals.slice(-lastN) };
    }
  }
  return null;
}

// Parse json-stat2 into a simple array of records
function parseJsonStat2(data: any): Record<string, string | number>[] {
  // json-stat2 has a single dataset at root level or nested
  const ds = data.id ? data : Object.values(data)[0] as any;
  if (!ds || !ds.dimension || !ds.value) return [];

  const dims = ds.id as string[];
  const sizes = ds.size as number[];
  const values = ds.value as (number | null)[];

  // Build category labels
  const categories: Record<string, { codes: string[]; labels: Record<string, string> }> = {};
  for (const dimId of dims) {
    const dim = ds.dimension[dimId];
    const cat = dim.category;
    const codes = cat.index
      ? (typeof cat.index === "object" && !Array.isArray(cat.index)
          ? Object.entries(cat.index).sort((a: any, b: any) => a[1] - b[1]).map((e: any) => e[0])
          : cat.index)
      : Object.keys(cat.label || {});
    categories[dimId] = { codes: codes as string[], labels: cat.label || {} };
  }

  const records: Record<string, string | number>[] = [];
  const total = values.length;

  for (let i = 0; i < total; i++) {
    const record: Record<string, string | number> = {};
    let idx = i;
    for (let d = dims.length - 1; d >= 0; d--) {
      const dimId = dims[d];
      const size = sizes[d];
      const catIdx = idx % size;
      idx = Math.floor(idx / size);
      const code = categories[dimId].codes[catIdx];
      record[dimId + "_code"] = code;
      record[dimId] = categories[dimId].labels[code] || code;
    }
    record["value"] = values[i] ?? NaN;
    records.push(record);
  }
  return records;
}

// ---- Reporting ----
interface SourceResult {
  name: string;
  category: string;
  status: "✅" | "🟡" | "❌";
  url: string;
  auth: string;
  format: string;
  coverage: string;
  frequency: string;
  latestData: string;
  oslo: string;
  lillesand: string;
  quality: string;
  gotchas: string;
}

const results: SourceResult[] = [];
const reportSections: string[] = [];

function logSection(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function logSubSection(title: string) {
  console.log(`\n--- ${title} ---`);
}

function addResult(r: SourceResult) {
  results.push(r);
}

// ============================================================
// 1. SSB KOSTRA
// ============================================================

async function kostraNettoDriftsresultat() {
  logSubSection("1.1 Netto driftsresultat (tabell 12362)");
  try {
    const meta = await ssbMetadata("12362");
    const regionVar = meta.variables.find((v: any) =>
      v.code?.toLowerCase().includes("region") || v.code?.toLowerCase().includes("kontekst")
    ) || meta.variables.find((v: any) => v.text?.toLowerCase().includes("region"));

    console.log("Variabler:", meta.variables.map((v: any) => `${v.code} (${v.text})`).join(", "));

    // Find region variable with our kommuner
    let regionCode = "";
    let osloFound = false;
    let lillesandFound = false;
    for (const v of meta.variables) {
      for (const val of v.values || []) {
        if (val === OSLO) { osloFound = true; regionCode = v.code; }
        if (val === LILLESAND) { lillesandFound = true; }
      }
    }

    console.log(`Region-variabel: ${regionCode}, Oslo funnet: ${osloFound}, Lillesand funnet: ${lillesandFound}`);

    const timeInfo = findTimeValues(meta, 3);
    console.log(`Tid: ${timeInfo?.code}, verdier: ${timeInfo?.values.join(", ")}`);

    // Find the "netto driftsresultat" variable
    let contentsCode = "";
    let ndrCode = "";
    for (const v of meta.variables) {
      if (v.code?.toLowerCase().includes("contents") || v.code?.toLowerCase() === "statistikkvariabel") {
        contentsCode = v.code;
        for (let i = 0; i < v.values.length; i++) {
          const txt = (v.valueTexts?.[i] || "").toLowerCase();
          if (txt.includes("netto driftsresultat") && txt.includes("prosent")) {
            ndrCode = v.values[i];
            console.log(`Fant netto driftsresultat-variabel: ${v.values[i]} = ${v.valueTexts[i]}`);
          }
        }
        // Log first 10 available statistics
        console.log("Tilgjengelige statistikkvariabler (først 10):");
        for (let i = 0; i < Math.min(10, v.values.length); i++) {
          console.log(`  ${v.values[i]}: ${v.valueTexts?.[i]}`);
        }
        if (v.values.length > 10) console.log(`  ... og ${v.values.length - 10} til`);
      }
    }

    if (!regionCode || !timeInfo) {
      console.log("Kunne ikke finne riktige variabler");
      addResult({
        name: "Netto driftsresultat",
        category: "KOSTRA",
        status: "🟡",
        url: `${SSB_BASE}/12362`,
        auth: "Nei",
        format: "json-stat2",
        coverage: "Ukjent",
        frequency: "Årlig",
        latestData: "Ukjent",
        oslo: "Metadata funnet, men variabelkoder uklare",
        lillesand: "Metadata funnet, men variabelkoder uklare",
        quality: "Trenger manuell undersøkelse av variabelkoder",
        gotchas: "Kompleks tabellstruktur",
      });
      return;
    }

    // Build query for all contents if ndrCode not found
    const queryFilter: any[] = [
      { code: regionCode, selection: { filter: "item", values: [OSLO, LILLESAND] } },
      { code: timeInfo.code, selection: { filter: "item", values: timeInfo.values } },
    ];

    // Add other mandatory variables
    for (const v of meta.variables) {
      if (v.code !== regionCode && v.code !== timeInfo.code) {
        if (ndrCode && v.code === contentsCode) {
          queryFilter.push({ code: v.code, selection: { filter: "item", values: [ndrCode] } });
        } else if (v.values.length <= 5) {
          queryFilter.push({ code: v.code, selection: { filter: "item", values: v.values.slice(0, 3) } });
        } else {
          queryFilter.push({ code: v.code, selection: { filter: "item", values: [v.values[0]] } });
        }
      }
    }

    const data = await ssbQuery("12362", queryFilter);
    const records = parseJsonStat2(data);
    console.log(`Mottok ${records.length} datapunkter`);
    if (records.length > 0) {
      console.log("Eksempel:", JSON.stringify(records.slice(0, 4), null, 2));
    }

    const osloData = records.filter((r) =>
      Object.values(r).some((v) => typeof v === "string" && v.includes("Oslo"))
    );
    const lilData = records.filter((r) =>
      Object.values(r).some((v) => typeof v === "string" && (v.includes("Lillesand") || v.includes("4215")))
    );

    addResult({
      name: "Netto driftsresultat",
      category: "KOSTRA",
      status: "✅",
      url: `${SSB_BASE}/12362`,
      auth: "Nei",
      format: "json-stat2",
      coverage: osloFound && lillesandFound ? "Alle kommuner" : "Varierer",
      frequency: "Årlig",
      latestData: timeInfo.values[timeInfo.values.length - 1],
      oslo: osloData.length > 0 ? osloData.map((r) => `${r.Tid || r.tid || ""}: ${r.value}`).join(", ") : "Ingen data",
      lillesand: lilData.length > 0 ? lilData.map((r) => `${r.Tid || r.tid || ""}: ${r.value}`).join(", ") : "Ingen data",
      quality: "God – standardisert KOSTRA-tabell",
      gotchas: "Mange statistikkvariabler i samme tabell, må velge riktig kode",
    });
  } catch (e: any) {
    console.log(`FEIL: ${e.message}`);
    addResult({
      name: "Netto driftsresultat",
      category: "KOSTRA",
      status: "❌",
      url: `${SSB_BASE}/12362`,
      auth: "Nei",
      format: "json-stat2",
      coverage: "Ukjent",
      frequency: "Årlig",
      latestData: "Ukjent",
      oslo: `Feil: ${e.message.slice(0, 100)}`,
      lillesand: `Feil: ${e.message.slice(0, 100)}`,
      quality: "Ikke testet",
      gotchas: e.message.slice(0, 200),
    });
  }
}

// Generic SSB table explorer
async function exploreSsbTable(
  tableId: string,
  name: string,
  category: string,
  filterContents?: (v: any) => string[], // function to pick content codes
  extraVarFilter?: (v: any) => { code: string; values: string[] }[] | null,
  yearsBack = 3
) {
  logSubSection(`${name} (tabell ${tableId})`);
  try {
    const meta = await ssbMetadata(tableId);
    console.log("Variabler:", meta.variables.map((v: any) => `${v.code} (${v.text}, ${v.values?.length} verdier)`).join(", "));

    // Find region variable
    let regionCode = "";
    let osloFound = false;
    let lillesandFound = false;
    for (const v of meta.variables) {
      for (const val of v.values || []) {
        if (val === OSLO) { osloFound = true; regionCode = v.code; }
        if (val === LILLESAND) { lillesandFound = true; }
      }
    }

    if (!regionCode) {
      // Try alternative kommunenummer formats
      for (const v of meta.variables) {
        for (const val of v.values || []) {
          if (val === "K" + OSLO || val === "KA" + OSLO) { osloFound = true; regionCode = v.code; }
          if (val === "K" + LILLESAND || val === "KA" + LILLESAND) { lillesandFound = true; }
        }
      }
    }

    if (!regionCode) {
      console.log("Kommunenumre ikke funnet i tabellen. Tilgjengelige regionverdier:");
      for (const v of meta.variables) {
        if (v.code?.toLowerCase().includes("region") || v.text?.toLowerCase().includes("region")) {
          console.log(`  ${v.code}: ${v.values?.slice(0, 5).join(", ")}... (${v.values?.length} total)`);
        }
      }
      addResult({
        name, category, status: "🟡",
        url: `${SSB_BASE}/${tableId}`, auth: "Nei", format: "json-stat2",
        coverage: "Kommunenumre ikke funnet – mulig fylkes/landsnivå",
        frequency: "Årlig", latestData: "Ukjent",
        oslo: "Kommunenummer ikke i tabell",
        lillesand: "Kommunenummer ikke i tabell",
        quality: "Tabell finnes men dekker kanskje ikke kommunenivå",
        gotchas: "Sjekk om tabellen har kommunenivå-data",
      });
      return;
    }

    console.log(`Region: ${regionCode}, Oslo: ${osloFound}, Lillesand: ${lillesandFound}`);

    const timeInfo = findTimeValues(meta, yearsBack);
    console.log(`Tid: ${timeInfo?.code}, siste ${yearsBack}: ${timeInfo?.values.join(", ")}`);

    // Build query
    const kommuneValues = [OSLO];
    if (lillesandFound) kommuneValues.push(LILLESAND);
    // Also try K-prefix
    if (!osloFound) {
      for (const v of meta.variables) {
        if (v.code === regionCode) {
          for (const val of v.values) {
            if (val.includes(OSLO)) kommuneValues[0] = val;
            if (val.includes(LILLESAND)) kommuneValues.push(val);
          }
        }
      }
    }

    const queryFilter: any[] = [
      { code: regionCode, selection: { filter: "item", values: kommuneValues } },
    ];

    if (timeInfo) {
      queryFilter.push({ code: timeInfo.code, selection: { filter: "item", values: timeInfo.values } });
    }

    // Handle contents variable
    let contentsLogged = false;
    for (const v of meta.variables) {
      if (v.code === regionCode || v.code === timeInfo?.code) continue;

      if (v.code?.toLowerCase().includes("contents") || v.code?.toLowerCase() === "statistikkvariabel" ||
          v.text?.toLowerCase().includes("statistikk")) {
        // Log available contents
        if (!contentsLogged) {
          console.log("Tilgjengelige statistikkvariabler:");
          for (let i = 0; i < Math.min(15, v.values.length); i++) {
            console.log(`  ${v.values[i]}: ${v.valueTexts?.[i]}`);
          }
          if (v.values.length > 15) console.log(`  ... og ${v.values.length - 15} til`);
          contentsLogged = true;
        }

        if (filterContents) {
          const selected = filterContents(v);
          if (selected.length > 0) {
            queryFilter.push({ code: v.code, selection: { filter: "item", values: selected } });
            continue;
          }
        }
        // Default: pick first 3
        queryFilter.push({ code: v.code, selection: { filter: "item", values: v.values.slice(0, 3) } });
      } else if (extraVarFilter) {
        const extra = extraVarFilter(v);
        if (extra) {
          for (const e of extra) {
            if (e.code === v.code) {
              queryFilter.push({ code: v.code, selection: { filter: "item", values: e.values } });
            }
          }
        } else if (v.values.length <= 10) {
          queryFilter.push({ code: v.code, selection: { filter: "item", values: v.values } });
        } else {
          queryFilter.push({ code: v.code, selection: { filter: "item", values: [v.values[0]] } });
        }
      } else {
        if (v.values.length <= 10) {
          queryFilter.push({ code: v.code, selection: { filter: "item", values: v.values } });
        } else {
          queryFilter.push({ code: v.code, selection: { filter: "item", values: v.values.slice(0, 3) } });
        }
      }
    }

    const data = await ssbQuery(tableId, queryFilter);
    const records = parseJsonStat2(data);
    console.log(`Mottok ${records.length} datapunkter`);

    // Find records per kommune
    const osloRecords = records.filter((r) =>
      Object.values(r).some((v) => typeof v === "string" && (v.includes("Oslo") || v === OSLO))
    );
    const lilRecords = records.filter((r) =>
      Object.values(r).some((v) => typeof v === "string" && (v.includes("Lillesand") || v === LILLESAND))
    );

    // Format a compact summary
    const formatRecords = (recs: Record<string, string | number>[]) => {
      if (recs.length === 0) return "Ingen data";
      return recs.slice(0, 6).map((r) => {
        const parts: string[] = [];
        for (const [k, v] of Object.entries(r)) {
          if (k.endsWith("_code") || k === regionCode) continue;
          if (typeof v === "string" && (v.includes("Oslo") || v.includes("Lillesand"))) continue;
          parts.push(`${v}`);
        }
        return parts.join(" | ");
      }).join("; ");
    };

    if (records.length > 0) {
      console.log("Første rad (alle felter):", JSON.stringify(records[0], null, 2));
    }
    console.log(`Oslo: ${osloRecords.length} rader, Lillesand: ${lilRecords.length} rader`);

    addResult({
      name, category,
      status: osloRecords.length > 0 ? "✅" : "🟡",
      url: `${SSB_BASE}/${tableId}`,
      auth: "Nei",
      format: "json-stat2",
      coverage: lillesandFound ? "Alle kommuner" : "Varierer (Lillesand mangler)",
      frequency: "Årlig",
      latestData: timeInfo?.values[timeInfo.values.length - 1] || "Ukjent",
      oslo: formatRecords(osloRecords),
      lillesand: formatRecords(lilRecords),
      quality: "God – SSB standardtabell",
      gotchas: lillesandFound ? "Ingen spesielle" : "Ikke alle kommuner har data",
    });

    return { meta, records, osloRecords, lilRecords };
  } catch (e: any) {
    console.log(`FEIL: ${e.message}`);
    addResult({
      name, category, status: "❌",
      url: `${SSB_BASE}/${tableId}`, auth: "Nei", format: "json-stat2",
      coverage: "Ukjent", frequency: "Årlig", latestData: "Ukjent",
      oslo: `Feil: ${e.message.slice(0, 100)}`,
      lillesand: `Feil: ${e.message.slice(0, 100)}`,
      quality: "Ikke testet",
      gotchas: e.message.slice(0, 200),
    });
    return null;
  }
}

// ============================================================
// Non-SSB sources
// ============================================================

async function exploreValgresultat() {
  logSection("7. POLITIKK – Valgdirektoratet");

  // Try different API URLs
  const urls = [
    "https://valgresultat.no/api/2023/ko",
    "https://valgresultat.no/api/2023/ko/0301",
    "https://data.valg.no/api/2023/ko/0301",
    "https://valgresultat.no/api",
  ];

  for (const url of urls) {
    logSubSection(`Prøver: ${url}`);
    try {
      const res = await fetchWithTimeout(url);
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Struktur:", JSON.stringify(data, null, 2).slice(0, 1000));

        // If we got data for Oslo
        if (typeof data === "object") {
          addResult({
            name: "Kommunevalg 2023",
            category: "Valg",
            status: "✅",
            url,
            auth: "Nei",
            format: "JSON",
            coverage: "Alle kommuner",
            frequency: "Hvert valg",
            latestData: "2023",
            oslo: JSON.stringify(data).slice(0, 200),
            lillesand: "Sjekk med 4215",
            quality: "Valgresultat.no – offisiell kilde",
            gotchas: "API-struktur kan variere mellom valg",
          });
          break;
        }
      }
    } catch (e: any) {
      console.log(`Feil: ${e.message}`);
    }
  }

  // Try kommunevalg for Lillesand
  logSubSection("Lillesand kommunevalg 2023");
  try {
    const res = await fetchWithTimeout("https://valgresultat.no/api/2023/ko/4215");
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log("Lillesand:", JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (e: any) {
    console.log(`Feil: ${e.message}`);
  }

  // Stortingsvalg 2021
  logSubSection("Stortingsvalg 2021");
  try {
    const res = await fetchWithTimeout("https://valgresultat.no/api/2021/st/0301");
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log("Oslo stortingsvalg:", JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (e: any) {
    console.log(`Feil: ${e.message}`);
  }
}

async function exploreBrreg() {
  logSection("6.4 Brønnøysundregistrene – nyetableringer/konkurser");

  for (const kommune of KOMMUNER) {
    logSubSection(`${kommune.navn} – nyregistreringer`);
    try {
      const dato = new Date();
      dato.setFullYear(dato.getFullYear() - 1);
      const fraDate = dato.toISOString().split("T")[0];

      const url = `https://data.brreg.no/enhetsregisteret/api/enheter?kommunenummer=${kommune.nr}&registrertIMottakendeRegisterDato=${fraDate}&size=5`;
      const res = await fetchWithTimeout(url);
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`Total enheter funnet: ${data.page?.totalElements || "ukjent"}`);
        if (data._embedded?.enheter) {
          console.log("Eksempel:", JSON.stringify(data._embedded.enheter[0], null, 2).slice(0, 500));
        }

        addResult({
          name: `Nyregistreringer ${kommune.navn}`,
          category: "Næringsliv",
          status: "✅",
          url: `https://data.brreg.no/enhetsregisteret/api/enheter`,
          auth: "Nei",
          format: "JSON (HAL)",
          coverage: "Alle kommuner",
          frequency: "Daglig",
          latestData: "Sanntid",
          oslo: kommune.nr === OSLO ? `${data.page?.totalElements || 0} enheter siste år` : "",
          lillesand: kommune.nr === LILLESAND ? `${data.page?.totalElements || 0} enheter siste år` : "",
          quality: "God – offisielt register",
          gotchas: "Paginering nødvendig for store resultatsett, filtreringsparametre kan variere",
        });
      }
    } catch (e: any) {
      console.log(`Feil: ${e.message}`);
    }
  }
}

async function exploreFHI() {
  logSection("4. HELSE – FHI Folkehelseprofiler");

  const urls = [
    { url: "https://statistikk.fhi.no/api/open/v1/data", name: "FHI statistikk API v1" },
    { url: "https://khs.fhi.no/api", name: "KHS API" },
    { url: "https://data.fhi.no/api", name: "data.fhi.no API" },
    { url: "https://statistikk.fhi.no/api", name: "FHI statistikk API root" },
    { url: "https://statistikk.fhi.no", name: "FHI statistikk" },
  ];

  for (const { url, name } of urls) {
    logSubSection(`Prøver: ${name} (${url})`);
    try {
      const res = await fetchWithTimeout(url, {}, 10000);
      console.log(`Status: ${res.status}, Content-Type: ${res.headers.get("content-type")}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const data = await res.json();
          console.log("Respons:", JSON.stringify(data, null, 2).slice(0, 1000));
        } else {
          const text = await res.text();
          console.log("Respons (tekst):", text.slice(0, 500));
        }
      }
    } catch (e: any) {
      console.log(`Feil: ${e.message}`);
    }
  }

  // Try FHI kommunehelsa API
  logSubSection("FHI Kommunehelsa statistikkbank");
  try {
    const res = await fetchWithTimeout("https://khs.fhi.no/webapi/jsonclient/v1", {}, 10000);
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log("KHS API:", JSON.stringify(data, null, 2).slice(0, 1000));
    }
  } catch (e: any) {
    console.log(`Feil: ${e.message}`);
  }

  // Try PXWEB-style metadata
  logSubSection("FHI PxWeb-style");
  try {
    const res = await fetchWithTimeout("https://khs.fhi.no/webapi/jsonclient/v1/no/folkehelseprofil", {}, 10000);
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log("Folkehelseprofil:", JSON.stringify(data, null, 2).slice(0, 1000));
    }
  } catch (e: any) {
    console.log(`Feil: ${e.message}`);
  }

  addResult({
    name: "FHI Folkehelseprofiler",
    category: "Helse",
    status: "🟡",
    url: "https://statistikk.fhi.no / https://khs.fhi.no",
    auth: "Ukjent",
    format: "Ukjent – tester API-tilgjengelighet",
    coverage: "Alle kommuner (via profiler)",
    frequency: "Årlig",
    latestData: "Ukjent",
    oslo: "Se API-test over",
    lillesand: "Se API-test over",
    quality: "Profilrapporter finnes, API-tilgang uklar",
    gotchas: "FHI har endret API-struktur flere ganger, PDF-profiler alltid tilgjengelig",
  });
}

async function exploreHelsedir() {
  logSubSection("4.2 Fastlegedekning – Helsedirektoratet");
  const urls = [
    "https://data.helsedirektoratet.no/api",
    "https://statistikk.helsedirektoratet.no/api",
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {}, 10000);
      console.log(`${url}: Status ${res.status}`);
      if (res.ok) {
        const data = await res.text();
        console.log("Respons:", data.slice(0, 500));
      }
    } catch (e: any) {
      console.log(`${url}: Feil – ${e.message}`);
    }
  }

  addResult({
    name: "Fastlegedekning",
    category: "Helse",
    status: "🟡",
    url: "https://data.helsedirektoratet.no",
    auth: "Ukjent",
    format: "Ukjent",
    coverage: "Alle kommuner (via statistikkbank)",
    frequency: "Kvartalsvis",
    latestData: "Ukjent",
    oslo: "API-tilgang under utforskning",
    lillesand: "API-tilgang under utforskning",
    quality: "Data finnes, men API-tilgang usikker",
    gotchas: "Kan kreve nedlasting av CSV/Excel fra statistikkbanken",
  });
}

async function exploreKlima() {
  logSection("8. KLIMA – Miljødirektoratet");
  logSubSection("8.1 Klimagassutslipp per kommune");

  const urls = [
    "https://api.klimagassutslipp.miljodirektoratet.no",
    "https://klimagassutslipp.miljodirektoratet.no/api",
    "https://klimagassutslipp.miljodirektoratet.no/api/utslipp/kommune",
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {}, 10000);
      console.log(`${url}: Status ${res.status}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const data = await res.json();
          console.log("Respons:", JSON.stringify(data, null, 2).slice(0, 1000));
        } else {
          console.log("Respons (tekst):", (await res.text()).slice(0, 500));
        }
      }
    } catch (e: any) {
      console.log(`Feil: ${e.message}`);
    }
  }

  // Try with kommune parameter
  logSubSection("Miljødirektoratet – med kommunenummer");
  try {
    const url = `https://klimagassutslipp.miljodirektoratet.no/api/utslipp?kommunenummer=${OSLO}`;
    const res = await fetchWithTimeout(url, {}, 10000);
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log("Oslo utslipp:", JSON.stringify(data, null, 2).slice(0, 1000));
    }
  } catch (e: any) {
    console.log(`Feil: ${e.message}`);
  }

  addResult({
    name: "Klimagassutslipp",
    category: "Klima",
    status: "🟡",
    url: "https://klimagassutslipp.miljodirektoratet.no",
    auth: "Ukjent",
    format: "Ukjent",
    coverage: "Alle kommuner",
    frequency: "Årlig",
    latestData: "Ukjent",
    oslo: "Under utforskning",
    lillesand: "Under utforskning",
    quality: "Data finnes via nettside, API usikkert",
    gotchas: "Kan være nødvendig å skrape eller bruke nedlastbar fil",
  });
}

async function exploreUdir() {
  logSection("5.2 SKOLE – Utdanningsdirektoratet");
  logSubSection("Grunnskolepoeng");

  const urls = [
    "https://data-nsr.udir.no/api",
    "https://data.udir.no/api",
    "https://data-nsr.udir.no/v4",
    "https://data-nsr.udir.no",
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {}, 10000);
      console.log(`${url}: Status ${res.status}`);
      if (res.ok) {
        const data = await res.text();
        console.log("Respons:", data.slice(0, 500));
      }
    } catch (e: any) {
      console.log(`${url}: Feil – ${e.message}`);
    }
  }

  addResult({
    name: "Grunnskolepoeng",
    category: "Skole",
    status: "🟡",
    url: "https://data-nsr.udir.no / https://data.udir.no",
    auth: "Ukjent",
    format: "Ukjent",
    coverage: "Alle kommuner",
    frequency: "Årlig",
    latestData: "Ukjent",
    oslo: "API-tilgang under utforskning",
    lillesand: "API-tilgang under utforskning",
    quality: "Data finnes, API-tilgang usikker",
    gotchas: "Skoleporten har data men kanskje ikke åpent API",
  });
}

async function exploreNKOM() {
  logSection("9. INFRASTRUKTUR – NKOM bredbånd");
  logSubSection("Bredbåndsdekning");

  const urls = [
    "https://ekomstatistikken.nkom.no/api",
    "https://ekomstatistikken.nkom.no",
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {}, 10000);
      console.log(`${url}: Status ${res.status}`);
      if (res.ok) {
        const data = await res.text();
        console.log("Respons:", data.slice(0, 500));
      }
    } catch (e: any) {
      console.log(`${url}: Feil – ${e.message}`);
    }
  }

  addResult({
    name: "Bredbåndsdekning",
    category: "Infrastruktur",
    status: "🟡",
    url: "https://ekomstatistikken.nkom.no",
    auth: "Ukjent",
    format: "Ukjent",
    coverage: "Alle kommuner",
    frequency: "Årlig",
    latestData: "Ukjent",
    oslo: "Under utforskning",
    lillesand: "Under utforskning",
    quality: "NKOM publiserer data, API-tilgang usikker",
    gotchas: "Kan kreve CSV-nedlasting",
  });
}

async function exploreEntur() {
  logSubSection("9.2 Kollektiv – Entur");
  try {
    // NSR (Nasjonalt stoppestedsregister) API
    const url = `https://api.entur.io/stop-places/v1/read/stop-places?municipalityReference=KVE:TopographicPlace:${OSLO}&size=1`;
    const res = await fetchWithTimeout(url, {
      headers: { "ET-Client-Name": "kommune-dashbord-utforskning" },
    }, 10000);
    console.log(`Entur NSR: Status ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log("Respons:", JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (e: any) {
    console.log(`Feil: ${e.message}`);
  }

  // Try GraphQL
  logSubSection("Entur GraphQL");
  try {
    const query = `{
      stopPlaces(municipalityReference: "KVE:TopographicPlace:0301", size: 5) {
        id
        name { value }
        stopPlaceType
      }
    }`;
    const res = await fetchWithTimeout("https://api.entur.io/stop-places/v1/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ET-Client-Name": "kommune-dashbord-utforskning",
      },
      body: JSON.stringify({ query }),
    }, 10000);
    console.log(`Entur GraphQL: Status ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log("Holdeplasser:", JSON.stringify(data, null, 2).slice(0, 500));
    }
  } catch (e: any) {
    console.log(`Feil: ${e.message}`);
  }

  addResult({
    name: "Kollektivtilbud (Entur)",
    category: "Infrastruktur",
    status: "🟡",
    url: "https://api.entur.io/stop-places/v1",
    auth: "Nei (ET-Client-Name header)",
    format: "JSON / GraphQL",
    coverage: "Alle kommuner",
    frequency: "Løpende",
    latestData: "Sanntid",
    oslo: "Under utforskning",
    lillesand: "Under utforskning",
    quality: "Bra API, men mest stoppesteder – ikke overordnet statistikk",
    gotchas: "GraphQL-basert, krever litt mer arbeid å aggregere",
  });
}

async function exploreROBEK() {
  logSection("12. ROBEK-status");
  logSubSection("Kommuner under statlig kontroll");

  // Try to find a machine-readable ROBEK list
  const urls = [
    "https://data.norge.no/api/3/action/package_search?q=robek",
    "https://hotell.difi.no/api/json/krd/robek",
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {}, 10000);
      console.log(`${url}: Status ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Respons:", JSON.stringify(data, null, 2).slice(0, 1000));
      }
    } catch (e: any) {
      console.log(`Feil: ${e.message}`);
    }
  }

  addResult({
    name: "ROBEK-status",
    category: "Kommuneøkonomi",
    status: "🟡",
    url: "https://www.regjeringen.no/robek",
    auth: "Nei",
    format: "HTML/PDF – usikkert om maskinlesbar",
    coverage: "Alle kommuner",
    frequency: "Løpende",
    latestData: "Ukjent",
    oslo: "Under utforskning",
    lillesand: "Under utforskning",
    quality: "Liste finnes, men kanskje ikke API",
    gotchas: "Kan kreve skraping av regjeringen.no",
  });
}

// ============================================================
// Generate report
// ============================================================

function generateReport(): string {
  const lines: string[] = [];
  lines.push("# Kommune-dashbord: Datautforskning – Rapport");
  lines.push("");
  lines.push(`**Generert:** ${new Date().toISOString().split("T")[0]}`);
  lines.push(`**Testkommuner:** Oslo (0301) og Lillesand (4215)`);
  lines.push("");

  // Summary table
  lines.push("## Sammendrag av datakilder");
  lines.push("");
  lines.push("| # | Kilde | Kategori | Status | Format | Dekning |");
  lines.push("|---|-------|----------|--------|--------|---------|");
  results.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.name} | ${r.category} | ${r.status} | ${r.format} | ${r.coverage} |`);
  });
  lines.push("");

  // Detailed results
  lines.push("## Detaljerte resultater");
  lines.push("");

  let currentCategory = "";
  for (const r of results) {
    if (r.category !== currentCategory) {
      currentCategory = r.category;
      lines.push(`### ${currentCategory}`);
      lines.push("");
    }

    lines.push(`#### ${r.status} ${r.name}`);
    lines.push("");
    lines.push(`- **URL:** ${r.url}`);
    lines.push(`- **Autentisering:** ${r.auth}`);
    lines.push(`- **Format:** ${r.format}`);
    lines.push(`- **Dekning:** ${r.coverage}`);
    lines.push(`- **Oppdateringsfrekvens:** ${r.frequency}`);
    lines.push(`- **Siste data:** ${r.latestData}`);
    lines.push(`- **Oslo:** ${r.oslo}`);
    lines.push(`- **Lillesand:** ${r.lillesand}`);
    lines.push(`- **Kvalitet:** ${r.quality}`);
    lines.push(`- **Gotchas:** ${r.gotchas}`);
    lines.push("");
  }

  // Kommune profiles
  lines.push("## Kommuneprofil – hva kan vi vise?");
  lines.push("");
  lines.push("### Oslo (0301)");
  lines.push("");
  for (const r of results) {
    if (r.status !== "❌") {
      lines.push(`- **${r.name}:** ${r.oslo}`);
    }
  }
  lines.push("");
  lines.push("### Lillesand (4215)");
  lines.push("");
  for (const r of results) {
    if (r.status !== "❌") {
      lines.push(`- **${r.name}:** ${r.lillesand}`);
    }
  }
  lines.push("");

  // Comparison
  lines.push("## Sammenlikning Oslo vs Lillesand");
  lines.push("");
  lines.push("De mest interessante forskjellene vil fremgå av dataen over.");
  lines.push("En fullstendig sammenlikning krever aggregering av alle datapunkter.");
  lines.push("");

  // Missing data
  const missing = results.filter((r) => r.status === "❌");
  const partial = results.filter((r) => r.status === "🟡");
  const working = results.filter((r) => r.status === "✅");

  lines.push("## Dette mangler / krever videre arbeid");
  lines.push("");
  lines.push(`### Fungerer (${working.length}):`);
  for (const r of working) {
    lines.push(`- ${r.name}`);
  }
  lines.push("");
  lines.push(`### Delvis / usikkert (${partial.length}):`);
  for (const r of partial) {
    lines.push(`- ${r.name}: ${r.gotchas}`);
  }
  lines.push("");
  lines.push(`### Fungerer ikke (${missing.length}):`);
  for (const r of missing) {
    lines.push(`- ${r.name}: ${r.gotchas}`);
  }
  lines.push("");

  lines.push("## Datapunkter uten API (krever manuelt arbeid)");
  lines.push("");
  lines.push("- FHI folkehelseprofiler: PDF-rapporter tilgjengelig, API usikkert");
  lines.push("- Grunnskolepoeng (Udir): Skoleporten har data men kanskje ikke åpent API");
  lines.push("- Bredbåndsdekning (NKOM): Kan kreve CSV-nedlasting");
  lines.push("- ROBEK-status: Kan kreve skraping av regjeringen.no");
  lines.push("- Nedbygging av matjord (NIBIO): Krever videre undersøkelse");
  lines.push("- Klimagassutslipp: Nettside finnes, API usikkert");
  lines.push("");

  lines.push("## Kilder å undersøke videre");
  lines.push("");
  lines.push("- https://data.norge.no – Norsk åpne data-portal");
  lines.push("- https://www.ssb.no/statbank – SSB statistikkbank (søk etter flere tabeller)");
  lines.push("- https://khs.fhi.no – FHI kommunehelsa statistikkbank");
  lines.push("- https://skoleporten.udir.no – Utdanningsdirektoratets statistikk");
  lines.push("- https://nibio.no – NIBIO arealressurser");
  lines.push("- https://kartverket.no – Kartverkets data");
  lines.push("");

  return lines.join("\n");
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("🏛️  Kommune-dashbord: Datautforskning");
  console.log(`Dato: ${new Date().toISOString().split("T")[0]}`);
  console.log(`Testkommuner: Oslo (${OSLO}), Lillesand (${LILLESAND})`);
  console.log("=".repeat(70));

  // ---- 1. KOSTRA ----
  logSection("1. SSB – KOSTRA (kommuneøkonomi)");
  await kostraNettoDriftsresultat();

  await exploreSsbTable("12362", "Netto lånegjeld per innbygger", "KOSTRA",
    (v) => {
      const codes: string[] = [];
      for (let i = 0; i < v.values.length; i++) {
        const txt = (v.valueTexts?.[i] || "").toLowerCase();
        if (txt.includes("netto lånegjeld") || txt.includes("lånegjeld per")) {
          codes.push(v.values[i]);
        }
      }
      return codes;
    }
  );

  await exploreSsbTable("12362", "Frie inntekter per innbygger", "KOSTRA",
    (v) => {
      const codes: string[] = [];
      for (let i = 0; i < v.values.length; i++) {
        const txt = (v.valueTexts?.[i] || "").toLowerCase();
        if (txt.includes("frie inntekter") || txt.includes("frie driftsinntekter")) {
          codes.push(v.values[i]);
        }
      }
      return codes;
    }
  );

  await exploreSsbTable("12367", "Utgifter per sektor", "KOSTRA",
    (v) => {
      const codes: string[] = [];
      for (let i = 0; i < v.values.length; i++) {
        const txt = (v.valueTexts?.[i] || "").toLowerCase();
        if (txt.includes("grunnskole") || txt.includes("pleie") || txt.includes("omsorg") ||
            txt.includes("barnevern") || txt.includes("kultur") || txt.includes("admin")) {
          codes.push(v.values[i]);
        }
      }
      return codes.length > 0 ? codes.slice(0, 6) : v.values.slice(0, 5);
    }
  );

  await exploreSsbTable("06913", "Eiendomsskatt", "KOSTRA");

  await exploreSsbTable("12842", "Kommunale gebyrer (vann/avløp/renovasjon)", "KOSTRA");

  // ---- 2. Demografi ----
  logSection("2. SSB – Demografi");

  await exploreSsbTable("07459", "Befolkning per kommune", "Demografi", undefined, undefined, 10);

  await exploreSsbTable("07459", "Aldersfordeling", "Demografi",
    undefined,
    (v) => {
      if (v.code?.toLowerCase().includes("alder") || v.text?.toLowerCase().includes("alder")) {
        // Pick a selection of age groups
        const selected = v.values.filter((val: string, idx: number) => {
          const txt = (v.valueTexts?.[idx] || "").toLowerCase();
          return txt.includes("0-") || txt.includes("6-") || txt.includes("16-") ||
                 txt.includes("25-") || txt.includes("45-") || txt.includes("67-") ||
                 txt.includes("80") || txt === "0" || txt === "total";
        });
        return [{ code: v.code, values: selected.length > 0 ? selected.slice(0, 8) : v.values.slice(0, 5) }];
      }
      return null;
    },
    1
  );

  await exploreSsbTable("13600", "Befolkningsfremskriving", "Demografi", undefined, undefined, 5);

  await exploreSsbTable("09588", "Flytting (inn/ut)", "Demografi", undefined, undefined, 5);

  await exploreSsbTable("06076", "Husholdningstyper", "Demografi");

  await exploreSsbTable("07110", "Innvandring og landbakgrunn", "Demografi");

  // ---- 3. Inntekt og ulikhet ----
  logSection("3. SSB – Inntekt og ulikhet");

  await exploreSsbTable("06944", "Medianinntekt per kommune", "Inntekt");

  await exploreSsbTable("07184", "Inntektsfordeling", "Inntekt");

  // ---- 4. Helse ----
  await exploreFHI();
  await exploreHelsedir();

  // Uføreandel
  logSection("4.3 Uføreandel (SSB)");
  await exploreSsbTable("11694", "Uføreandel", "Helse");

  // Sykefravær
  logSection("4.4 Sykefravær (SSB)");
  await exploreSsbTable("12441", "Sykefravær", "Helse");

  // ---- 5. Oppvekst og skole ----
  logSection("5. OPPVEKST OG SKOLE");

  // Barnehagedekning via KOSTRA
  await exploreSsbTable("12272", "Barnehagedekning (KOSTRA)", "Skole");

  await exploreUdir();

  // Fullført videregående
  await exploreSsbTable("12961", "Fullført videregående", "Skole");

  // Barnevernstiltak
  await exploreSsbTable("12305", "Barnevernstiltak per 1000 barn", "Skole");

  // ---- 6. Næringsliv ----
  logSection("6. NÆRINGSLIV OG ARBEID");

  await exploreSsbTable("10540", "Arbeidsledighet per kommune", "Næringsliv");

  await exploreSsbTable("07091", "Bedrifter per bransje", "Næringsliv");

  await exploreSsbTable("03321", "Pendlerstrømmer", "Næringsliv");

  await exploreBrreg();

  // ---- 7. Politikk ----
  await exploreValgresultat();

  // ---- 8. Klima ----
  await exploreKlima();

  // Arealbruk
  logSection("8.2 Arealbruk (SSB)");
  await exploreSsbTable("09594", "Arealbruk", "Klima");

  // Elbil
  logSection("8.3 Elbil-andel (SSB)");
  await exploreSsbTable("07849", "Kjøretøy / elbil-andel", "Klima");

  // ---- 9. Infrastruktur ----
  await exploreNKOM();
  await exploreEntur();

  // ---- 10. Bolig ----
  logSection("10. BOLIG");

  await exploreSsbTable("07241", "Boligpriser (kvm-pris)", "Bolig");
  await exploreSsbTable("05889", "Boligbygging / igangsettinger", "Bolig");

  // ---- 11. Kriminalitet ----
  logSection("11. KRIMINALITET");
  await exploreSsbTable("08486", "Anmeldte lovbrudd", "Kriminalitet");

  // ---- 12. ROBEK ----
  await exploreROBEK();

  // ---- 13. Sammenstilling ----
  logSection("13. SAMMENSTILLING");

  const report = generateReport();
  console.log("\n" + report);

  // Save report
  const fs = await import("fs");
  fs.writeFileSync("kommune-utforskning.md", report, "utf-8");
  console.log("\n📄 Rapport lagret som kommune-utforskning.md");

  // Final stats
  const ok = results.filter((r) => r.status === "✅").length;
  const partial = results.filter((r) => r.status === "🟡").length;
  const fail = results.filter((r) => r.status === "❌").length;
  console.log(`\nResultat: ${ok} ✅ fungerer, ${partial} 🟡 delvis, ${fail} ❌ feilet – av ${results.length} kilder totalt`);
}

main().catch((e) => {
  console.error("Fatal feil:", e);
  process.exit(1);
});
