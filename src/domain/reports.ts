import { ageInDays } from "./sleep";
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
  const diapers = events.filter((event) => event.kind === "diaper");
  const health = events.filter((event) => event.kind === "health");
  const growth = state.events.find((event) => event.kind === "growth");
  const totalSleepHours = sleeps.reduce((sum, event) => sum + minutesBetween(event), 0) / 60;
  const bottleMl = feeds.reduce((sum, event) => sum + (event.amountMl ?? 0), 0);
  const lines = [
    `UYKUVA · 7 GÜNLÜK BAKIM ÖZETİ`,
    `${state.baby.name} · ${ageInDays(state.baby.birthDate, now)} günlük · ${state.baby.gestationalWeek}. gebelik haftasında doğdu`,
    `Hazırlanma: ${trDate(now)}`,
    "",
    `Uyku: ${sleeps.length} tamamlanmış kayıt · toplam ${totalSleepHours.toFixed(1)} saat`,
    `Beslenme: ${feeds.length} kayıt${bottleMl ? ` · kayıtlı biberon toplamı ${bottleMl} ml` : ""}`,
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
  lines.push("", "Bu özet kullanıcı tarafından girilen kayıtlardan oluşur; tıbbi değerlendirme veya doz önerisi değildir.");
  return lines.join("\n");
}
