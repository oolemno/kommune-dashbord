export interface BrregResult {
  nyregistreringer: number;
  loading: boolean;
  error: string | null;
}

export async function fetchBrregNyregistreringer(
  kommunenummer: string
): Promise<number> {
  const dato = new Date();
  dato.setFullYear(dato.getFullYear() - 1);
  const fra = dato.toISOString().split("T")[0];

  const url = `/api/brreg/enhetsregisteret/api/enheter?kommunenummer=${kommunenummer}&fraRegistreringsdatoEnhetsregisteret=${fra}&size=0`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Brreg feil: ${res.status}`);
  const data = await res.json();
  return data.page?.totalElements ?? 0;
}
