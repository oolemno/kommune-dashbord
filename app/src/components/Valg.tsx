import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { KommuneData } from "../lib/useKommuneData";
import { getPartiFarge } from "../lib/valg";
import { CardSkeleton } from "./Skeleton";

interface Props {
  data: KommuneData;
  kommuneNavn: string;
}

export function Valg({ data, kommuneNavn }: Props) {
  if (!data.valg) {
    if (data.loading) return <CardSkeleton />;
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Kommunevalg
        </h3>
        <p className="text-sm text-stone-400">
          Valgdata ikke tilgjengelig for {kommuneNavn}
        </p>
      </div>
    );
  }

  const topPartier = data.valg.partier.slice(0, 8);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-stone-400">
        Kommunevalg {data.valg.aar}
      </h3>

      {data.valg.deltakelse > 0 && (
        <p className="mb-4 text-sm text-stone-500">
          Valgdeltakelse: {data.valg.deltakelse.toFixed(1)} %
        </p>
      )}

      {topPartier.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPartier} layout="vertical">
              <XAxis
                type="number"
                domain={[0, "auto"]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="partikode"
                width={35}
                tick={{ fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)} %`]}
                labelFormatter={(l) => {
                  const p = topPartier.find((p) => p.partikode === l);
                  return p?.navn || l;
                }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="prosent" radius={[0, 4, 4, 0]}>
                {topPartier.map((p) => (
                  <Cell
                    key={p.partikode}
                    fill={getPartiFarge(p.partikode)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
