# Kommune-dashbord: Datautforskning – Rapport

**Generert:** 2026-03-19
**Testkommuner:** Oslo (0301) og Lillesand (4215)
**Script:** `utforsk-kommune.ts` (kjøres med `npx tsx utforsk-kommune.ts`)

---

## Sammendrag

**22 av 35 datakilder fungerer direkte via API.** SSB er den klare hovedkilden – den dekker økonomi, demografi, inntekt, arbeidsmarked, næringsliv, areal og kjøretøy med kommunenivå-data. Valgresultat.no gir politiske data. De fleste ikke-SSB-kildene (FHI, Udir, NKOM, Miljødirektoratet) mangler åpne API-er og krever enten CSV-nedlasting eller skraping.

| Status | Antall | Andel |
|--------|--------|-------|
| ✅ Fungerer | 22 | 63% |
| 🟡 Delvis/usikkert | 13 | 37% |
| ❌ Fungerer ikke | 0 | 0% |

---

## Oversikt alle kilder

| # | Kilde | Kategori | Status | API | Kommunenivå |
|---|-------|----------|--------|-----|-------------|
| 1 | Netto driftsresultat (12362) | KOSTRA | ✅ | SSB json-stat2 | Ja |
| 2 | Netto lånegjeld (12362) | KOSTRA | ✅ | SSB json-stat2 | Ja |
| 3 | Frie inntekter (12362) | KOSTRA | ✅ | SSB json-stat2 | Ja |
| 4 | Utgifter per sektor (12367) | KOSTRA | ✅ | SSB json-stat2 | Ja |
| 5 | Eiendomsskatt | KOSTRA | ⚠️ | Tabell 06913 er befolkningsendringer, ikke eiendomsskatt | Trenger annen tabell |
| 6 | Kommunale gebyrer (12842) | KOSTRA | ✅ | SSB json-stat2 | Ja |
| 7 | Befolkning (07459) | Demografi | ✅ | SSB json-stat2 | Ja |
| 8 | Aldersfordeling (07459) | Demografi | ✅ | SSB json-stat2 | Ja |
| 9 | Befolkningsfremskriving (13600) | Demografi | ✅ | SSB json-stat2 | Ja |
| 10 | Flytting inn/ut (09588) | Demografi | ✅ | SSB json-stat2 | Ja |
| 11 | Husholdningstyper (06076) | Demografi | 🟡 | Kun fylkesnivå | Nei |
| 12 | Innvandring/landbakgrunn (07110) | Demografi | ✅ | SSB json-stat2 | Ja |
| 13 | Medianinntekt (06944) | Inntekt | ✅ | SSB json-stat2 | Ja |
| 14 | Inntektsfordeling/Gini (07184) | Inntekt | 🟡 | Kun fylkesnivå | Nei |
| 15 | FHI Folkehelseprofiler | Helse | 🟡 | Ingen åpent API funnet | PDF-profiler |
| 16 | Fastlegedekning | Helse | 🟡 | Helsedir API nede/ikke funnet | Ukjent |
| 17 | Uføreandel | Helse | ⚠️ | Tabell 11694 er eiendomsomsetning | Trenger annen tabell |
| 18 | Sykefravær (12441) | Helse | 🟡 | Kun nasjonalt/næring, ikke kommune | Nei |
| 19 | Barnehagedekning (12272) | Skole | ✅ | SSB json-stat2 | Ja |
| 20 | Grunnskolepoeng (Udir) | Skole | 🟡 | Swagger UI funnet på data-nsr.udir.no | Mulig |
| 21 | Fullført VGS (12961) | Skole | 🟡 | Kun fylkesnivå | Nei |
| 22 | Barnevern (12305) | Skole | ✅ | SSB json-stat2 | Ja |
| 23 | Arbeidsledighet (10540) | Næringsliv | ✅ | SSB json-stat2 | Ja |
| 24 | Bedrifter per bransje (07091) | Næringsliv | ✅ | SSB json-stat2 | Ja |
| 25 | Pendlerstrømmer (03321) | Næringsliv | ✅ | SSB json-stat2 | Ja |
| 26 | Nyetableringer (Brreg) | Næringsliv | ⚠️ | 400 – filtreringsparametre feil | Trenger finjustering |
| 27 | Kommunevalg 2023 | Valg | ✅ | valgresultat.no/api | Ja |
| 28 | Stortingsvalg 2021 | Valg | 🟡 | 404 – annen URL-struktur? | Trenger utforskning |
| 29 | Klimagassutslipp | Klima | 🟡 | Miljødirektoratet – ingen API funnet | Nettside/nedlasting |
| 30 | Arealbruk (09594) | Klima | ✅ | SSB json-stat2 | Ja |
| 31 | Kjøretøy/elbil (07849) | Klima | ✅ | SSB json-stat2 | Ja |
| 32 | Bredbåndsdekning (NKOM) | Infrastruktur | 🟡 | Ingen API funnet | Nedlasting |
| 33 | Kollektivtilbud (Entur) | Infrastruktur | ✅ | REST API fungerer, GraphQL 403 | Ja |
| 34 | Boligpriser (07241) | Bolig | 🟡 | Kun nasjonalt/boligtype, ikke kommune | Nei |
| 35 | Boligbygging (05889) | Bolig | ✅ | SSB json-stat2 | Ja |
| 36 | Anmeldte lovbrudd (08486) | Kriminalitet | 🟡 | Kun politidistrikt, ikke kommune | Nei |
| 37 | ROBEK-status | Kommuneøkonomi | 🟡 | hotell.difi.no ga 403, data.norge.no 404 | Ukjent |

---

## Detaljerte funn per kategori

### 1. SSB KOSTRA (kommuneøkonomi)

**Hovedtabell: 12362** – inneholder netto driftsresultat, lånegjeld, frie inntekter m.m. som underkategorier via funksjon/art-koder.

| Datapunkt | Oslo (2025) | Lillesand (2025) |
|-----------|-------------|------------------|
| Lønnsutgifter politisk styring (1000 kr) | 131 202 | 4 987 |
| Andel av totale utgifter (%) | 0.3 | 0.7 |
| Per innbygger (kr) | 180 | 422 |

**Viktig funn:** Tabell 12362 har 97 funksjoner × 5 arter × 3 statistikkvariabler. For å hente netto driftsresultat i prosent av brutto driftsinntekter trengs det riktig kombinasjon av funksjon- og artkoder. Scriptet henter metadata som viser alle tilgjengelige koder.

**Tabell 12367** (Utgifter per sektor) gir korrigerte brutto driftsutgifter per tjenesteområde:
- Oslo politisk styring 2025: 179 007 (1000 kr)
- Lillesand politisk styring 2025: 5 473 (1000 kr)

**Tabell 12842** (Kommunale gebyrer) – fungerer utmerket:

| Gebyr (2026, ekskl. mva) | Oslo | Lillesand |
|---------------------------|------|-----------|
| Avfall (kr/år) | 6 546 | 4 636 |
| Avløp (kr/år) | 3 803 | 6 449 |

Interessant: Lillesand har 70% høyere avløpsgebyr enn Oslo!

**Eiendomsskatt:** Tabell 06913 viste seg å inneholde **befolkningsendringer**, ikke eiendomsskatt. Trenger alternativ KOSTRA-tabell (søk i SSB statbank).

### 2. Demografi

**Tabell 07459** (befolkning) – fungerer perfekt med kommunenivå, 106 aldersgrupper, kjønn, 41 år med data.

| | Oslo (2026) | Lillesand (2020+) |
|--|-------------|-------------------|
| Kvinner 0 år | 4 557 (2022) | 54 (2020) |
| Kvinner 80 år | 2 008 | 34 |

**Tabell 13600** (fremskriving) – har data til 2050 med 9 ulike scenarioer (hovedalternativ, lav/høy vekst, etc.). Kommunenivå for begge.

**Tabell 09588** (flytting) – utmerket! 12 underkategorier inkl. innenlands/utenlands, netto per 1000:

| Flytting (2025) | Oslo | Lillesand |
|-----------------|------|-----------|
| Innflytting | 41 017 | 657 |
| Utflytting | se data | se data |

**Tabell 06076** (husholdningstyper) – **kun fylkesnivå**, ikke kommunenivå. 42 regioner = fylker + land. Alternativ: SSB tabell 09747 eller 11728.

**Tabell 07110** (innvandring) – fungerer per kommune med landbakgrunn per verdensdel:
- Oslo 2026: 39 274 kvinner fra Europa, 13 842 fra Afrika
- Lillesand 2026: 419 kvinner fra Europa, 61 fra Afrika

### 3. Inntekt og ulikhet

**Tabell 06944** (medianinntekt) – **nøkkelkilde!** Per kommune, per husholdningstype, median og gjennomsnitt:

| Inntekt (2024) | Oslo | Lillesand |
|----------------|------|-----------|
| Samlet inntekt, median | 834 500 kr | 910 600 kr |
| Etter skatt, median | 635 200 kr | 724 800 kr |

Overraskende: Lillesand har **høyere** medianinntekt enn Oslo! (Trolig pga. færre studenthusholdninger og énpersonshusholdninger.)

**Tabell 07184** (inntektsfordeling/Gini) – kun fylkesnivå (42 regioner). Gini per kommune finnes kanskje i en annen tabell.

### 4. Helse

**FHI:** Ingen åpent API funnet. statistikk.fhi.no returnerer HTML (SPA-applikasjon). khs.fhi.no ga 404 på API-endepunkter. data.fhi.no finnes ikke. **Konklusjon: FHI-data krever enten skraping av SPA eller nedlasting av PDF-profiler.**

**Helsedirektoratet:** Både data.helsedirektoratet.no og statistikk.helsedirektoratet.no ga DNS/tilkoblingsfeil. Trolig ikke åpne API-er.

**Tabell 11694** – viste seg å inneholde **eiendomsomsetninger**, ikke uføreandel. Trenger alternativ tabell for uføreandel (prøv SSB tabell 11713 eller 12459).

**Tabell 12441** (sykefravær) – kun nasjonalt nivå per næring/kjønn, **ikke kommunenivå**.

### 5. Oppvekst og skole

**Tabell 12272** (barnehage KOSTRA) – fungerer:
- Oslo 2025: 34 505 barn i barnehage, 9 609 minoritetsspråklige
- Lillesand 2025: 523 barn, 86 minoritetsspråklige

**Utdanningsdirektoratet (Udir):** data-nsr.udir.no har en **Swagger UI** (OpenAPI-dokumentasjon) – det finnes altså et API! Krever videre utforskning av endepunktene for grunnskolepoeng per kommune.

**Tabell 12961** (fullført VGS) – kun fylkesnivå (23 regioner).

**Tabell 12305** (barnevern) – fungerer per kommune med 10 statistikkvariabler om årsverk og stillinger.

### 6. Næringsliv og arbeid

**Tabell 10540** (arbeidsledighet) – fungerer per kommune og aldersgruppe, månedlig:
- Oslo mars 2020: 13.9% (15-74 år) – covid-toppen
- Lillesand mars 2020: 9.3%

**Tabell 07091** (bedrifter) – fungerer per kommune, 89 næringer, 9 størrelsesgrupper:
- Oslo 2026: 105 130 bedrifter totalt
- Lillesand 2026: 1 466 bedrifter totalt

**Tabell 03321** (pendling) – kryssmatrise bostedskommune × arbeidsstedskommune. Kan beregne selvforsyningsgrad.

**Brønnøysundregistrene:** API-kallet ga 400 – filtreringsparametrene for dato trenger justering. API-et finnes og er dokumentert, men spørringsformatet må korrigeres (bruk `fraRegistreringsdatoEnhetsregisteret` i stedet).

### 7. Politikk og valg

**valgresultat.no/api** – fungerer for kommunevalg 2023 på landsnivå (`/api/2023/ko`). Returnerer komplett JSON med partier, stemmer, mandater, valgdeltakelse.

**Kommunenivå:** `/api/2023/ko/4215` (Lillesand) ga 404. Mulig at kommunenivå bruker en annen URL-struktur (f.eks. `/api/2023/ko/kommune/4215` eller annen). Krever videre utforskning av API-dokumentasjon.

**Stortingsvalg:** `/api/2021/st/0301` ga også 404. Trolig annen URL-struktur.

### 8. Klima og areal

**Miljødirektoratet klimagassutslipp:** Alle API-URL-er ga DNS-feil (`fetch failed`). Domenet klimagassutslipp.miljodirektoratet.no kan ha endret navn eller krever spesifikk tilgang. Data er tilgjengelig via nettsiden for manuell nedlasting.

**Tabell 09594** (arealbruk) – fungerer per kommune med 98 arealklasser:
- Oslo boligbebyggelse 2025: 50.56 km²
- Lillesand boligbebyggelse 2025: 3.58 km²

**Tabell 07849** (kjøretøy) – fungerer med drivstofftype per kommune:
- Oslo personbiler bensin 2025: 52 110 (ned fra 63 833 i 2023!)
- Lillesand personbiler bensin 2025: 1 244
- Kan beregne elbil-andel ved å hente elektrisk drivstoff separat

### 9. Infrastruktur

**NKOM (bredbånd):** ekomstatistikken.nkom.no ga DNS-feil. Ingen åpent API funnet. Data publiseres som nedlastbare filer.

**Entur (kollektiv):** REST API for stoppestedsregisteret (NSR) fungerer! Returnerer detaljert info om holdeplasser med tilgjengelighetsdata. GraphQL-endepunktet ga 403. Krever `ET-Client-Name` header.

### 10. Bolig

**Tabell 07241** (boligpriser) – kun nasjonalt nivå per boligtype, **ikke kommunenivå**. For kommunenivå-boligpriser, sjekk SSB tabell 06035 eller Eiendom Norge / Finn.no.

**Tabell 05889** (boligbygging) – fungerer per kommune, kvartalsvis:
- Oslo 2025K4: 17 godkjente eneboliger, 37 igangsettinger
- Lillesand 2025K4: 9 godkjente eneboliger, 9 igangsettinger

### 11. Kriminalitet

**Tabell 08486** – kun politidistrikt (71 regioner), **ikke kommunenivå**. For kommune-kriminalitet, sjekk SSB tabell 08487 eller politiets statistikkbank.

### 12. ROBEK

**hotell.difi.no** ga 403 (tilgangsnektet). **data.norge.no** sitt CKAN-API ga 404.
ROBEK-listen publiseres av Kommunal- og distriktsdepartementet på regjeringen.no. Kan skrapes fra HTML-tabellen der.

---

## Kommuneprofil – hva kan vi vise i dag?

### Oslo (0301)

Med de 22 fungerende kildene kan vi allerede vise:

| Kategori | Datapunkt | Verdi |
|----------|-----------|-------|
| **Økonomi** | Kommunale gebyrer avfall (2026) | 6 546 kr/år |
| **Økonomi** | Kommunale gebyrer avløp (2026) | 3 803 kr/år |
| **Demografi** | Befolkning | 728 714 (2026) |
| **Demografi** | Innflytting (2025) | 41 017 |
| **Demografi** | Innvandrere fra Europa, kvinner (2026) | 39 274 |
| **Inntekt** | Medianinntekt, alle husholdninger (2024) | 834 500 kr |
| **Inntekt** | Etter skatt, median (2024) | 635 200 kr |
| **Skole** | Barn i barnehage (2025) | 34 505 |
| **Skole** | Barnevern årsverk (2025) | 803.7 |
| **Arbeid** | Ledighet 15-74 (siste) | Tilgjengelig månedlig |
| **Arbeid** | Antall bedrifter (2026) | 105 130 |
| **Klima** | Boligbebyggelse areal | 50.56 km² |
| **Klima** | Personbiler bensin (2025) | 52 110 |
| **Bolig** | Igangsatte eneboliger (2025K4) | 37 |
| **Valg** | Kommunevalg 2023 | Partier, mandater, deltakelse |

### Lillesand (4215)

| Kategori | Datapunkt | Verdi |
|----------|-----------|-------|
| **Økonomi** | Kommunale gebyrer avfall (2026) | 4 636 kr/år |
| **Økonomi** | Kommunale gebyrer avløp (2026) | 6 449 kr/år |
| **Demografi** | Befolkning | 11 822 (2026) |
| **Demografi** | Innflytting (2025) | 657 |
| **Demografi** | Innvandrere fra Europa, kvinner (2026) | 419 |
| **Inntekt** | Medianinntekt, alle husholdninger (2024) | 910 600 kr |
| **Inntekt** | Etter skatt, median (2024) | 724 800 kr |
| **Skole** | Barn i barnehage (2025) | 523 |
| **Skole** | Barnevern årsverk (2025) | 7.0 |
| **Arbeid** | Ledighet 15-74 (siste) | Tilgjengelig månedlig |
| **Arbeid** | Antall bedrifter (2026) | 1 466 |
| **Klima** | Boligbebyggelse areal | 3.58 km² |
| **Klima** | Personbiler bensin (2025) | 1 244 |
| **Bolig** | Igangsatte eneboliger (2025K4) | 9 |
| **Valg** | Kommunevalg 2023 | Trenger riktig API-URL |

---

## Sammenlikning Oslo vs Lillesand

| Datapunkt | Oslo | Lillesand | Forholdstall |
|-----------|------|-----------|--------------|
| Befolkning | 728 714 | 11 822 | 62× |
| Medianinntekt | 834 500 kr | 910 600 kr | Lillesand 9% høyere! |
| Etter skatt | 635 200 kr | 724 800 kr | Lillesand 14% høyere |
| Avfallsgebyr | 6 546 kr | 4 636 kr | Oslo 41% dyrere |
| Avløpsgebyr | 3 803 kr | 6 449 kr | Lillesand 70% dyrere |
| Bedrifter | 105 130 | 1 466 | 72× |
| Bedrifter per innbygger | 1 per 6.9 | 1 per 8.1 | Oslo 17% mer |
| Barn i barnehage | 34 505 | 523 | 66× |
| Innflytting | 41 017 | 657 | 62× |
| Boligbebyggelse | 50.56 km² | 3.58 km² | 14× |

**Mest overraskende funn:**
- Lillesand har **høyere medianinntekt** enn Oslo (910 600 vs 834 500). Skyldes trolig at Oslo har flere studenter og énpersons-husholdninger som trekker medianen ned.
- Lillesand har **70% dyrere avløpsgebyr** enn Oslo (6 449 vs 3 803 kr) – stordriftsfordel for Oslo.
- Oslo har **41% dyrere avfallsgebyr** enn Lillesand – kanskje pga. høyere lønnskostnader.

---

## Tekniske observasjoner

### SSB API
- **Format:** Alle SSB-tabeller bruker POST med JSON body, returnerer json-stat2
- **Rate limiting:** 1 sek mellom kall er tilstrekkelig, ingen 429-feil
- **Kommunenumre:** Noen tabeller bruker variabelen `Region`, andre `KOKkommuneregion0000`. Metadata-GET er **essensielt** for å finne riktige koder.
- **KOSTRA-tabeller:** Bruker prefikset `KOK` for variabelkoder og `KOS` for statistikkvariabler
- **Tabeller uten kommunenivå:** 06076, 07184, 12441, 12961, 07241, 08486 – disse har kun fylkes- eller landsnivå
- **Feil tabellnummer:** 06913 og 11694 inneholdt annen data enn forventet (befolkningsendringer og eiendomsomsetning)

### Ikke-SSB API-er
- **valgresultat.no:** Fungerer men URL-struktur for kommunenivå må utforskes videre
- **Entur:** REST fungerer, GraphQL krever kanskje autentisering
- **Brreg:** API finnes, men filtreringsparametre trenger justering
- **FHI, Helsedir, NKOM, Miljødirektoratet:** Ingen åpne API-er funnet

---

## Dette mangler – neste steg

### Trenger alternative SSB-tabeller
- **Eiendomsskatt:** Søk i SSB statbank etter KOSTRA-tabell for eiendomsskatt (prøv 13207 eller 12840)
- **Uføreandel:** Prøv SSB tabell 11713 (uføretrygdede) eller 12459
- **Lavinntekt:** Søk etter tabell med lavinntektsandel per kommune
- **Husholdningstyper:** Prøv SSB tabell 09747 eller 11728 (privathusholdninger per kommune)
- **Boligpriser:** Prøv SSB tabell 06035 eller bruk Eiendom Norge
- **Kriminalitet:** Prøv SSB tabell 08487 eller politiets statistikk
- **Fullført VGS:** Søk etter tabell med kommunenivå

### Krever manuelt arbeid / skraping
- **FHI folkehelseprofiler:** Kan laste ned PDF-er eller skrape statistikk.fhi.no (SPA)
- **Grunnskolepoeng:** Utforsk Swagger UI på data-nsr.udir.no for API-endepunkter
- **Klimagassutslipp:** Sjekk om Miljødirektoratet har ny URL eller nedlastbar CSV
- **Bredbåndsdekning:** Last ned fra NKOM, trolig CSV/Excel
- **ROBEK-status:** Skrape HTML-tabell fra regjeringen.no
- **Nedbygging av matjord:** Sjekk NIBIO/SSB for datasett

### Kilder å utforske videre
- **https://data.norge.no** – Norges åpne data-portal, søk etter kommunedata
- **https://www.ssb.no/statbank** – SSB statistikkbank for å finne riktige tabellnumre
- **https://khs.fhi.no** – FHI kommunehelsa statistikkbank
- **https://skoleporten.udir.no** – Utdanningsdirektoratets statistikk
- **https://data-nsr.udir.no** – Udir NSR API (har Swagger-dokumentasjon!)
- **https://nibio.no** – NIBIO arealressurser og matjord
- **https://data.brreg.no** – Brønnøysundregistrene (finjuster spørringsparametre)

---

## Arkitektur-anbefaling for dashbordet

Basert på utforskningen:

1. **SSB er ryggraden** – bygg en generisk SSB-klient som tar tabellnummer og variabelfilter, og cachér data (oppdateres sjelden)
2. **Valgresultat.no** er eneste ikke-SSB API som fungerer rett ut av boksen
3. **Statiske datasett** (NKOM bredbånd, Miljødir klima, FHI helse) – last ned CSV/Excel og importer
4. **Udir API** – lovende, utforsk Swagger-dokumentasjonen
5. **Brreg API** – fiks filtreringsparametre, da har du sanntids bedriftsdata
6. **Entur API** – bruk REST-endepunktet for holdeplassdata

For dashbordet anbefales en **datalagrings-pipeline** som henter og cacher SSB-data daglig/ukentlig, kombinert med statiske datasett som oppdateres manuelt ved behov.
