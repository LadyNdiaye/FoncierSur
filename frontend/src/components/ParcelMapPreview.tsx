import { useState } from 'react';
import { getParcelMapPoints, parseParcelCoordinates } from '../utils/parcelGeometry';

interface ParcelMapPreviewProps {
  coordinates: unknown;
  reference?: string;
  localisation?: string;
}

export default function ParcelMapPreview({ coordinates, reference, localisation }: ParcelMapPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const parsedCoordinates = parseParcelCoordinates(coordinates);
  const mapPoints = parsedCoordinates ? getParcelMapPoints(parsedCoordinates) : null;

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Carte de la parcelle</h3>
          <p className="mt-0.5 text-[11px] text-gray-500">Aperçu indicatif du tracé GPS</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          Aperçu
        </span>
      </div>

      <div className="relative bg-[#f2eee5]">
        <svg
          aria-label="Aperçu cartographique du contour de la parcelle"
          className="block h-auto w-full"
          role="img"
          viewBox="0 0 640 360"
        >
          <g transform={`translate(320 180) scale(${zoom}) translate(-320 -180)`}>
            <rect width="640" height="360" fill="#f3efe6" />
            <path d="M0 54H640M0 133H640M0 220H640M0 304H640M72 0V360M202 0V360M494 0V360M595 0V360" stroke="#ded8cc" strokeWidth="2" />
            <path d="M0 88H640M0 270H640M142 0V360M548 0V360" stroke="#fffdf8" strokeWidth="18" />
            <path d="M0 252C115 226 184 283 298 261S498 230 640 255" fill="none" stroke="#b8d7dc" strokeWidth="17" />
            <path d="M0 252C115 226 184 283 298 261S498 230 640 255" fill="none" stroke="#e8f1eb" strokeWidth="3" />
            <rect x="38" y="106" width="72" height="42" rx="3" fill="#e7e1d6" />
            <rect x="222" y="24" width="90" height="40" rx="3" fill="#e7e1d6" />
            <rect x="518" y="120" width="90" height="46" rx="3" fill="#e7e1d6" />
            <rect x="418" y="290" width="98" height="38" rx="3" fill="#e7e1d6" />
            {mapPoints && (
              <>
                <polygon points={mapPoints} fill="#b6532b" fillOpacity="0.22" stroke="#a64b27" strokeWidth="4" />
                {mapPoints.split(' ').map((point, index) => {
                  const [x, y] = point.split(',');
                  return <circle key={index} cx={x} cy={y} r="5" fill="#fffaf5" stroke="#a64b27" strokeWidth="3" />;
                })}
              </>
            )}
          </g>
        </svg>
        {!mapPoints && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 px-6 text-center text-xs text-gray-600">
            Renseignez les coordonnées GPS pour afficher le tracé.
          </div>
        )}
        <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded border border-gray-300 bg-white shadow-md">
          <button
            type="button"
            aria-label="Zoom avant sur la carte"
            onClick={() => setZoom((current) => Math.min(current + 0.25, 2.5))}
            disabled={zoom >= 2.5}
            className="flex h-9 w-9 items-center justify-center text-xl font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            +
          </button>
          <span className="h-px bg-gray-200" />
          <button
            type="button"
            aria-label="Zoom arrière sur la carte"
            onClick={() => setZoom((current) => Math.max(current - 0.25, 0.5))}
            disabled={zoom <= 0.5}
            className="flex h-9 w-9 items-center justify-center text-xl font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            −
          </button>
        </div>
        <div className="absolute bottom-3 left-3 rounded bg-white/90 px-2.5 py-1.5 text-[10px] font-medium text-gray-600 shadow-sm">
          {reference || 'Nouvelle parcelle'} · {localisation || 'Localisation à renseigner'}
        </div>
      </div>
    </section>
  );
}
