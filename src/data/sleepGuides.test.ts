import assert from "node:assert/strict";
import test from "node:test";
import { SLEEP_GUIDES, SLEEP_GUIDE_CATEGORIES, sleepGuidesForAge } from "./sleepGuides";

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
    if (guide.minAgeMonths !== undefined && guide.maxAgeMonths !== undefined) assert.ok(guide.maxAgeMonths >= guide.minAgeMonths);
  }
});

test("age-filtered sleep readings use inclusive ranges and keep general caregiver guides", () => {
  const infantGuides = sleepGuidesForAge(4);
  const toddlerGuides = sleepGuidesForAge(48);
  assert.ok(infantGuides.some((guide) => guide.id === "four-month-pattern"));
  assert.ok(infantGuides.some((guide) => guide.id === "caregiver-rest"));
  assert.ok(!infantGuides.some((guide) => guide.id === "toddler-bedtime-resistance"));
  assert.ok(toddlerGuides.some((guide) => guide.id === "toddler-bedtime-resistance"));
  assert.ok(toddlerGuides.some((guide) => guide.id === "nightmares-and-night-terrors"));
  assert.ok(!toddlerGuides.some((guide) => guide.id === "swaddling-safely"));
  assert.equal(sleepGuidesForAge(3).some((guide) => guide.id === "four-month-pattern"), true);
  assert.equal(sleepGuidesForAge(5).some((guide) => guide.id === "four-month-pattern"), true);
  assert.equal(sleepGuidesForAge(4).some((guide) => guide.id === "corrected-age-for-preemies"), false);
  assert.equal(sleepGuidesForAge(4, true).some((guide) => guide.id === "corrected-age-for-preemies"), true);
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
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "reading-sleepy-cues"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "sleep-needs-by-age"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "young-child-night-wakings"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "nightmares-and-night-terrors"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "snoring-and-sleep-breathing"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "corrected-age-for-preemies"));
  assert.ok(SLEEP_GUIDES.some((guide) => guide.id === "safe-break-when-overwhelmed"));
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

test("sleep education adds age ranges without treating them as an individual target", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "sleep-needs-by-age");
  assert.ok(guide);
  assert.match(guide.summary, /0–3 ayda 14–17 saat/);
  assert.match(guide.summary, /4–12 ayda 12–16 saat/);
  assert.match(guide.summary, /tek başına göstermez/i);
  assert.equal(guide.url, "https://www.cdc.gov/sleep/about/");
});

test("sleep breathing guide directs concerning symptoms to clinical or emergency care", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "snoring-and-sleep-breathing");
  assert.ok(guide);
  assert.match(guide.summary, /çocuk doktoruyla görüşün/i);
  assert.match(guide.summary, /112'yi arayın/i);
  assert.match(guide.summary, /uyku eğitimi sorunu olarak değerlendirmeyin/i);
  assert.equal(guide.url, "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Sleep-Apnea-Detection.aspx");
});

test("night terror guide distinguishes it from nightmares and avoids forceful waking", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "nightmares-and-night-terrors");
  assert.ok(guide);
  assert.match(guide.summary, /uykuda olabilir/i);
  assert.match(guide.summary, /zorla uyandırmaya çalışmayın/i);
  assert.match(guide.summary, /tanı koymaz/i);
});

test("corrected-age guide explains its scope and preserves the actual birth date", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "corrected-age-for-preemies");
  assert.ok(guide);
  assert.match(guide.summary, /gerçek doğum tarihini değiştirmez/i);
  assert.match(guide.summary, /ilk 24 ay/i);
  assert.match(guide.summary, /aşı tarihlerini gerçek doğum tarihine göre/i);
  assert.equal(guide.minAgeMonths, 0);
  assert.equal(guide.maxAgeMonths, 24);
  assert.match(guide.url, /healthychildren\.org/);
});

test("caregiver break guide gives a safe place, a short break, help, and never-shake warning", () => {
  const guide = SLEEP_GUIDES.find((item) => item.id === "safe-break-when-overwhelmed");
  assert.ok(guide);
  assert.match(guide.summary, /sırtüstü, boş ve güvenli yatağına/i);
  assert.match(guide.summary, /birkaç dakika sakinleşmek için uzaklaşın/i);
  assert.match(guide.summary, /güvendiğiniz birinden yardım isteyin/i);
  assert.match(guide.summary, /Bebeği asla sarsmayın veya vurmayın/i);
  assert.match(guide.summary, /bir uyku eğitimi yöntemi değildir/i);
  assert.match(guide.url, /healthychildren\.org/);
});
