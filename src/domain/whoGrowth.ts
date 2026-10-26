import weightRows from "../data/weianthro.json";
import lengthRows from "../data/lenanthro.json";
import headRows from "../data/hcanthro.json";
import { Baby, CareEvent } from "./types";

type LmsRow = [sex: number, day: number, l: number, m: number, s: number];
export type GrowthIndicator = "weight" | "length" | "head";
export type GrowthScore = { z: number; percentile: number; adjustedValue: number; ageDays: number; indicator: GrowthIndicator };

const tables: Record<GrowthIndicator, LmsRow[]> = {
  weight: weightRows as LmsRow[],
  length: lengthRows as LmsRow[],
  head: headRows as LmsRow[]
};

function normalCdf(z: number) {
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + (z < 0 ? -erf : erf));
}

export function whoGrowthScore(baby: Baby, event: CareEvent, indicator: GrowthIndicator): GrowthScore | null {
  if (!baby.growthChartSex) return null;
  const ageDays = Math.floor((Date.parse(`${event.startedAt.slice(0, 10)}T00:00:00Z`) - Date.parse(`${baby.birthDate}T00:00:00Z`)) / 86_400_000);
  if (ageDays < 0 || ageDays > 1826) return null;
  const raw = indicator === "weight" ? event.weightG === undefined ? NaN : event.weightG / 1000
    : indicator === "length" ? event.lengthCm ?? NaN : event.headCm ?? NaN;
  if (!Number.isFinite(raw) || raw <= 0) return null;

  let adjustedValue = raw;
  if (indicator === "length") {
    const position = event.lengthPosition ?? (ageDays < 731 ? "recumbent" : "standing");
    if (ageDays < 274 && position === "standing") return null;
    if (ageDays < 731 && position === "standing") adjustedValue += 0.7;
    if (ageDays >= 731 && position === "recumbent") adjustedValue -= 0.7;
  }

  const sexCode = baby.growthChartSex === "male" ? 1 : 2;
  const row = tables[indicator].find((item) => item[0] === sexCode && item[1] === ageDays);
  if (!row) return null;
  const [, , l, m, s] = row;
  let z = Math.abs(l) < 1e-8 ? Math.log(adjustedValue / m) / s : (Math.pow(adjustedValue / m, l) - 1) / (l * s);
  if (!Number.isFinite(z)) return null;
  if (z > 3) {
    const sd2 = l === 0 ? m * Math.exp(2 * s) : m * Math.pow(1 + l * s * 2, 1 / l);
    const sd3 = l === 0 ? m * Math.exp(3 * s) : m * Math.pow(1 + l * s * 3, 1 / l);
    z = 3 + (adjustedValue - sd3) / (sd3 - sd2);
  } else if (z < -3) {
    const sd2 = l === 0 ? m * Math.exp(-2 * s) : m * Math.pow(1 - l * s * 2, 1 / l);
    const sd3 = l === 0 ? m * Math.exp(-3 * s) : m * Math.pow(1 - l * s * 3, 1 / l);
    z = -3 + (adjustedValue - sd3) / (sd2 - sd3);
  }
  return { z, percentile: Math.max(0.1, Math.min(99.9, normalCdf(z) * 100)), adjustedValue, ageDays, indicator };
}

export function growthAgeLabel(baby: Baby, event: CareEvent) {
  const date = Date.parse(`${event.startedAt.slice(0, 10)}T00:00:00Z`);
  const birth = Date.parse(`${baby.birthDate}T00:00:00Z`);
  const days = Math.max(0, Math.floor((date - birth) / 86_400_000));
  const months = Math.floor(days / 30.4375);
  return `${Math.floor(months / 12)}y ${months % 12}a`;
}

