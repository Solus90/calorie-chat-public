import { todayInAppTz } from "./timezone";

export type UnitSystem = "imperial" | "metric";

const KG_PER_LB = 0.45359237;

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

/** Convert a stored kg value into the user's display unit. */
export function kgToDisplay(kg: number, system: UnitSystem): number {
  return system === "imperial" ? kgToLb(kg) : kg;
}

/** Convert a user-entered display value into canonical kg for storage. */
export function displayToKg(value: number, system: UnitSystem): number {
  return system === "imperial" ? lbToKg(value) : value;
}

export function weightUnitLabel(system: UnitSystem): string {
  return system === "imperial" ? "lbs" : "kg";
}

/** Round a display weight to one decimal place. */
export function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

/** YYYY-MM-DD for today in the app timezone (America/New_York). */
export function todayLocal(): string {
  return todayInAppTz();
}
