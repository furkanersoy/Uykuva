export type VaccineMilestone = {
  id: string;
  ageMonths: number;
  title: string;
};

export const TURKEY_VACCINE_SCHEDULE_BASE_VERSION = "2025";
export const TURKEY_VACCINE_SCHEDULE_UPDATE_DATE = "2026-09-01";
export const TURKEY_VACCINE_SCHEDULE_UPDATE_SOURCE = "https://hatayism.saglik.gov.tr/TR-391851/cocukluk-donemi-asilama-takviminde-yeni-duzenleme.html";

export function completedAgeMonths(birthDate: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return -1;
  const birth = new Date(`${birthDate}T12:00:00`);
  const normalizedBirth = `${birth.getFullYear()}-${String(birth.getMonth() + 1).padStart(2, "0")}-${String(birth.getDate()).padStart(2, "0")}`;
  if (Number.isNaN(birth.getTime()) || normalizedBirth !== birthDate || !Number.isFinite(now.getTime())) return -1;
  const current = new Date(now);
  current.setHours(12, 0, 0, 0);
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (addMonths(birth, months).getTime() > current.getTime()) months -= 1;
  return Math.max(0, months);
}

// Suggested tracking dates based on the Ministry's 2025 national schedule.
// The second varicella dose at 48 months was added from 1 September 2026.
export const TURKEY_CHILDHOOD_VACCINE_MILESTONES: VaccineMilestone[] = [
  { id: "hepb-birth", ageMonths: 0, title: "Hepatit B · doğum dozu" },
  { id: "bcg-2m", ageMonths: 2, title: "BCG (Verem)" },
  { id: "kpa-2m", ageMonths: 2, title: "KPA · 1. doz" },
  { id: "hexavalent-2m", ageMonths: 2, title: "DaBT-İPA-Hib-HepB · 1. doz" },
  { id: "kpa-4m", ageMonths: 4, title: "KPA · 2. doz" },
  { id: "hexavalent-4m", ageMonths: 4, title: "DaBT-İPA-Hib-HepB · 2. doz" },
  { id: "hexavalent-6m", ageMonths: 6, title: "DaBT-İPA-Hib-HepB · 3. doz" },
  { id: "opa-6m", ageMonths: 6, title: "OPA · 1. doz" },
  { id: "kkk-extra-9m", ageMonths: 9, title: "KKK · ek doz" },
  { id: "kpa-booster-12m", ageMonths: 12, title: "KPA · rapel" },
  { id: "varicella-12m", ageMonths: 12, title: "Suçiçeği · 1. doz" },
  { id: "kkk-12m", ageMonths: 12, title: "KKK · 1. doz" },
  { id: "hexa-booster-18m", ageMonths: 18, title: "DaBT-İPA-Hib-HepB · rapel" },
  { id: "opa-18m", ageMonths: 18, title: "OPA · 2. doz" },
  { id: "hepa-18m", ageMonths: 18, title: "Hepatit A · 1. doz" },
  { id: "hepa-24m", ageMonths: 24, title: "Hepatit A · 2. doz" },
  { id: "kkk-booster-48m", ageMonths: 48, title: "KKK · 2. doz" },
  { id: "dtap-ipv-booster-48m", ageMonths: 48, title: "DaBT-İPA · rapel" },
  { id: "varicella-48m", ageMonths: 48, title: "Suçiçeği · 2. doz" },
  { id: "td-13y", ageMonths: 156, title: "Td · rapel" }
];

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function suggestedVaccineTasks(birthDate: string, existingTitles: string[], now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return [];
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return [];
  const normalizedBirth = `${birth.getFullYear()}-${String(birth.getMonth() + 1).padStart(2, "0")}-${String(birth.getDate()).padStart(2, "0")}`;
  if (normalizedBirth !== birthDate) return [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const normalizedExisting = existingTitles.map((title) => title.trim().toLocaleLowerCase("tr-TR"));
  return TURKEY_CHILDHOOD_VACCINE_MILESTONES.flatMap((milestone) => {
    const dueAt = addMonths(birth, milestone.ageMonths);
    const dueDay = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate()).getTime();
    const normalizedTitle = milestone.title.toLocaleLowerCase("tr-TR");
    if (dueDay < today || normalizedExisting.includes(normalizedTitle)) return [];
    return [{ ...milestone, dueAt }];
  });
}

