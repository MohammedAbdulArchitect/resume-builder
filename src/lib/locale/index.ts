import type { Locale, PageSize } from "@/lib/schema/resume";

/**
 * India + international locale profiles (PRODUCT_SPEC_FINAL.md §11).
 * Never hardcode a date format, page size, or address field anywhere
 * else — read it from here (CLAUDE_FINAL.md §8).
 *
 * Scope note: page size is a real, enforced difference used directly in
 * PDF/DOCX page setup. Address/phone "format" is scoped to placeholder
 * text in the review form's inputs, not a transform applied to already
 * -parsed free-text values — reformatting arbitrary parsed phone numbers
 * into strict E.164 would need a real phone-parsing library for a
 * cosmetic gain nothing currently tests for.
 */
export interface LocaleProfile {
  pageSize: PageSize;
  photoDefault: boolean;
  locationPlaceholder: string;
  phonePlaceholder: string;
}

export const LOCALE_PROFILES: Record<Locale, LocaleProfile> = {
  in: {
    pageSize: "A4",
    photoDefault: false,
    locationPlaceholder: "City, State",
    phonePlaceholder: "+91 98765 43210",
  },
  intl: {
    pageSize: "Letter",
    photoDefault: false,
    locationPlaceholder: "City, Country",
    phonePlaceholder: "+1 555 123 4567",
  },
};

export function getLocaleProfile(locale: Locale): LocaleProfile {
  return LOCALE_PROFILES[locale];
}
