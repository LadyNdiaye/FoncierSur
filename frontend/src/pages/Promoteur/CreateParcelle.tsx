import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ParcelleMap, { type GeoPolygon } from "../../components/maps/ParcelleMap";
import axiosClient from "../../api/axiosClient";

const TYPES_ZONE = ["URBAIN", "AGRICOLE", "INDUSTRIEL"] as const;

export default function CreateParcelle() {
  const navigate = useNavigate();
  const [reference, setReference] = useState("");
  const [nicad, setNicad] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [type, setType] = useState<typeof TYPES_ZONE[number]>("URBAIN");
  const [superficieDeclaree, setSuperficieDeclaree] = useState("");
  const [geometrie, setGeometrie] = useState<GeoPolygon | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [alerte, setAlerte] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!geometrie) {
      setErreur("Trace le contour de la parcelle sur la carte avant de continuer.");
      return;
    }

    setEnvoiEnCours(true);
    try {
      const formData = new FormData();
      formData.append("reference", reference);
      formData.append("numeroIdentificationCadastrale", nicad);
      formData.append("localisation", localisation);
      formData.append("type", type);
      formData.append("polygon", JSON.stringify(geometrie));
      if (superficieDeclaree) formData.append("superficieSaisie", superficieDeclaree);
      if (fichier) formData.append("titrePlan", fichier);

      const res = await axiosClient.post("/parcelles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const ecart = res.data.ecartSuperficie;
      if (typeof ecart === "number" && ecart > 0.05) {
        setAlerte(
          `Attention : la superficie déclarée s'écarte de ${(ecart * 100).toFixed(1)}% de la superficie calculée par PostGIS (${Number(res.data.superficie).toFixed(0)} m²). La parcelle a quand même été soumise.`
        );
        setTimeout(() => navigate(`/promoteur/parcelles/${res.data.id}`), 3000);
      } else {
        navigate(`/promoteur/parcelles/${res.data.id}`);
      }
    } catch (err: any) {
      setErreur(
        err.response?.data?.error ?? "Erreur lors de la création de la parcelle"
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Déclarer une parcelle</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Référence</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Numéro d'identification cadastrale (NICAD)
          </label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={nicad}
            onChange={(e) => setNicad(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Localisation</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={localisation}
            onChange={(e) => setLocalisation(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type de zone</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={type}
            onChange={(e) => setType(e.target.value as typeof TYPES_ZONE[number])}
          >
            {TYPES_ZONE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Superficie déclarée (m²) — optionnel, comparée automatiquement au calcul PostGIS
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-3 py-2 w-full"
            value={superficieDeclaree}
            onChange={(e) => setSuperficieDeclaree(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Contour de la parcelle
          </label>
          <ParcelleMap mode="dessin" onGeometrieChange={setGeometrie} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Titre ou plan (PDF, JPG ou PNG, 10 Mo maximum)
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
            className="block w-full"
          />
        </div>

        {erreur && <p className="text-red-600 text-sm">{erreur}</p>}
        {alerte && <p className="text-amber-600 text-sm">{alerte}</p>}

        <button
          type="submit"
          disabled={envoiEnCours}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          {envoiEnCours ? "Envoi en cours..." : "Soumettre au Cadastre"}
        </button>
      </form>
    </div>
  );
}
