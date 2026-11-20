// Adaptateur de routage pour l'Espace Notaire (Lady Ndiaye).
// Les composants Header/Dashboard/CertifierParcelle/Archive restent
// inchangés (ils fonctionnaient déjà par callbacks locaux) ; ce fichier se
// contente de les brancher sur de vraies routes React Router, pour qu'ils
// s'intègrent au reste de l'application fusionnée (Cadastre, Promoteur,
// authentification) sans toucher à leur logique interne.
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from './Header';
import Dashboard from './Dashboard';
import CertifierParcelle from './CertifierParcelle';
import Archive from './Archive';
import './notaire.css';

function HeaderRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const actif = location.pathname.startsWith('/notaire/archive') ? 'archive' : 'dossiers';
    return (
        <Header
            actif={actif}
            onDashboard={() => navigate('/notaire')}
            onArchive={() => navigate('/notaire/archive')}
            onLogout={() => {
                localStorage.clear();
                navigate('/login');
            }}
        />
    );
}

function DashboardRoute() {
    const navigate = useNavigate();
    return (
        <Dashboard
            onOpenParcelle={(parcelId, reference) => navigate(`/notaire/certifier/${parcelId}`, { state: { reference } })}
            onViewHistory={(parcelId, reference) => navigate(`/notaire/archive/${parcelId}`, { state: { reference } })}
        />
    );
}

function CertifierRoute() {
    const { id } = useParams();
    const navigate = useNavigate();
    if (!id) return null;
    return (
        <CertifierParcelle
            parcelId={id}
            onBack={() => navigate('/notaire')}
            onCertified={() => navigate('/notaire')}
            onViewHistory={(parcelId) => navigate(`/notaire/archive/${parcelId}`)}
        />
    );
}

function ArchiveRoute() {
    const { id } = useParams();
    const navigate = useNavigate();
    return <Archive parcelId={id} onBack={() => navigate('/notaire')} />;
}

export default function NotaireApp() {
    return (
        <div className="app-shell">
            <HeaderRoute />
            <Routes>
                <Route index element={<DashboardRoute />} />
                <Route path="certifier/:id" element={<CertifierRoute />} />
                <Route path="archive" element={<ArchiveRoute />} />
                <Route path="archive/:id" element={<ArchiveRoute />} />
            </Routes>
        </div>
    );
}
