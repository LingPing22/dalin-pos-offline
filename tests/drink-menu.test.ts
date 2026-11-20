import { test } from "node:test";
import assert from "node:assert/strict";
import { planDrinkMenu, starterDrink } from "../src/lib/drink-menu";

const p = (id: number, name: string, price: number, extra: object = {}) => ({ id, name, categoryId: 1, price, cost: 10000, active: true, variants: null, ...extra });

test("iced latte becomes latte: hot / iced / blended around the shop's own price", () => {
  const [c] = planDrinkMenu([p(1, "ລາເຕ້ ເຢັນ", 38000)]);
  assert.equal(c.name, "ລາເຕ້");
  assert.deepEqual(c.variants.map((v) => [v.name, v.price]), [["ຮ້ອນ", 33000], ["ເຢັນ", 38000], ["ປັ່ນ", 43000]]);
  assert.deepEqual(c.remove, []);
});

test("the shop's own hot + iced pair is merged into one drink", () => {
  const [c] = planDrinkMenu([p(1, "ຊາຂຽວ ຮ້ອນ", 20000), p(2, "ຊາຂຽວເຢັນ", 28000), p(3, "ເຝີ", 35000)]);
  assert.equal(c.name, "ຊາຂຽວ");
  assert.deepEqual(c.variants.map((v) => [v.name, v.price]), [["ຮ້ອນ", 20000], ["ເຢັນ", 28000]]);
  assert.deepEqual(c.remove, [2]);
});

test("already tidy, hidden, food and clashing names are left alone", () => {
  assert.deepEqual(
    planDrinkMenu([
      p(1, "ກາເຟລາວ", 20000, { variants: [{ name: "ຮ້ອນ", price: 20000, cost: 6000 }] }),
      p(2, "ກາເຟລາວ ຮ້ອນ", 20000), // would clash with #1
      p(3, "ລາເຕ້ ເຢັນ", 35000, { active: false }),
      p(4, "ໝາກມ່ວງປັ່ນ", 30000),
      p(5, "ເຂົ້າຜັດ ໄກ່", 35000),
    ]),
    [],
  );
});

test("a new shop's starter drinks already come hot / iced / blended", () => {
  const latte = starterDrink("ລາເຕ້ ເຢັນ", 35000, 11000);
  assert.equal(latte.name, "ລາເຕ້");
  assert.equal(latte.price, 30000, "list price is the cheapest");
  assert.deepEqual(latte.variants?.map((v) => v.name), ["ຮ້ອນ", "ເຢັນ", "ປັ່ນ"]);
  assert.deepEqual(starterDrink("ເຝີ ຊີ້ນງົວ", 35000, 15000), { name: "ເຝີ ຊີ້ນງົວ", variants: null, price: 35000, cost: 15000 });
});

test("iced milk coffee loses its ice-cube picture once it is also sold hot, unless the shop changed it", () => {
  assert.equal(planDrinkMenu([p(1, "ກາເຟນົມເຢັນ", 25000, { emoji: "🧊" })])[0].emoji, "☕");
  assert.equal(planDrinkMenu([p(1, "ກາເຟນົມເຢັນ", 25000, { emoji: "🥛" })])[0].emoji, undefined);
});
