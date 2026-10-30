import assert from "node:assert/strict";
import test from "node:test";
import { SLEEP_GUIDES, SLEEP_GUIDE_CATEGORIES } from "./sleepGuides";

test("offline sleep guides have unique IDs, age labels, summaries, and HTTPS sources", () => {
  assert.ok(SLEEP_GUIDES.length > 0);
  assert.equal(new Set(SLEEP_GUIDES.map((guide) => guide.id)).size, SLEEP_GUIDES.length);
  for (const guide of SLEEP_GUIDES) {
    assert.ok(guide.title.trim().length > 0);
    assert.ok(guide.age.trim().length > 0);
    assert.ok(guide.summary.trim().length >= 40);
    assert.ok(SLEEP_GUIDE_CATEGORIES.some((category) => category.id === guide.category));
    assert.ok(guide.source.trim().length > 0);
    assert.match(guide.url, /^https:\/\//);
  }
});

test("sleep education includes infant age changes and caregiver support", () => {
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "four-month-pattern"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "settling-supports"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "safe-sleep-space"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "swaddling-safely"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "caregiver-rest"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "nap-transitions"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "night-feeds-and-sleep-plans"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "separation-anxiety-and-sleep"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "when-to-pause-sleep-plan"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "toddler-bedtime-resistance"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "screens-before-bed"));
});

test("safe sleep guide covers sitting products and points to AAP guidance", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "safe-sleep-space");
  assert.ok(guide);
  assert.match(guide.summary, /araba koltuğu, puset, salıncak veya taşıyıcıda uyuyakalırsa/i);
  assert.equal(guide.url, "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/a-parents-guide-to-safe-sleep.aspx");
});

test("swaddling guidance makes the rolling and weighted-product limits clear", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "swaddling-safely");
  assert.ok(guide);
  assert.match(guide.summary, /dönmeye çalıştığını gösterir göstermez sarmayı bırakın/i);
  assert.match(guide.summary, /Ağırlıklı kundak.*kullanmayın/i);
  assert.match(guide.summary, /ani bebek ölümü riskini azalttığı gösterilmemiştir/i);
});

test("separation anxiety reading frames sleep changes as a normal optional-care phase", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "separation-anxiety-and-sleep");
  assert.ok(guide);
  assert.match(guide.summary, /gelişimin olağan bir dönemidir/i);
  assert.match(guide.summary, /uyku eğitimine başlama zorunluluğu değildir/i);
  assert.match(guide.url, /healthychildren\.org/);
});

test("settling-support guide keeps caregiver support optional and protects feeding needs", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "settling-supports");
  assert.ok(guide);
  assert.match(guide.summary, /değiştirmek zorunlu değildir/i);
  assert.match(guide.summary, /önceki desteğe dönmek/i);
  assert.match(guide.summary, /Beslenme.*ihtiyaçlarını plana göre geciktirmeyin/i);
});
