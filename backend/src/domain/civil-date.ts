export function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// Rejeita datas que casam com o formato mas nao existem, como 2026-09-31, que o Date
// normalizaria silenciosamente para o mes seguinte.
export function isExistingCivilDate(value: string): boolean {
  const date = toUtcDate(value);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function formatCivilDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
