import countries from "world-countries";

export interface CountryOption {
  code: string; // ISO 3166-1 alpha-2 (uppercase)
  name: string;
  flag: string; // emoji fallback
}

export const ALL_COUNTRIES: CountryOption[] = countries
  .map((c) => ({
    code: c.cca2,
    name: c.name.common,
    flag: c.flag,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getCountryByCode(code: string | null | undefined): CountryOption | null {
  if (!code) return null;
  return ALL_COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? null;
}
