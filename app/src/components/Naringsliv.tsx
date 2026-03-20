import type { KommuneData } from "../lib/useKommuneData";
import { formatNumber } from "../lib/format";
import { CardSkeleton } from "./Skeleton";

interface Props {
  data: KommuneData;
  kommuneNavn: string;
}

// Group individual NACE 2-digit codes into broader categories
const NACE_GROUPS: Record<string, string> = {
  "41": "Bygg og anlegg",
  "42": "Bygg og anlegg",
  "43": "Bygg og anlegg",
  "45": "Varehandel",
  "46": "Varehandel",
  "47": "Varehandel",
  "68": "Eiendom og teknisk",
  "69": "Eiendom og teknisk",
  "70": "Eiendom og teknisk",
  "71": "Eiendom og teknisk",
  "86": "Helse og sosial",
  "87": "Helse og sosial",
  "88": "Helse og sosial",
  "85": "Undervisning",
  "84": "Offentlig admin.",
  "55": "Overnatting/servering",
  "56": "Overnatting/servering",
  "62": "IT-tjenester",
  "63": "IT-tjenester",
  "49": "Transport",
  "52": "Transport",
  "81": "Annen tjenesteyting",
  "82": "Annen tjenesteyting",
  "96": "Annen tjenesteyting",
};

export function Naringsliv({ data, kommuneNavn }: Props) {
  if (!data.naring) return <CardSkeleton />;

  // Total bedrifter (latest year) – use "01-99" total from data, not the summed totalt
  const totalEntries = data.naring.data
    .filter((d) => d.naringKode === "01-99")
    .sort((a, b) => b.year.localeCompare(a.year));
  const latestTotal = totalEntries[0]
    ? { kommuneKode: totalEntries[0].kommuneKode, kommune: totalEntries[0].kommune, year: totalEntries[0].year, antall: totalEntries[0].antall }
    : data.naring.totalt?.sort((a, b) => b.year.localeCompare(a.year))?.[0];

  // Group bransjer into broader categories
  const latestYear = latestTotal?.year;
  const grouped = new Map<string, number>();

  if (latestYear) {
    for (const d of data.naring.data) {
      if (d.year !== latestYear) continue;
      if (d.kommuneKode !== latestTotal?.kommuneKode) continue;
      if (d.naringKode === "01-99" || d.naringKode === "00") continue;
      if (d.antall <= 0) continue;

      const group = NACE_GROUPS[d.naringKode] || d.naring;
      grouped.set(group, (grouped.get(group) || 0) + d.antall);
    }
  }

  const bransjer = [...grouped.entries()]
    .map(([name, antall]) => ({ name, antall }))
    .sort((a, b) => b.antall - a.antall)
    .slice(0, 5);

  // Ledighet
  const latestLedighet = data.ledighet?.latest?.[0];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
        Næringsliv
      </h3>

      {/* Total bedrifter */}
      {latestTotal && (
        <div className="mb-4">
          <p className="text-3xl font-bold text-stone-900">
            {formatNumber(latestTotal.antall)}
          </p>
          <p className="text-sm text-stone-500">
            bedrifter ({latestTotal.year})
          </p>
        </div>
      )}

      {/* Topp bransjer */}
      {bransjer.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-stone-400">
            Største bransjer
          </p>
          <div className="space-y-1.5">
            {bransjer.map((b) => (
              <div key={b.name} className="flex justify-between text-sm">
                <span className="text-stone-500 truncate max-w-[70%]">
                  {b.name}
                </span>
                <span className="font-medium text-stone-700">
                  {formatNumber(b.antall)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Arbeidsledighet */}
      {latestLedighet && (
        <div className="border-t border-stone-100 pt-3 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Arbeidsledighet</span>
            <span className="font-semibold text-stone-900">
              {latestLedighet.ledighetsrate.toFixed(1)} %
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            {latestLedighet.period}
          </p>
        </div>
      )}

      {/* Nyregistreringer */}
      {data.brreg !== null && (
        <div className="border-t border-stone-100 pt-3 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Nyregistreringer (12 mnd)</span>
            <span className="font-semibold text-stone-900">
              {formatNumber(data.brreg)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
