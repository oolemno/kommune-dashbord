import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { KommuneData } from "../lib/useKommuneData";
import { CardSkeleton } from "./Skeleton";

interface Props {
  data: KommuneData;
  kommuneNavn: string;
}

// Map SSB arealtyper to display categories
const AREAL_MAPPING: Record<string, { label: string; color: string }> = {
  Skog: { label: "Skog", color: "#22c55e" },
  "Åpen fastmark": { label: "Åpen mark", color: "#a3e635" },
  Jordbruk: { label: "Jordbruk", color: "#eab308" },
  Jordbruksareal: { label: "Jordbruk", color: "#eab308" },
  "Bebygd og samferdselsareal": { label: "Utbygd", color: "#78716c" },
  Boligbebyggelse: { label: "Bolig", color: "#94a3b8" },
  "Ferskvann og hav": { label: "Vann", color: "#3b82f6" },
  Ferskvann: { label: "Ferskvann", color: "#3b82f6" },
  Myr: { label: "Myr", color: "#a16207" },
  Fjell: { label: "Fjell", color: "#d6d3d1" },
  "Snø, is og bre": { label: "Snø/is", color: "#e2e8f0" },
};

export function Areal({ data, kommuneNavn }: Props) {
  if (!data.areal) return <CardSkeleton />;

  // Get latest year and aggregate
  const latestYear = data.areal.reduce(
    (max, d) => (d.year > max ? d.year : max),
    ""
  );
  const latestData = data.areal.filter((d) => d.year === latestYear);

  // Map to chart data
  const chartData = latestData
    .map((d) => {
      const mapping = AREAL_MAPPING[d.arealtype] || {
        label: d.arealtype,
        color: "#d4d4d8",
      };
      return {
        name: mapping.label,
        value: Math.round(d.km2 * 100) / 100,
        color: mapping.color,
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalKm2 = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
        Areal
      </h3>

      <p className="mb-1 text-2xl font-bold text-stone-900">
        {totalKm2.toFixed(1)} km²
      </p>
      <p className="mb-4 text-sm text-stone-500">totalt areal</p>

      {chartData.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="h-40 w-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={65}
                  paddingAngle={1}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)} km²`]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 space-y-1">
            {chartData.slice(0, 6).map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-stone-500 truncate">{d.name}</span>
                <span className="ml-auto font-medium text-stone-700">
                  {d.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
