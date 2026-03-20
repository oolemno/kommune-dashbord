import type { KommuneData } from "../lib/useKommuneData";
import { formatNumber, formatKr } from "../lib/format";
import { CardSkeleton } from "./Skeleton";

interface Props {
  data: KommuneData;
  kommuneNavn: string;
}

export function Okonomi({ data, kommuneNavn }: Props) {
  if (!data.inntekt && !data.gebyrer) return <CardSkeleton />;

  const latestInntekt = data.inntekt?.latest?.[0];

  // Gebyrer - find latest year
  const latestGebyrer = data.gebyrer?.sort((a, b) =>
    b.year.localeCompare(a.year)
  )?.[0];

  const avfall = latestGebyrer?.gebyrer?.["Årsgebyr for avfallstjenesten - ekskl. mva. (kr)"] ?? 0;
  const avlop = latestGebyrer?.gebyrer?.["Årsgebyr for avløpstjenesten - ekskl. mva. (kr)"] ?? 0;
  const vann = latestGebyrer?.gebyrer?.["Årsgebyr for vannforsyning - ekskl. mva. (kr)"] ?? 0;
  const totalGebyrer = avfall + avlop + vann;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
        Økonomi
      </h3>

      {/* Medianinntekt */}
      {latestInntekt && (
        <div className="mb-4">
          <p className="text-3xl font-bold text-stone-900">
            {formatKr(latestInntekt.samletInntektMedian ?? 0)}
          </p>
          <p className="text-sm text-stone-500">
            medianinntekt ({latestInntekt.year})
          </p>

          {latestInntekt.etterSkattMedian && (
            <p className="mt-1 text-sm text-stone-400">
              Etter skatt: {formatKr(latestInntekt.etterSkattMedian)}
            </p>
          )}
        </div>
      )}

      {/* Kommunale gebyrer */}
      {latestGebyrer && totalGebyrer > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="mb-2 text-xs font-medium text-stone-400">
            Kommunale gebyrer ({latestGebyrer.year})
          </p>

          <div className="space-y-1.5">
            {avfall > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Avfall</span>
                <span className="font-medium text-stone-700">
                  {formatNumber(avfall)} kr
                </span>
              </div>
            )}
            {avlop > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Avløp</span>
                <span className="font-medium text-stone-700">
                  {formatNumber(avlop)} kr
                </span>
              </div>
            )}
            {vann > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Vann</span>
                <span className="font-medium text-stone-700">
                  {formatNumber(vann)} kr
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-100 pt-1.5 text-sm font-semibold">
              <span className="text-stone-600">Totalt</span>
              <span className="text-stone-900">
                {formatNumber(totalGebyrer)} kr/år
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
