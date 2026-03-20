export interface ValgParti {
  navn: string;
  partikode: string;
  prosent: number;
  mandater: number;
  stemmer: number;
}

export interface ValgResult {
  partier: ValgParti[];
  deltakelse: number;
  aar: string;
}

export async function fetchValgresultat(
  kommunenummer: string
): Promise<ValgResult | null> {
  // API is hierarchical: /2023/ko/{fylke_2siffer}/{kommunenummer}
  const fylke = kommunenummer.slice(0, 2);

  const urls = [
    `/api/valg/api/2023/ko/${fylke}/${kommunenummer}`,
    `/api/valg/api/2023/ko/${fylke}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();

      if (data.partier) {
        return parseValgData(data);
      }
    } catch {
      continue;
    }
  }

  return null;
}

function parseValgData(data: any): ValgResult {
  const partier: ValgParti[] = (data.partier || [])
    .filter((p: any) => p.stemmer?.resultat?.prosent > 0)
    .map((p: any) => ({
      navn: p.id?.navn || p.navn || "Ukjent",
      partikode: p.id?.partikode || p.partikode || "",
      prosent: p.stemmer?.resultat?.prosent ?? 0,
      mandater: p.mandater?.resultat?.antall ?? 0,
      stemmer: p.stemmer?.resultat?.antall ?? 0,
    }))
    .sort((a: ValgParti, b: ValgParti) => b.prosent - a.prosent);

  return {
    partier,
    deltakelse: data.frammote?.prosent ?? 0,
    aar: data.id?.valgaar || "2023",
  };
}

// Party colors
export const PARTI_FARGER: Record<string, string> = {
  A: "#ef4444",   // Ap – rød
  H: "#3b82f6",   // Høyre – blå
  FRP: "#1e3a5f", // FrP – mørk blå
  SP: "#22c55e",  // Sp – grønn
  SV: "#dc2626",  // SV – rødere
  V: "#06b6d4",   // Venstre – turkis
  KRF: "#f59e0b", // KrF – gul
  MDG: "#16a34a",  // MDG – mørkere grønn
  R: "#991b1b",   // Rødt – mørk rød
  INP: "#6366f1",  // INP – lilla
  PF: "#8b5cf6",   // Pensjonistforbundet
  DEMN: "#78716c", // Demokratene
};

export function getPartiFarge(partikode: string): string {
  return PARTI_FARGER[partikode] || "#9ca3af";
}
