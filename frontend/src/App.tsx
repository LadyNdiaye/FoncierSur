import { useState } from 'react';
import Dashboard from './pages/Notaire/Dashboard';
import CertifierParcelle from './pages/Notaire/CertifierParcelle';
import Archive from './pages/Notaire/Archive';
import './pages/Notaire/notaire.css';

type Screen =
    | { name: 'dashboard' }
    | { name: 'certifier'; parcelId: string; reference: string }
    | { name: 'archive'; parcelId: string; reference: string };

function App() {
    const [stack, setStack] = useState<Screen[]>([{ name: 'dashboard' }]);
    const current = stack[stack.length - 1];

    function push(screen: Screen) {
        setStack((s) => [...s, screen]);
    }

    function back() {
        setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    }

    function resetToDashboard() {
        setStack([{ name: 'dashboard' }]);
    }

    return (
        <div className="app-shell">
            {current.name === 'dashboard' && (
                <Dashboard
                    onOpenParcelle={(parcelId, reference) => push({ name: 'certifier', parcelId, reference })}
                    onViewHistory={(parcelId, reference) => push({ name: 'archive', parcelId, reference })}
                />
            )}

            {current.name === 'certifier' && (
                <CertifierParcelle
                    parcelId={current.parcelId}
                    onBack={back}
                    onCertified={resetToDashboard}
                    onViewHistory={(parcelId, reference) => push({ name: 'archive', parcelId, reference })}
                />
            )}

            {current.name === 'archive' && (
                <Archive parcelId={current.parcelId} reference={current.reference} onBack={back} />
            )}
        </div>
    );
}

export default App;
