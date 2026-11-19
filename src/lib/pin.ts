/** Factory PINs every new install starts with — they must be changed on first login. */
export const DEFAULT_PINS = { owner: "1234", cashier: "6767" } as const;

/** PINs anyone would guess first: the factory defaults, 0000 / 1111…, 1234 / 4321… */
export function isWeakPin(pin: string): boolean {
  if (pin === DEFAULT_PINS.owner || pin === DEFAULT_PINS.cashier) return true;
  if (/^(\d)\1+$/.test(pin)) return true;
  const d = [...pin].map(Number);
  const step = d[1] - d[0];
  return (step === 1 || step === -1) && d.every((v, i) => i === 0 || v - d[i - 1] === step);
}
