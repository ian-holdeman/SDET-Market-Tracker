/** Raw quoted-value input, shared by browser validation and the trusted endpoint. */
export const hasExcessAlertDecimals = (value: string) => /\.\d{3}/.test(value);

export function parseAlertTarget(value: unknown): number {
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) {
    throw Error('Enter a number without currency signs or abbreviations.');
  }
  if (hasExcessAlertDecimals(value)) throw Error('Use up to two decimal places.');
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > 1e15 || (number === 0 && /[1-9]/.test(value))) {
    throw Error('Target is outside the supported numeric range.');
  }
  return number;
}
