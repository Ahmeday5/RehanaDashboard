/**
 * Normalises an optional text input for an API payload: trims it and turns
 * an empty/blank value into `undefined`, so the key is omitted from the
 * request entirely (JSON and multipart alike) instead of being sent as "".
 */
export function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
