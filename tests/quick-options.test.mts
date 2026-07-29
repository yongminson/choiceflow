import assert from "node:assert/strict";
import test from "node:test";

import {
  getQuickAdvancedAnswer,
  getQuickAdvancedQuestions,
  getQuickBudget,
  getQuickBudgets,
  getQuickPriority,
  getQuickScenario,
  QUICK_SCENARIOS,
} from "../src/lib/recommendation/quick-options.ts";

test("uses category-specific budgets instead of one generic price range", () => {
  const food = getQuickBudgets("food", "solo");
  const appliance = getQuickBudgets("appliance", "digital");

  assert.equal(food[0].maxWon, 10_000);
  assert.equal(appliance[0].maxWon, 500_000);
  assert.notDeepEqual(food, appliance);
});

test("uses scenario-specific budgets for high-value decisions", () => {
  assert.equal(getQuickBudgets("asset", "car")[0].maxWon, 20_000_000);
  assert.equal(getQuickBudgets("asset", "rental")[0].maxWon, 50_000);
});

test("only accepts known scenario, priority, and budget ids", () => {
  assert.equal(getQuickScenario("gift", "parents")?.label, "부모님 감사");
  assert.equal(getQuickPriority("gift", "price")?.label, "가격");
  assert.equal(
    getQuickBudget("gift", "parents", "under-50000")?.maxWon,
    50_000
  );
  assert.equal(getQuickBudget("gift", "parents", "under-500000"), undefined);
});

test("always includes a no-limit budget option", () => {
  for (const category of [
    "food",
    "gift",
    "appliance",
    "fashion",
    "date",
    "asset",
  ] as const) {
    const scenario =
      category === "asset"
        ? "rental"
        : category === "appliance"
          ? "kitchen"
          : category === "gift"
            ? "parents"
            : category === "fashion"
              ? "work"
              : category === "date"
                ? "trip"
                : "solo";
    assert.ok(getQuickBudgets(category, scenario).some((item) => item.id === "any"));
  }
});

test("covers six common use cases in every category", () => {
  for (const scenarios of Object.values(QUICK_SCENARIOS)) {
    assert.equal(scenarios.length, 6);
    assert.equal(new Set(scenarios.map((item) => item.id)).size, 6);
  }
});

test("provides exactly five button-only refinement questions per category", () => {
  for (const category of [
    "food",
    "gift",
    "appliance",
    "fashion",
    "date",
    "asset",
  ] as const) {
    const questions = getQuickAdvancedQuestions(category);
    assert.equal(questions.length, 5);
    assert.equal(new Set(questions.map((item) => item.id)).size, 5);

    for (const question of questions) {
      assert.ok(question.options.length >= 3);
      assert.equal(
        new Set(question.options.map((item) => item.id)).size,
        question.options.length
      );
      assert.ok(
        getQuickAdvancedAnswer(
          category,
          question.id,
          question.options[0].id
        )
      );
    }
  }
});

test("rejects unknown refinement answers", () => {
  assert.equal(
    getQuickAdvancedAnswer("appliance", "unknown", "option-1"),
    undefined
  );
  assert.equal(
    getQuickAdvancedAnswer("appliance", "as", "unknown"),
    undefined
  );
});
