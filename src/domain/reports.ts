import { ageInDays, nightWakeResponseLabel, sleepMinutesBetween } from "./sleep";
import { completedFeedMinutes } from "./feeding";
import { AppState } from "./types";
import { DEVELOPMENT_CHECKPOINTS } from "../data/developmentMilestones";

function trDate(value: string | Date) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

export type DoctorSummaryPeriod = 7 | 14 | 30;

export function createDoctorSummary(state: AppState, now = new Date(), periodDays: DoctorSummaryPeriod = 7): string {
  const since = now.getTime() - periodDays * 86_400_000;
  const events = state.events.filter((event) => {
    const startedAt = new Date(event.startedAt).getTime();
    return Number.isFinite(startedAt) && startedAt >= since && startedAt <= now.getTime();
  });
  const sleeps = state.events.filter((event) => {
    if (event.kind !== "sleep" || !event.endedAt) return false;
    const start = new Date(event.startedAt).getTime();
    const end = new Date(event.endedAt).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end > start && end > since && end <= now.getTime();
  });
  const feeds = events.filter((event) => event.kind === "feed" && event.feedType !== "pump");
  const pumping = events.filter((event) => event.kind === "feed" && event.feedType === "pump");
  const solidMeals = feeds.filter((event) => event.feedType === "solid");
  const diapers = events.filter((event) => event.kind === "diaper");
  const health = events.filter((event) => event.kind === "health");
  const growth = state.events
    .filter((event) => event.kind === "growth" && Number.isFinite(new Date(event.startedAt).getTime()) && new Date(event.startedAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  const latestDevelopment = [...(state.developmentCheckIns ?? [])]
    .filter((item) => Number.isFinite(new Date(item.checkedAt).getTime()) && new Date(item.checkedAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())[0];
  const developmentCheckpoint = latestDevelopment && DEVELOPMENT_CHECKPOINTS.find((item) => item.ageMonths === latestDevelopment.ageMonths);
  const totalSleepHours = sleepMinutesBetween(sleeps, new Date(since), now) / 60;
  const bottleMl = feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0);
  const breastMinutes = feeds.reduce((sum, event) => sum + completedFeedMinutes(event), 0);
  const lines = [
    `UYKUVA · ${periodDays} GÜNLÜK BAKIM ÖZETİ`,
    `${state.baby.name} · ${ageInDays(state.baby.birthDate, now)} günlük · ${state.baby.gestationalWeek}. gebelik haftasında doğdu`,
    `Hazırlanma: ${trDate(now)}`,
    "",
    `Uyku: ${sleeps.length} tamamlanmış kayıt · toplam ${totalSleepHours.toFixed(1)} saat`,
    `Beslenme: ${feeds.length} kayıt${breastMinutes ? ` · ${breastMinutes} dk emzirme` : ""}${bottleMl ? ` · kayıtlı biberon toplamı ${bottleMl} ml` : ""}${solidMeals.length ? ` · ${solidMeals.length} katı öğün` : ""}`,
    `Bez: ${diapers.length} kayıt`,
    `Sağlık: ${health.length} kullanıcı kaydı`
  ];
  if (pumping.length) lines.push(`Sağım: ${pumping.length} kayıt · toplam ${pumping.reduce((sum, event) => sum + (event.amountMl ?? 0), 0)} ml`);
  const nightWakeLogs = state.sleepPlan.checkIns.flatMap((checkIn) => checkIn.nightWakeLogs ?? [])
    .filter((log) => new Date(log.at).getTime() >= since && new Date(log.at).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  if (nightWakeLogs.length) {
    lines.push(`Gece uyanmaları: ${nightWakeLogs.length} yapılandırılmış kayıt`);
    nightWakeLogs.slice(-30).forEach((log) => lines.push(`- ${trDate(log.at)} · ${nightWakeResponseLabel(log.response)} · ${log.caregiver}`));
  }
  if (growth) {
    lines.push(`Son ölçüm (${trDate(growth.startedAt)}): ${growth.weightG ? `${growth.weightG} g` : "—"} · ${growth.lengthCm ? `${growth.lengthCm} cm` : "—"} · baş ${growth.headCm ? `${growth.headCm} cm` : "—"}`);
  }
  if (latestDevelopment && developmentCheckpoint) {
    const milestones = developmentCheckpoint.groups.flatMap((group) => group.items);
    const observed = milestones.filter((item) => latestDevelopment.answers[item.id] === "yes");
    const unsure = milestones.filter((item) => latestDevelopment.answers[item.id] === "notSure");
    const notYet = milestones.filter((item) => latestDevelopment.answers[item.id] === "notYet");
    lines.push(`Gelişim gözlemi · ${developmentCheckpoint.title} · ${trDate(latestDevelopment.checkedAt)} · ${observed.length} gözlemledim / ${unsure.length} emin değilim / ${notYet.length} henüz görmedim`);
    if (notYet.length) lines.push(`Henüz gözlemlenmedi olarak işaretlenenler: ${notYet.map((item) => item.label).join("; ")}`);
    if (unsure.length) lines.push(`Emin olunmayan gözlemler: ${unsure.map((item) => item.label).join("; ")}`);
    if (latestDevelopment.note?.trim()) lines.push(`Gelişim görüşme notu: ${latestDevelopment.note.trim()}`);
  }
  if (health.length) {
    lines.push("", "Sağlık kayıtları:");
    health.slice(0, 20).forEach((event) => {
      const detail = event.healthType === "temperature"
        ? `${event.temperatureC ?? "—"} °C`
        : event.healthType === "medicine"
          ? `${event.medicineName || "İlaç"}${event.doseAsEntered ? ` · kullanıcının girdiği: ${event.doseAsEntered}` : ""}`
          : event.note || "Belirti notu";
      lines.push(`- ${trDate(event.startedAt)} · ${detail}`);
    });
  }
  if (solidMeals.length) {
    lines.push("", "Katı gıda kayıtları:");
    solidMeals.slice(0, 20).forEach((event) => {
      const details = [
        event.foods?.length ? event.foods.join(", ") : "Yiyecek adı girilmedi",
        event.allergens?.length ? `etiketler: ${event.allergens.join(", ")}` : undefined,
        event.reactionNote ? `gözlem: ${event.reactionNote}` : undefined
      ].filter(Boolean).join(" · ");
      lines.push(`- ${trDate(event.startedAt)} · ${details}`);
    });
  }
  const completedVaccines = state.careTasks
    .filter((task) => task.type === "vaccine" && task.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  if (completedVaccines.length) {
    lines.push("", "Uygulamada tamamlandı olarak işaretlenen aşılar:");
    completedVaccines.slice(0, 20).forEach((task) => {
      lines.push(`- ${task.title} · işaretleme tarihi ${trDate(task.completedAt!)} · planlanan tarih ${trDate(task.dueAt)}`);
    });
  }
  const appointments = state.careTasks
    .filter((task) => task.type === "appointment" && new Date(task.dueAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  if (appointments.length) {
    lines.push("", "Yaklaşan doktor randevuları ve hazırlık notları:");
    appointments.slice(0, 5).forEach((task) => {
      lines.push(`- ${task.title} · ${trDate(task.dueAt)}${task.note ? ` · Hazırlık notu: ${task.note}` : ""}`);
    });
  }
  lines.push("", "Bu özet kullanıcı tarafından girilen kayıtlardan oluşur. Gelişim gözlemi CDC yaş listesine dayanır; standart, doğrulanmış tarama aracı veya tanı değildir. Sağlık değerlendirmesi sunmaz; kullanıcının girdiği miktarlar doz önerisi değildir.");
  return lines.join("\n");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}

export function createDoctorSummaryHtml(state: AppState, now = new Date(), periodDays: DoctorSummaryPeriod = 7): string {
  const lines = createDoctorSummary(state, now, periodDays).split("\n");
  const [title, subtitle, prepared, ...details] = lines;
  const detailMarkup = details.map((line) => {
    if (!line.trim()) return "";
    if (line.endsWith(":")) return `<h2>${escapeHtml(line)}</h2>`;
    if (line.startsWith("- ")) return `<p class="bullet">• ${escapeHtml(line.slice(2))}</p>`;
    return `<p>${escapeHtml(line)}</p>`;
  }).join("\n");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    @page { size: A4; margin: 18mm 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #263631; font-size: 12px; line-height: 1.55; }
    header { border-bottom: 2px solid #718b7c; padding-bottom: 12px; margin-bottom: 18px; }
    h1 { font-size: 22px; margin: 0 0 5px; color: #3e594d; }
    .subtitle { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
    .prepared { color: #66746d; font-size: 10px; margin: 0; }
    h2 { font-size: 13px; margin: 15px 0 4px; color: #3e594d; }
    p { margin: 5px 0; }
    .bullet { padding-left: 12px; }
    .notice { margin-top: 22px; border-top: 1px solid #d9e0dc; padding-top: 10px; font-size: 10px; color: #66746d; }
  </style></head><body><header><h1>${escapeHtml(title ?? "Uykuva bakım özeti")}</h1><p class="subtitle">${escapeHtml(subtitle ?? "")}</p><p class="prepared">${escapeHtml(prepared ?? "")}</p></header><main>${detailMarkup}</main></body></html>`;
}

