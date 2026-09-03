import assert from "node:assert/strict";
import { test } from "node:test";
import { decideFromSelfInfo } from "./decide";
import type { MaternitySelfInfo } from "./types";

const NOW = new Date("2026-09-01T09:00:00+09:00");
const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * DAY);

function info(over: Partial<MaternitySelfInfo> = {}): MaternitySelfInfo {
  return {
    municipalitySupported: true,
    expectedBirthDate: daysFromNow(90),
    checkups: [{ examinedOn: daysFromNow(-14) }],
    ...over,
  };
}

test("自治体が未対応なら母子手帳へ誘導する", () => {
  const d = decideFromSelfInfo(info({ municipalitySupported: false }), daysFromNow(90), NOW);
  assert.equal(d.outcome, "rejected");
  assert.equal(d.outcome === "rejected" && d.suggestBoshiTecho, true);
});

test("健診の記録がなければ通さない", () => {
  const d = decideFromSelfInfo(info({ checkups: [] }), daysFromNow(90), NOW);
  assert.equal(d.outcome, "rejected");
});

test("直近の健診が古すぎれば通さない", () => {
  const d = decideFromSelfInfo(
    info({ checkups: [{ examinedOn: daysFromNow(-200) }] }),
    daysFromNow(90),
    NOW,
  );
  assert.equal(d.outcome, "rejected");
  assert.match(d.outcome === "rejected" ? d.reason : "", /健診/);
});

test("健診が新しく予定日も妥当なら通す", () => {
  const d = decideFromSelfInfo(info(), daysFromNow(90), NOW);
  assert.equal(d.outcome, "verified");
  assert.equal(d.outcome === "verified" && d.shouldUpdateDueDate, false);
});

test("記録の予定日が申告と大きくずれていれば記録を正として更新する", () => {
  const recorded = daysFromNow(60);
  const d = decideFromSelfInfo(info({ expectedBirthDate: recorded }), daysFromNow(90), NOW);
  assert.equal(d.outcome, "verified");
  assert.equal(d.outcome === "verified" && d.shouldUpdateDueDate, true);
  assert.equal(
    d.outcome === "verified" && d.verifiedDueDate.getTime(),
    recorded.getTime(),
  );
});

test("数日のずれでは更新しない", () => {
  const d = decideFromSelfInfo(
    info({ expectedBirthDate: daysFromNow(92) }),
    daysFromNow(90),
    NOW,
  );
  assert.equal(d.outcome === "verified" && d.shouldUpdateDueDate, false);
});

test("記録に予定日がなければ本人の申告を使う", () => {
  const declared = daysFromNow(100);
  const d = decideFromSelfInfo(info({ expectedBirthDate: null }), declared, NOW);
  assert.equal(d.outcome, "verified");
  assert.equal(d.outcome === "verified" && d.verifiedDueDate.getTime(), declared.getTime());
});

test("予定日が先すぎれば通さない", () => {
  const d = decideFromSelfInfo(
    info({ expectedBirthDate: daysFromNow(320) }),
    daysFromNow(320),
    NOW,
  );
  assert.equal(d.outcome, "rejected");
  assert.equal(d.outcome === "rejected" && d.suggestBoshiTecho, false);
});

test("産後8週を過ぎていれば通さない（育児期へ案内）", () => {
  const d = decideFromSelfInfo(
    info({
      expectedBirthDate: daysFromNow(-70),
      checkups: [{ examinedOn: daysFromNow(-80) }],
    }),
    daysFromNow(-70),
    NOW,
  );
  assert.equal(d.outcome, "rejected");
  assert.match(d.outcome === "rejected" ? d.reason : "", /育児期/);
});

test("産後8週以内なら通す（産褥期の利用を切らない）", () => {
  const d = decideFromSelfInfo(
    info({
      expectedBirthDate: daysFromNow(-30),
      checkups: [{ examinedOn: daysFromNow(-40) }],
    }),
    daysFromNow(-30),
    NOW,
  );
  assert.equal(d.outcome, "verified");
});
