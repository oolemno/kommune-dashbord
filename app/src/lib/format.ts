export function formatNumber(n: number): string {
  return n.toLocaleString("nb-NO");
}

export function formatKr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mill. kr`;
  if (n >= 1_000) return `${formatNumber(Math.round(n))} kr`;
  return `${n} kr`;
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)} %`;
}

export function formatCompare(oslo: number, lillesand: number): string {
  if (oslo === 0 || lillesand === 0) return "";
  const diff = Math.round(((oslo - lillesand) / lillesand) * 100);
  if (diff > 3) {
    return `Oslo ${diff}% høyere (${formatKr(oslo)} vs ${formatKr(lillesand)})`;
  }
  if (diff < -3) {
    return `Lillesand ${Math.abs(diff)}% høyere (${formatKr(lillesand)} vs ${formatKr(oslo)})`;
  }
  return `Omtrent likt (${formatKr(oslo)} vs ${formatKr(lillesand)})`;
}
