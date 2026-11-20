import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient"; // composant partagé de Carla

interface Parcelle {
  id: string;
  reference: string;
  statut: string;
  superficie: number;
  localisation: string;
}

const LABEL_STATUT: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMISE: "Soumise au Cadastre",
  VALIDE_CADASTRE: "Validée (Cadastre)",
  REJETE_CADASTRE: "Rejetée (Cadastre)",
  CERTIFIEE: "Certifiée (Notaire)",
  REJETE_NOTAIRE: "Rejetée (Notaire)",
};

export default function Dashboard() {
  const [parcelles, setParcelles] = useState<Parcelle[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    axiosClient
      .get("/parcelles")
      .then((res) => setParcelles(res.data))
      .catch((err) => setErreur(err.response?.data?.error ?? err.message))
      .finally(() => setChargement(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Mes parcelles</h1>
        <Link
          to="/promoteur/parcelles/nouvelle"
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          + Nouvelle parcelle
        </Link>
      </div>

      {chargement && <p>Chargement...</p>}
      {erreur && <p className="text-red-600">{erreur}</p>}

      {!chargement && parcelles.length === 0 && (
        <p className="text-gray-500">Aucune parcelle pour le moment.</p>
      )}

      <div className="grid gap-4">
        {parcelles.map((p) => (
          <Link
            key={p.id}
            to={`/promoteur/parcelles/${p.id}`}
            className="border rounded p-4 hover:bg-gray-50"
          >
            <div className="flex justify-between">
              <span className="font-medium">{p.reference}</span>
              <span className="text-sm text-gray-500">
                {LABEL_STATUT[p.statut] ?? p.statut}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {p.localisation} — {Number(p.superficie)?.toFixed(0)} m²
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
