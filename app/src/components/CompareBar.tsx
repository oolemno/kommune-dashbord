import type { KommuneData } from "../lib/useKommuneData";
import { formatNumber, formatKr, formatCompare } from "../lib/format";

interface Props {
  oslo: KommuneData;
  lillesand: KommuneData;
}

export function CompareBar({ oslo, lillesand }: Props) {
  const osloPop = oslo.befolkning?.latest?.[0]?.population ?? 0;
  const lilPop = lillesand.befolkning?.latest?.[0]?.population ?? 0;

  const osloInntekt =
    oslo.inntekt?.latest?.[0]?.samletInntektMedian ?? 0;
  const lilInntekt =
    lillesand.inntekt?.latest?.[0]?.samletInntektMedian ?? 0;

  const items: { label: string; text: string }[] = [];

  if (osloPop > 0 && lilPop > 0) {
    items.push({
      label: "Befolkning",
      text: `Oslo har ${Math.round(osloPop / lilPop)}x flere innbyggere`,
    });
  }

  if (osloInntekt > 0 && lilInntekt > 0) {
    items.push({
      label: "Medianinntekt",
      text: formatCompare(osloInntekt, lilInntekt),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
        Sammenlikning
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item.label} className="text-sm text-amber-800">
            <span className="font-medium">{item.label}:</span> {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}
