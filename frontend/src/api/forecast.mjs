// Least-squares trend line through a weekly series, projected `ahead` weeks forward (never below zero).
// ponytail: linear trend only; swap in seasonal (Holt-Winters) once there's a year of data.
export function forecast(series, ahead = 4) {
  const n = series.length;
  if (n === 0) return Array(ahead).fill(0);
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  series.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den ? num / den : 0;
  return Array.from({ length: ahead }, (_, i) => Math.max(0, Math.round((meanY + slope * (n + i - meanX)) * 10) / 10));
}
