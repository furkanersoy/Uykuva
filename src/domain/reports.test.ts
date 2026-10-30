import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../data/seed";
import { createDoctorSummary, createDoctorSummaryHtml, createMemoryBookHtml, createSleepWeekSummary, createSleepWeekSummaryHtml } from "./reports";

test("doctor summary labels medicine dose as user-entered and avoids advice", () => {
  const state = createInitialState();
  state.events = [{
    id: "h1",
    kind: "health",
    healthType: "medicine",
    medicineName: "Örnek",
    doseAsEntered: "2 ml",
    startedAt: "2026-10-25T20:00:00Z",
    caregiver: "Anne"
  }];
  const summary = createDoctorSummary(state, new Date("2026-10-26T12:00:00Z"));
  assert.match(summary, /kullanıcının girdiği: 2 ml/);
  assert.match(summary, /doz önerisi değildir/);
});

test("doctor summary includes timestamped night waking responses", () => {
  const state = createInitialState();
  state.sleepPlan.checkIns = [{ date: "2026-10-26", nightWakeLogs: [
    { id: "wake-1", at: "2026-10-26T02:15:00Z", response: "comfort", caregiver: "Baba" }
  ] }];
  const summary = createDoctorSummary(state, new Date("2026-10-27T12:00:00Z"));
  assert.match(summary, /Gece uyanmaları: 1 yapılandırılmış kayıt/);
  assert.match(summary, /Sakinleştirme \/ yakınlık · Baba/);
});

test("doctor summary keeps private sleep-coaching reflections out of the medical report", () => {
  const state = createInitialState();
  state.sleepPlan.checkIns = [{ date: "2026-10-26", planReflection: "Aile içinde konuşmak istediğimiz özel not." }];
  const summary = createDoctorSummary(state, new Date("2026-10-27T12:00:00Z"));
  assert.doesNotMatch(summary, /Aile içinde konuşmak istediğimiz özel not/);
});

test("doctor summary clips and merges completed sleep within the seven-day window", () => {
  const state = createInitialState();
  state.events = [
    { id: "boundary", kind: "sleep", startedAt: "2026-10-19T23:00:00Z", endedAt: "2026-10-20T01:00:00Z", caregiver: "Anne" },
    { id: "overlap", kind: "sleep", startedAt: "2026-10-20T00:15:00Z", endedAt: "2026-10-20T00:45:00Z", caregiver: "Baba" },
    { id: "ongoing", kind: "sleep", startedAt: "2026-10-26T23:00:00Z", caregiver: "Anne" },
    { id: "future", kind: "sleep", startedAt: "2026-10-27T01:00:00Z", endedAt: "2026-10-27T02:00:00Z", caregiver: "Anne" }
  ];
  const summary = createDoctorSummary(state, new Date("2026-10-27T00:00:00Z"));
  assert.match(summary, /Uyku: 2 tamamlanmış kayıt · toplam 1\.0 saat/);
});

test("doctor summary excludes future care events and uses the latest past growth measurement", () => {
  const state = createInitialState();
  state.events = [
    { id: "growth-new", kind: "growth", startedAt: "2026-10-26T10:00:00Z", weightG: 6500, caregiver: "Anne" },
    { id: "feed-future", kind: "feed", feedType: "bottle", amountMl: 200, startedAt: "2026-10-28T10:00:00Z", caregiver: "Baba" },
    { id: "growth-old", kind: "growth", startedAt: "2026-10-20T10:00:00Z", weightG: 6200, caregiver: "Baba" },
    { id: "health-future", kind: "health", healthType: "symptom", note: "future event", startedAt: "2026-10-28T11:00:00Z", caregiver: "Anne" }
  ];
  const summary = createDoctorSummary(state, new Date("2026-10-27T12:00:00Z"));
  assert.match(summary, /Beslenme: 0 kayıt/);
  assert.match(summary, /Sağlık: 0 kullanıcı kaydı/);
  assert.match(summary, /Son ölçüm .*6500 g/);
  assert.doesNotMatch(summary, /6\.200 g/);
});

test("doctor summary can include a caregiver-selected 14-day period", () => {
  const state = createInitialState();
  state.events = [{ id: "feed-10-days", kind: "feed", feedType: "bottle", amountMl: 120, startedAt: "2026-10-17T10:00:00Z", caregiver: "Anne" }];
  const now = new Date("2026-10-27T12:00:00Z");
  const weekly = createDoctorSummary(state, now, 7);
  const fortnight = createDoctorSummary(state, now, 14);
  assert.match(weekly, /UYKUVA · 7 GÜNLÜK BAKIM ÖZETİ/);
  assert.match(weekly, /Beslenme: 0 kayıt/);
  assert.match(fortnight, /UYKUVA · 14 GÜNLÜK BAKIM ÖZETİ/);
  assert.match(fortnight, /Beslenme: 1 kayıt · kayıtlı biberon toplamı 120 ml/);
  assert.match(createDoctorSummaryHtml(state, now, 14), /<h1>UYKUVA · 14 GÜNLÜK BAKIM ÖZETİ<\/h1>/);
});

test("weekly sleep report splits overnight sleep across local days and includes parent check-ins", () => {
  const state = createInitialState();
  const now = new Date(2026, 9, 27, 12, 0);
  state.baby.birthDate = "2026-06-01";
  state.events = [
    { id: "overnight", kind: "sleep", startedAt: "2026-10-26T23:00:00", endedAt: "2026-10-27T01:00:00", caregiver: "Anne" },
    { id: "morning", kind: "sleep", startedAt: "2026-10-27T07:00:00", endedAt: "2026-10-27T07:45:00", caregiver: "Baba" },
    { id: "future", kind: "sleep", startedAt: "2026-10-28T08:00:00", endedAt: "2026-10-28T09:00:00", caregiver: "Anne" }
  ];
  state.sleepPlan.checkIns = [{ date: "2026-10-27", ease: 2, nightWakings: 5, bedtime: "22:30", wakeTime: "07:00", dayContext: "travel" }];
  const summary = createSleepWeekSummary(state, now);
  assert.match(summary, /27 Ekim.*1 sa 45 dk · 2 uyku kaydı/);
  assert.match(summary, /ebeveyn bildirimi 5\+ · kolaylık 2\/5 · yatış 22:30 · uyanış 07:00 · Seyahat/);
  assert.match(summary, /Dönem toplamı: 2 sa 45 dk · en az bir uyku kaydı olan 2\/7 gün/);
  assert.doesNotMatch(summary, /28 Ekim/);
});

test("weekly sleep PDF escapes names and presents missing data without health claims", () => {
  const state = createInitialState();
  state.baby.name = "<Bebek>";
  const html = createSleepWeekSummaryHtml(state, new Date(2026, 9, 27, 12, 0));
  assert.match(html, /&lt;Bebek&gt;/);
  assert.doesNotMatch(html, /<h1>.*<Bebek>/);
  assert.match(html, /uyku kaydı yok/);
  assert.match(html, /sağlık değerlendirmesi veya uyku hedefi değildir/);
});

test("memory book PDF orders saved memories, excludes future events, and escapes user content", () => {
  const state = createInitialState();
  state.baby.name = "<Bebek>";
  state.events = [
    { id: "late", kind: "memory", memoryTitle: "İlk gülüş", note: "Güzel <an>", startedAt: "2026-10-26T12:00:00", caregiver: "Anne & Baba" },
    { id: "early", kind: "memory", memoryTitle: "İlk gün", startedAt: "2026-10-20T12:00:00", caregiver: "Anne" },
    { id: "future", kind: "memory", memoryTitle: "Gelecek anı", startedAt: "2026-10-28T12:00:00", caregiver: "Anne" },
    { id: "feed", kind: "feed", note: "Anı değil", startedAt: "2026-10-22T12:00:00", caregiver: "Baba" }
  ];
  const html = createMemoryBookHtml(state, new Date("2026-10-27T12:00:00"));
  assert.ok(html.indexOf("İlk gün") < html.indexOf("İlk gülüş"));
  assert.match(html, /&lt;Bebek&gt; için kaydedilen 2 an/);
  assert.match(html, /Güzel &lt;an&gt;/);
  assert.match(html, /Anne &amp; Baba/);
  assert.doesNotMatch(html, /Gelecek anı|Anı değil/);
});

test("memory book embeds only valid JPEG data and handles an empty journal", () => {
  const state = createInitialState();
  state.events = [{
    id: "photo",
    kind: "memory",
    memoryTitle: "Fotoğraflı anı",
    memoryPhotoData: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    startedAt: "2026-10-26T12:00:00",
    caregiver: "Anne"
  }];
  const photoHtml = createMemoryBookHtml(state, new Date("2026-10-27T12:00:00"));
  assert.match(photoHtml, /<img src="data:image\/jpeg;base64,\/9j\/4AAQSkZJRg=="/);
  state.events[0]!.memoryPhotoData = "data:image/jpeg;base64,<script>";
  const invalidPhotoHtml = createMemoryBookHtml(state, new Date("2026-10-27T12:00:00"));
  assert.doesNotMatch(invalidPhotoHtml, /<img src=/);
  state.events = [];
  assert.match(createMemoryBookHtml(state), /Henüz anı eklenmemiş/);
});

test("memory book reports when photo size limits omit images", () => {
  const state = createInitialState();
  const photo = "data:image/jpeg;base64," + "A".repeat(900_000);
  state.events = Array.from({ length: 9 }, (_, index) => ({
    id: `photo-${index}`,
    kind: "memory" as const,
    memoryTitle: `Anı ${index + 1}`,
    memoryPhotoData: photo,
    startedAt: `2026-10-${String(10 + index).padStart(2, "0")}T12:00:00`,
    caregiver: "Anne"
  }));
  const html = createMemoryBookHtml(state, new Date("2026-10-30T12:00:00"));
  assert.match(html, /PDF boyutu sınırı nedeniyle 3 fotoğraf eklenemedi/);
  assert.equal((html.match(/<img src=/g) ?? []).length, 6);
});
