export function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val));
}

export function easeLinear(t: number): number {
  return clamp(t);
}

export function easeOutQuad(t: number): number {
  const p = clamp(t);
  return 1 - (1 - p) * (1 - p);
}

export function easeInOutQuad(t: number): number {
  const p = clamp(t);
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  const p = clamp(t);
  return 1 - Math.pow(1 - p, 3);
}

export function easeInOutCubic(t: number): number {
  const p = clamp(t);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function easeOutExpo(t: number): number {
  const p = clamp(t);
  return p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
}

export function easeOutBack(t: number): number {
  const p = clamp(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

export function smoothstep(t: number): number {
  const p = clamp(t);
  return p * p * (3 - 2 * p);
}

