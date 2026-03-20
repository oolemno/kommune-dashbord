import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { KommuneData } from "../lib/useKommuneData";
import { formatNumber } from "../lib/format";
import { CardSkeleton } from "./Skeleton";

const AGE_COLORS: Record<string, string> = {
  "0-5": "#93c5fd",
  "6-15": "#60a5fa",
  "16-24": "#3b82f6",
  "25-44": "#2563eb",
  "45-66": "#1d4ed8",
  "67-79": "#f59e0b",
  "80+": "#ef4444",
};

interface Props {
  data: KommuneData;
  kommuneNavn: string;
}

export function Befolkning({ data, kommuneNavn }: Props) {
  if (!data.befolkning) return <CardSkeleton />;

  const latest = data.befolkning.latest?.[0];
  const growth = data.befolkning.growth?.[0];

  // Sparkline data
  const sparkData = data.befolkning.data
    .filter((d) => d.kommuneKode === latest?.kommuneKode)
    .map((d) => ({ year: d.year, pop: d.population }));

  // Framskriving 2040
  const fram2040 = data.framskriving?.hovedalternativ?.find(
    (d) => d.year === "2040"
  );

  // Aldersfordeling - group into age buckets
  const ageGroups = groupAges(data.aldersfordeling || []);

  // Sparkline Y domain — zoom into actual data range
  const sparkMin = sparkData.length > 0 ? Math.min(...sparkData.map((d) => d.pop)) : 0;
  const sparkMax = sparkData.length > 0 ? Math.max(...sparkData.map((d) => d.pop)) : 0;
  const sparkPad = Math.max((sparkMax - sparkMin) * 0.15, sparkMax * 0.01);
  const sparkDomain: [number, number] = [sparkMin - sparkPad, sparkMax + sparkPad];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
        Befolkning
      </h3>

      {/* Innbyggertall */}
      <p className="text-4xl font-bold text-stone-900">
        {latest ? formatNumber(latest.population) : "–"}
      </p>
      <p className="mt-1 text-sm text-stone-500">
        innbyggere i {kommuneNavn}
      </p>

      {/* Growth */}
      {growth && (
        <p className="mt-1 text-sm text-stone-500">
          <span
            className={
              growth.yearlyGrowthPercent > 0
                ? "text-emerald-600"
                : "text-red-600"
            }
          >
            {growth.yearlyGrowthPercent > 0 ? "+" : ""}
            {growth.yearlyGrowthPercent.toFixed(1)} % / år
          </span>{" "}
          siste 10 år
        </p>
      )}

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div className="mt-3 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <YAxis domain={sparkDomain} hide />
              <Line
                type="monotone"
                dataKey="pop"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Tooltip
                formatter={(v: number) => [formatNumber(v), "Innbyggere"]}
                labelFormatter={(l) => `${l}`}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Framskriving */}
      {fram2040 && (
        <p className="mt-3 text-sm text-stone-500">
          Forventet 2040:{" "}
          <span className="font-semibold text-stone-700">
            {formatNumber(fram2040.population)}
          </span>
        </p>
      )}

      {/* Aldersfordeling */}
      {ageGroups.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-stone-400">
            Aldersfordeling
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageGroups} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="gruppe"
                  width={45}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => [formatNumber(v), "Personer"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="antall"
                  radius={[0, 4, 4, 0]}
                  fill="#3b82f6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function groupAges(
  points: { aldersgruppe: string; antall: number }[]
): { gruppe: string; antall: number; fill: string }[] {
  if (points.length === 0) return [];

  // Sum across kjønn for the latest year
  const sums: Record<string, number> = {};
  for (const p of points) {
    const key = p.aldersgruppe;
    sums[key] = (sums[key] || 0) + p.antall;
  }

  // Map SSB age codes to our display groups
  const groups = Object.entries(sums)
    .map(([gruppe, antall]) => ({
      gruppe: gruppe.replace(" år", ""),
      antall,
      fill: AGE_COLORS[gruppe] || "#94a3b8",
    }))
    .filter((g) => g.antall > 0);

  return groups;
}
