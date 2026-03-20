import { useState } from "react";
import { useKommuneData } from "./lib/useKommuneData";
import { KommuneColumn } from "./components/KommuneColumn";
import { CompareBar } from "./components/CompareBar";

const KOMMUNER = [
  { nr: "0301", navn: "Oslo" },
  { nr: "4215", navn: "Lillesand" },
] as const;

export default function App() {
  const [mobileSelected, setMobileSelected] = useState(0);

  const osloData = useKommuneData(KOMMUNER[0].nr);
  const lillesandData = useKommuneData(KOMMUNER[1].nr);

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-lg font-bold text-stone-900">
            Kommuneprofil
          </h1>
          <p className="text-xs text-stone-400">
            Åpne data fra SSB, Brønnøysund og Valgdirektoratet
          </p>

          {/* Mobile toggle */}
          <div className="mt-3 flex gap-1 md:hidden">
            {KOMMUNER.map((k, i) => (
              <button
                key={k.nr}
                onClick={() => setMobileSelected(i)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  mobileSelected === i
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {k.navn}
              </button>
            ))}
          </div>

          {/* Desktop headers */}
          <div className="mt-3 hidden md:grid md:grid-cols-2 md:gap-6">
            {KOMMUNER.map((k) => (
              <div key={k.nr} className="text-center">
                <span className="text-base font-bold text-stone-700">
                  {k.navn}
                </span>
                <span className="ml-2 text-xs text-stone-400">({k.nr})</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Comparison bar */}
        <div className="mb-6">
          <CompareBar oslo={osloData} lillesand={lillesandData} />
        </div>

        {/* Mobile: show selected kommune */}
        <div className="md:hidden">
          {mobileSelected === 0 ? (
            <KommuneColumn
              data={osloData}
              kommuneNavn={KOMMUNER[0].navn}
            />
          ) : (
            <KommuneColumn
              data={lillesandData}
              kommuneNavn={KOMMUNER[1].navn}
            />
          )}
        </div>

        {/* Desktop: side by side */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-6">
          <KommuneColumn
            data={osloData}
            kommuneNavn={KOMMUNER[0].navn}
          />
          <KommuneColumn
            data={lillesandData}
            kommuneNavn={KOMMUNER[1].navn}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        Data fra SSB, Brønnøysundregistrene og Valgdirektoratet.
        Sist oppdatert: {new Date().toLocaleDateString("nb-NO")}
      </footer>
    </div>
  );
}
