import type { KommuneData } from "../lib/useKommuneData";
import { Befolkning } from "./Befolkning";
import { Okonomi } from "./Okonomi";
import { Naringsliv } from "./Naringsliv";
import { Areal } from "./Areal";
import { Valg } from "./Valg";

interface Props {
  data: KommuneData;
  kommuneNavn: string;
}

export function KommuneColumn({ data, kommuneNavn }: Props) {
  const loadedCount = data.sectionsLoaded.size;
  const totalSections = 10;

  return (
    <div className="space-y-4">
      {/* Loading progress */}
      {data.loading && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-stone-100">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${Math.round((loadedCount / totalSections) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs text-stone-400">
              {loadedCount}/{totalSections}
            </span>
          </div>
        </div>
      )}

      <Befolkning data={data} kommuneNavn={kommuneNavn} />
      <Okonomi data={data} kommuneNavn={kommuneNavn} />
      <Naringsliv data={data} kommuneNavn={kommuneNavn} />
      <Areal data={data} kommuneNavn={kommuneNavn} />
      <Valg data={data} kommuneNavn={kommuneNavn} />
    </div>
  );
}
