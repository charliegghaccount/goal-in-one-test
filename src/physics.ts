export const physicsRanges = {
  groundFriction: [0.0005, 0.04, 0.0005],
  restitution: [0.3, 0.9, 0.01],
  airResistance: [0.0003, 0.008, 0.0001],
  spinDamping: [0.01, 0.3, 0.01],
  maxAngularVelocity: [0.08, 0.8, 0.01],
  kickStrength: [0.08, 0.16, 0.005],
  momentumRetention: [0.1, 0.9, 0.05],
  boostAcceleration: [0.08, 0.8, 0.02],
  springStrength: [0.6, 1.5, 0.05],
  windStrength: [0.4, 1.6, 0.05],
} as const;
export type PhysicsConfig = Record<keyof typeof physicsRanges, number>;
export const defaultPhysics: PhysicsConfig = {
  groundFriction: 0.003,
  restitution: 0.76,
  airResistance: 0.0015,
  spinDamping: 0.08,
  maxAngularVelocity: 0.35,
  kickStrength: 0.125,
  momentumRetention: 0.55,
  boostAcceleration: 0.32,
  springStrength: 1,
  windStrength: 1,
};
export function sanitizePhysics(raw: unknown): PhysicsConfig {
  const c = { ...defaultPhysics };
  if (raw && typeof raw === 'object')
    for (const k of Object.keys(c) as (keyof PhysicsConfig)[]) {
      const n = (raw as Record<string, unknown>)[k];
      if (typeof n === 'number' && Number.isFinite(n))
        c[k] = Math.min(physicsRanges[k][1], Math.max(physicsRanges[k][0], n));
    }
  return c;
}
const KEY = 'goal-in-one:physics:v1';
export function loadPhysics(): PhysicsConfig {
  try {
    return sanitizePhysics(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch {
    return { ...defaultPhysics };
  }
}
export function savePhysics(c: PhysicsConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sanitizePhysics(c)));
    return true;
  } catch {
    return false;
  }
}
