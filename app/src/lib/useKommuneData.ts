import { useState, useEffect, useRef } from "react";
import { ssbClient } from "./ssb";
import {
  fetchBefolkning,
  fetchBefolkningFramskriving,
  fetchAldersfordeling,
  fetchMedianInntekt,
  fetchKommunaleGebyrer,
  fetchNaringsstruktur,
  fetchArealbruk,
  fetchArbeidsledighetKommune,
} from "ssb-motor/index";
import type {
  BefolkningResult,
  FramskrivingResult,
  AldersfordelingPoint,
  InntektResult,
  KommunaleGebyrerResult,
  NaringsstrukturResult,
  ArealbrukPoint,
  ArbeidsledighetKommunePoint,
} from "ssb-motor/index";
import { fetchBrregNyregistreringer } from "./brreg";
import { fetchValgresultat, type ValgResult } from "./valg";

export interface KommuneData {
  befolkning: BefolkningResult | null;
  framskriving: FramskrivingResult | null;
  aldersfordeling: AldersfordelingPoint[] | null;
  inntekt: InntektResult | null;
  gebyrer: KommunaleGebyrerResult[] | null;
  naring: NaringsstrukturResult | null;
  areal: ArealbrukPoint[] | null;
  ledighet: {
    data: ArbeidsledighetKommunePoint[];
    latest: ArbeidsledighetKommunePoint[];
  } | null;
  brreg: number | null;
  valg: ValgResult | null;

  loading: boolean;
  sectionsLoaded: Set<string>;
  error: string | null;
}

const INITIAL: KommuneData = {
  befolkning: null,
  framskriving: null,
  aldersfordeling: null,
  inntekt: null,
  gebyrer: null,
  naring: null,
  areal: null,
  ledighet: null,
  brreg: null,
  valg: null,
  loading: true,
  sectionsLoaded: new Set(),
  error: null,
};

export function useKommuneData(kommunenummer: string): KommuneData {
  const [data, setData] = useState<KommuneData>(INITIAL);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    setData(INITIAL);

    const update = (partial: Partial<KommuneData>, section: string) => {
      if (abortRef.current) return;
      setData((prev) => ({
        ...prev,
        ...partial,
        sectionsLoaded: new Set([...prev.sectionsLoaded, section]),
      }));
    };

    const load = async () => {
      // Sequential SSB calls to respect rate limiting
      try {
        const bef = await fetchBefolkning(ssbClient, {
          kommunenummer,
          years: 10,
        });
        update({ befolkning: bef }, "befolkning");
      } catch (e) {
        console.error("Befolkning feil:", e);
      }

      try {
        const fram = await fetchBefolkningFramskriving(ssbClient, {
          kommunenummer,
          years: 25,
        });
        update({ framskriving: fram }, "framskriving");
      } catch (e) {
        console.error("Framskriving feil:", e);
      }

      try {
        const alder = await fetchAldersfordeling(ssbClient, {
          kommunenummer,
        });
        update({ aldersfordeling: alder.data }, "aldersfordeling");
      } catch (e) {
        console.error("Aldersfordeling feil:", e);
      }

      try {
        const inntekt = await fetchMedianInntekt(ssbClient, {
          kommunenummer,
        });
        update({ inntekt }, "inntekt");
      } catch (e) {
        console.error("Inntekt feil:", e);
      }

      try {
        const gebyrer = await fetchKommunaleGebyrer(ssbClient, {
          kommunenummer,
        });
        update({ gebyrer }, "gebyrer");
      } catch (e) {
        console.error("Gebyrer feil:", e);
      }

      try {
        // Pass explicit NACE codes – "*" skips the filter and SSB collapses the dimension
        const NACE_BROAD = [
          "01-99", // Total
          "41", "42", "43", // Bygg og anlegg
          "45", "46", "47", // Varehandel
          "68", "69", "70", "71", // Eiendom, teknisk rådgivning
          "86", "87", "88", // Helse og sosial
          "85", // Undervisning
          "84", // Offentlig administrasjon
          "55", "56", // Overnatting og servering
          "62", "63", // IT-tjenester
          "49", "52", // Transport
          "81", "82", // Annen forretningsdrift
          "96", // Andre personlige tjenester
        ];
        const naring = await fetchNaringsstruktur(ssbClient, {
          kommunenummer,
          naring: NACE_BROAD,
          years: 1,
        });
        update({ naring }, "naring");
      } catch (e) {
        console.error("Næringsstruktur feil:", e);
      }

      try {
        const areal = await fetchArealbruk(ssbClient, { kommunenummer });
        update({ areal: areal.data }, "areal");
      } catch (e) {
        console.error("Arealbruk feil:", e);
      }

      try {
        const ledighet = await fetchArbeidsledighetKommune(ssbClient, {
          kommunenummer,
          periods: 12,
        });
        update({ ledighet }, "ledighet");
      } catch (e) {
        console.error("Ledighet feil:", e);
      }

      // Non-SSB: can run in parallel after SSB is done
      const brregP = fetchBrregNyregistreringer(kommunenummer)
        .then((n) => update({ brreg: n }, "brreg"))
        .catch((e) => console.error("Brreg feil:", e));

      const valgP = fetchValgresultat(kommunenummer)
        .then((v) => update({ valg: v }, "valg"))
        .catch((e) => console.error("Valg feil:", e));

      await Promise.allSettled([brregP, valgP]);

      if (!abortRef.current) {
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    load();

    return () => {
      abortRef.current = true;
    };
  }, [kommunenummer]);

  return data;
}
