interface HeaderProps {
    actif?: 'dossiers' | 'archive';
    onDashboard: () => void;
    onArchive: () => void;
    onLogout: () => void;
}

/** En-tête commun de l'Espace Notaire (maquette : bande prune, badge de rôle, navigation) */
export default function Header({ actif, onDashboard, onArchive, onLogout }: HeaderProps) {
    const lien = (cle: 'dossiers' | 'archive', texte: string, action: () => void) => (
        <button type="button" className={`nt-link ${actif === cle ? 'is-active' : ''}`} onClick={action}>
            {texte}
        </button>
    );
    return (
        <header className="nt-header">
            <div className="nt-brand">
                <span className="nt-logo">FoncierSûr</span>
                <span className="nt-role">Espace Notaire</span>
            </div>
            <nav className="nt-nav">
                {lien('dossiers', 'Dossiers à certifier', onDashboard)}
                {lien('archive', 'Preuve blockchain', onArchive)}
                <button type="button" className="nt-link" onClick={onLogout}>Déconnexion</button>
            </nav>
        </header>
    );
}
