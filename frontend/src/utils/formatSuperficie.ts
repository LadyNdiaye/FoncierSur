export function formatSuperficie(value: number | string | null | undefined): string {
  if (value == null || value === '') return 'Non renseignée';

  const superficie = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(superficie)
    ? `${superficie.toLocaleString('fr-FR')} m²`
    : 'Non renseignée';
}
