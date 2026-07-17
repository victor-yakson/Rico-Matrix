export const RICO_QUANT_ENGINE_LAUNCH_AT = Date.UTC(2026, 6, 17, 16, 0, 0);

export function isRicoQuantEngineLive(now = Date.now()) {
  return now >= RICO_QUANT_ENGINE_LAUNCH_AT;
}
