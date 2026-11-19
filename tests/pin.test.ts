import { test } from "node:test";
import assert from "node:assert/strict";
import { isWeakPin } from "../src/lib/pin";

test("factory default PINs are weak", () => {
  assert.equal(isWeakPin("1234"), true);
  assert.equal(isWeakPin("6767"), true);
});

test("repeated digits and straight runs are weak", () => {
  for (const p of ["0000", "1111", "999999", "4321", "3456", "987654", "012345"]) assert.equal(isWeakPin(p), true, p);
});

test("ordinary PINs are fine", () => {
  for (const p of ["2580", "7319", "1357", "1212", "8820", "135790"]) assert.equal(isWeakPin(p), false, p);
});
