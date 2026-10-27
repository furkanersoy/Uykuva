import assert from "node:assert/strict";
import test from "node:test";
import { createMilkInventory, milkExpiryReminderLeadMs, milkStorageLabel } from "./milk";
import { CareEvent } from "./types";

function pump(id: string, startedAt: string, amountMl: number, milkStorageLocation: "room" | "fridge" | "freezer" = "fridge"): CareEvent {
  return { id, kind: "feed", feedType: "pump", startedAt, amountMl, milkStorageLocation, caregiver: "Anne" };
}

function expressedBottle(id: string, startedAt: string, amountMl: number): CareEvent {
  return { id, kind: "feed", feedType: "bottle", bottleSource: "expressed", startedAt, amountMl, caregiver: "Baba" };
}

test("milk expiry reminder lead can be adaptive or caregiver-selected", () => {
  const hour = 60 * 60_000;
  assert.equal(milkExpiryReminderLeadMs(10 * 24 * hour, "adaptive"), 24 * hour);
  assert.equal(milkExpiryReminderLeadMs(3 * 24 * hour, "adaptive"), 12 * hour);
  assert.equal(milkExpiryReminderLeadMs(12 * hour, "adaptive"), 2 * hour);
  assert.equal(milkExpiryReminderLeadMs(12 * hour, 2), 2 * hour);
  assert.equal(milkExpiryReminderLeadMs(12 * hour, 24), 6 * hour);
  assert.equal(milkExpiryReminderLeadMs(0, 24), 0);
});

test("expressed bottles use the oldest eligible milk batch first", () => {
  const events = [
    pump("old", "2026-10-01T08:00:00.000Z", 100),
    pump("new", "2026-10-01T09:00:00.000Z", 200),
    expressedBottle("bottle", "2026-10-01T10:00:00.000Z", 130)
  ];
  const inventory = createMilkInventory(events, new Date("2026-10-01T11:00:00.000Z"));

  assert.deepEqual(inventory.batches.map((batch) => [batch.event.id, batch.remainingMl]), [["old", 0], ["new", 170]]);
  assert.equal(inventory.availableMl, 170);
});

test("milk discarded before a bottle is not consumed by its inventory deduction", () => {
  const discarded = { ...pump("discarded", "2026-10-01T08:00:00.000Z", 100), milkDiscardedAt: "2026-10-01T09:30:00.000Z" };
  const events = [discarded, pump("eligible", "2026-10-01T09:00:00.000Z", 100), expressedBottle("bottle", "2026-10-01T10:00:00.000Z", 60)];
  const inventory = createMilkInventory(events, new Date("2026-10-01T11:00:00.000Z"));

  assert.deepEqual(inventory.batches.map((batch) => [batch.event.id, batch.remainingMl]), [["eligible", 40]]);
  assert.equal(inventory.availableMl, 40);
});

test("storage windows follow the selected location and the recorded full-thaw time", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");
  const room = createMilkInventory([pump("room", "2026-10-01T08:00:00.000Z", 50, "room")], now).batches[0]!;
  const fridge = createMilkInventory([pump("fridge", "2026-09-27T12:00:00.000Z", 50)], now).batches[0]!;
  const frozen = { ...pump("frozen", "2026-01-01T00:00:00.000Z", 50, "freezer"), milkThawedAt: "2026-10-01T00:00:00.000Z" };
  const thawed = createMilkInventory([frozen], now).batches[0]!;

  assert.equal(room.isExpired, true);
  assert.equal(fridge.isExpired, true);
  assert.equal(thawed.useBy.toISOString(), "2026-10-02T00:00:00.000Z");
  assert.equal(thawed.isThawed, true);
  assert.equal(milkStorageLabel(frozen), "Çözdürülmüş · buzdolabı");
});

test("warming refrigerated or thawed milk starts a two-hour use window", () => {
  const refrigerated = { ...pump("fridge", "2026-10-01T08:00:00.000Z", 80), milkWarmedAt: "2026-10-01T11:00:00.000Z" };
  const thawedAndWarmed = { ...pump("thawed", "2026-09-30T08:00:00.000Z", 80), milkThawedAt: "2026-10-01T08:00:00.000Z", milkWarmedAt: "2026-10-01T11:00:00.000Z" };
  const now = new Date("2026-10-01T11:30:00.000Z");
  const fridgeBatch = createMilkInventory([refrigerated], now).batches[0]!;
  const thawedBatch = createMilkInventory([thawedAndWarmed], now).batches[0]!;

  assert.equal(fridgeBatch.useBy.toISOString(), "2026-10-01T13:00:00.000Z");
  assert.equal(thawedBatch.useBy.toISOString(), "2026-10-01T13:00:00.000Z");
  assert.equal(milkStorageLabel(refrigerated), "Isıtılmış / oda sıcaklığında · 2 sa");
  assert.equal(createMilkInventory([refrigerated], new Date("2026-10-01T13:00:00.000Z")).availableMl, 0);
});

test("inventory excludes expired milk from available volume and flags stock expiring within 48 hours", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");
  const inventory = createMilkInventory([
    pump("expired", "2026-09-27T11:00:00.000Z", 80),
    pump("expiring", "2026-09-29T12:00:00.000Z", 120)
  ], now);

  assert.equal(inventory.batches.find((batch) => batch.event.id === "expired")?.isExpired, true);
  assert.equal(inventory.availableMl, 120);
  assert.equal(inventory.expiringSoonCount, 1);
});
