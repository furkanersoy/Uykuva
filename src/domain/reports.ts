import { ageInDays } from "./sleep";
import { completedFeedMinutes } from "./feeding";
import { AppState, CareEvent } from "./types";

function minutesBetween(event: CareEvent) {
  if (!event.endedAt) return 0;
  return Math.max(0, (new Date(event.endedAt).getTime() - new Date(event.startedAt).getTime()) / 60_000);
}

function trDate(value: string | Date) {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}

export function createDoctorSummary(state: AppState, now = new Date()): string {
  const since = now.getTime() - 7 * 86_400_000;
  const events = state.events.filter((event) => new Date(event.startedAt).getTime() >= since);
  const sleeps = events.filter((event) => event.kind === "sleep" && event.endedAt);
  const feeds = events.filter((event) => event.kind === "feed");
  const solidMeals = feeds.filter((event) => event.feedType === "solid");
  const diapers = events.filter((event) => event.kind === "diaper");
  const health = events.filter((event) => event.kind === "health");
  const growth = state.events.find((event) => event.kind === "growth");
  const totalSleepHours = sleeps.reduce((sum, event) => sum + minutesBetween(event), 0) / 60;
  const bottleMl = feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0);
  const breastMinutes = feeds.reduce((sum, event) => sum + completedFeedMinutes(event), 0);
  const lines = [
    `UYKUVA · 7 GÜNLÜK BAKIM ÖZETİ`,
    `${state.baby.name} · ${ageInDays(state.baby.birthDate, now)} günlük · ${state.baby.gestationalWeek}. gebelik haftasında doğdu`,
    `Hazırlanma: ${trDate(now)}`,
    "",
    `Uyku: ${sleeps.length} tamamlanmış kayıt · toplam ${totalSleepHours.toFixed(1)} saat`,
    `Beslenme: ${feeds.length} kayıt${breastMinutes ? ` · ${breastMinutes} dk emzirme` : ""}${bottleMl ? ` · kayıtlı biberon toplamı ${bottleMl} ml` : ""}${solidMeals.length ? ` · ${solidMeals.length} katı öğün` : ""}`,
    `Bez: ${diapers.length} kayıt`,
    `Sağlık: ${health.length} kullanıcı kaydı`
  ];
  if (growth) {
    lines.push(`Son ölçüm (${trDate(growth.startedAt)}): ${growth.weightG ? `${growth.weightG} g` : "—"} · ${growth.lengthCm ? `${growth.lengthCm} cm` : "—"} · baş ${growth.headCm ? `${growth.headCm} cm` : "—"}`);
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
  lines.push("", "Bu özet kullanıcı tarafından girilen kayıtlardan oluşur; tıbbi değerlendirme veya doz önerisi değildir.");
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

export function createDoctorSummaryHtml(state: AppState, now = new Date()): string {
  const lines = createDoctorSummary(state, now).split("\n");
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
