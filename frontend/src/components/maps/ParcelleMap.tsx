import { useState, useCallback } from "react";
import { MapContainer, TileLayer, Polygon, FeatureGroup } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

/**
 * ParcelleMap — COMPOSANT PARTAGÉ (voir docs/repartition-equipe.md, section 3)
 *
 * Propriétaire : Mame Ndiaye Gaye (Géospatial / Promoteur)
 * Consommé par : Cadastre (Carla) en mode "lecture-seule"
 *
 * Une fois stabilisé et annoncé au groupe, ce fichier est GELÉ :
 * toute modification passe par une Pull Request revue par la
 * propriétaire, jamais par un commit direct.
 */

export type GeoPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

interface ParcelleMapProps {
  /** "dessin" : le promoteur trace une nouvelle parcelle.
   *  "lecture-seule" : affichage simple, pas d'édition (utilisé par Cadastre). */
  mode: "dessin" | "lecture-seule";
  /** Géométrie existante à afficher (édition ou lecture seule) */
  geometrie?: GeoPolygon | null;
  /** Callback appelé quand l'utilisateur termine un dessin en mode "dessin" */
  onGeometrieChange?: (geometrie: GeoPolygon) => void;
  /** Centre initial de la carte [lat, lng] */
  centre?: [number, number];
  hauteur?: string;
}

const CENTRE_PAR_DEFAUT: [number, number] = [14.6928, -17.4467]; // Dakar

export default function ParcelleMap({
  mode,
  geometrie = null,
  onGeometrieChange,
  centre = CENTRE_PAR_DEFAUT,
  hauteur = "500px",
}: ParcelleMapProps) {
  const [geometrieActuelle, setGeometrieActuelle] = useState<GeoPolygon | null>(
    geometrie
  );

  const handleCreated = useCallback(
    (e: any) => {
      const layer = e.layer;
      const geojson = layer.toGeoJSON().geometry as GeoPolygon;
      setGeometrieActuelle(geojson);
      onGeometrieChange?.(geojson);
    },
    [onGeometrieChange]
  );

  const handleEdited = useCallback(
    (e: any) => {
      e.layers.eachLayer((layer: any) => {
        const geojson = layer.toGeoJSON().geometry as GeoPolygon;
        setGeometrieActuelle(geojson);
        onGeometrieChange?.(geojson);
      });
    },
    [onGeometrieChange]
  );

  // Conversion GeoJSON [lng, lat] -> Leaflet [lat, lng]
  const positionsLeaflet =
    geometrieActuelle?.coordinates?.[0]?.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    ) ?? [];

  return (
    <div style={{ height: hauteur, width: "100%" }}>
      <MapContainer
        center={centre}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mode === "dessin" ? (
          <FeatureGroup>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              onEdited={handleEdited}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: true,
              }}
            />
            {positionsLeaflet.length > 0 && (
              <Polygon positions={positionsLeaflet} />
            )}
          </FeatureGroup>
        ) : (
          positionsLeaflet.length > 0 && (
            <Polygon
              positions={positionsLeaflet}
              pathOptions={{ color: "#2563eb", fillOpacity: 0.2 }}
            />
          )
        )}
      </MapContainer>
    </div>
  );
}
