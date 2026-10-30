import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../data/seed";
import { createDoctorSummary } from "./reports";

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
});

