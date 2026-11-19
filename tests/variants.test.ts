import { test } from "node:test";
import assert from "node:assert/strict";
import { choicesOf, lineName, typeFromName } from "../src/lib/types";

test("a plain product is grouped by the type its name says", () => {
  assert.equal(typeFromName("ກາເຟລາວ ຮ້ອນ"), "ຮ້ອນ");
  assert.equal(typeFromName("ກາເຟນົມເຢັນ"), "ເຢັນ");
  assert.equal(typeFromName("ໝາກມ່ວງປັ່ນ"), "ປັ່ນ");
  assert.equal(typeFromName("ຄາປູຊີໂນ່"), null);
  assert.equal(typeFromName("ກາເຟ ຮ້ອນ/ເຢັນ"), null, "ambiguous names stay ungrouped");
});

test("a product with variants gets one tile per variant, at that variant's price", () => {
  const p = { name: "ລາເຕ້", price: 30000, variants: [{ name: "ຮ້ອນ", price: 30000, cost: 9000 }, { name: "ເຢັນ", price: 35000, cost: 11000 }] };
  assert.deepEqual(choicesOf(p), [
    { type: "ຮ້ອນ", variant: "ຮ້ອນ", price: 30000 },
    { type: "ເຢັນ", variant: "ເຢັນ", price: 35000 },
  ]);
  assert.deepEqual(choicesOf({ name: "ຊາໄທ ເຢັນ", price: 25000, variants: null }), [{ type: "ເຢັນ", variant: null, price: 25000 }]);
});

test("bill lines name the variant once", () => {
  assert.equal(lineName("ກາເຟລາວ", "ເຢັນ"), "ກາເຟລາວ (ເຢັນ)");
  assert.equal(lineName("ກາເຟນົມເຢັນ", "ເຢັນ"), "ກາເຟນົມເຢັນ");
  assert.equal(lineName("ເຝີ", null), "ເຝີ");
});
