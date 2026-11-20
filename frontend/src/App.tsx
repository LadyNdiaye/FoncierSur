// App.tsx fusionné (backend/frontend monolithe FoncierSûr).
// Routage global : authentification (Carla), Cadastre (Carla), Notaire
// (Lady, via NotaireApp), Promoteur (Mame Ndiaya), preuve blockchain
// publique (Carla).
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Espace Cadastre (Carla Diatta)
import CadastreDashboard from './pages/Cadastre/Dashboard';
import ValiderParcelle from './pages/Cadastre/ValiderParcelle';
import CadastreHistorique from './pages/Cadastre/Historique';

// Espace Promoteur (Mame Ndiaya Gaye)
import PromoteurDashboard from './pages/Promoteur/Dashboard';
import CreateParcelle from './pages/Promoteur/CreateParcelle';
import ParcelleDetail from './pages/Promoteur/ParcelleDetail';

// Espace Notaire (Lady Ndiaye)
import NotaireApp from './pages/Notaire/NotaireApp';

// Public / Blockchain
import BlockchainProof from './pages/BlockchainProof';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentification & Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/blockchain-proof" element={<BlockchainProof />} />

        {/* Espace Cadastre */}
        <Route path="/cadastre" element={<CadastreDashboard />} />
        <Route path="/cadastre/valider/:id" element={<ValiderParcelle />} />
        <Route path="/cadastre/historique" element={<CadastreHistorique />} />

        {/* Espace Promoteur */}
        <Route path="/promoteur" element={<PromoteurDashboard />} />
        <Route path="/promoteur/parcelles/nouvelle" element={<CreateParcelle />} />
        <Route path="/promoteur/parcelles/:id" element={<ParcelleDetail />} />

        {/* Espace Notaire (sous-routes gérées par NotaireApp) */}
        <Route path="/notaire/*" element={<NotaireApp />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
