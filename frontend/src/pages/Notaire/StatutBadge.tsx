// Couleurs des statuts du cahier (texte, fond, point). Toujours accompagnées du libellé.
const STYLES: Record<string, [string, string, string]> = {
    BROUILLON: ['#57534E', '#F5F5F4', '#A8A29E'],
    SOUMISE: ['#92400E', '#FEF3C7', '#D97706'],
    VALIDE_CADASTRE: ['#1E40AF', '#DBEAFE', '#2563EB'],
    REJETE_CADASTRE: ['#991B1B', '#FEE2E2', '#DC2626'],
    CERTIFIEE: ['#166534', '#DCFCE7', '#16A34A'],
    REJETE_NOTAIRE: ['#9F1239', '#FFE4E6', '#E11D48'],
};

export default function StatutBadge({ statut }: { statut: string }) {
    const [texte, fond, point] = STYLES[statut] || STYLES.BROUILLON;
    return (
        <span className="nt-pill" style={{ color: texte, backgroundColor: fond }}>
            <span className="nt-pill-dot" style={{ backgroundColor: point }} />
            {statut}
        </span>
    );
}
