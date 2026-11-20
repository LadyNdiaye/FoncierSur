import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ParcelleMap, { type GeoPolygon } from "../../components/maps/ParcelleMap";
import axiosClient from "../../api/axiosClient";

interface ParcelleDetailData {
  id: string;
  reference: string;
  nicad?: string;
  statut: string;
  superficie: number;
  localisation: string;
  polygon: GeoPolygon;
  motifRejet?: string;
}

const LABEL_STATUT: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMISE: "Soumise au Cadastre",
  VALIDE_CADASTRE: "Validée (Cadastre) — en attente du Notaire",
  REJETE_CADASTRE: "Rejetée par le Cadastre",
  CERTIFIEE: "Certifiée (Notaire)",
  REJETE_NOTAIRE: "Rejetée par le Notaire",
};

export default function ParcelleDetail() {
  const { id } = useParams();
  const [parcelle, setParcelle] = useState<ParcelleDetailData | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    axiosClient
      .get(`/parcelles/${id}`)
      .then((res) => setParcelle(res.data))
      .finally(() => setChargement(false));
  }, [id]);

  if (chargement) return <p className="p-6">Chargement...</p>;
  if (!parcelle) return <p className="p-6">Parcelle introuvable.</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">{parcelle.reference}</h1>
      <p className="text-gray-600 mb-4">
        {parcelle.localisation} — {Number(parcelle.superficie)?.toFixed(0)} m² —{" "}
        <span className="font-medium">{LABEL_STATUT[parcelle.statut] ?? parcelle.statut}</span>
      </p>

      {(parcelle.statut === "REJETE_CADASTRE" || parcelle.statut === "REJETE_NOTAIRE") && parcelle.motifRejet && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Motif du rejet : {parcelle.motifRejet}
        </p>
      )}

      <ParcelleMap mode="lecture-seule" geometrie={parcelle.polygon} />
    </div>
  );
}
