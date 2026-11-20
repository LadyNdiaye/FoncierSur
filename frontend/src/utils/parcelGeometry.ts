export type ParcelPoint = [latitude: number, longitude: number];

export function parseParcelCoordinates(input: unknown): ParcelPoint[] | null {
  let parsed = input;
  let longitudeFirst = false;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }

  if (typeof parsed === 'object' && parsed !== null && 'type' in parsed && 'coordinates' in parsed) {
    const geoJson = parsed as { type?: unknown; coordinates?: unknown };
    if (geoJson.type !== 'Polygon' || !Array.isArray(geoJson.coordinates)) return null;

    parsed = geoJson.coordinates[0];
    longitudeFirst = true;
  }

  if (!Array.isArray(parsed)) return null;

  const points: ParcelPoint[] = [];
  for (const point of parsed) {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      typeof point[0] !== 'number' ||
      typeof point[1] !== 'number' ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    ) {
      return null;
    }

    points.push(longitudeFirst ? [point[1], point[0]] : [point[0], point[1]]);
  }

  return points.length >= 3 ? points : null;
}

export function getParcelMapPoints(points: ParcelPoint[]): string | null {
  if (points.length < 3) return null;

  const latitudes = points.map(([latitude]) => latitude);
  const longitudes = points.map(([, longitude]) => longitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.000001);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.000001);

  return points
    .map(([latitude, longitude]) => {
      const x = 70 + ((longitude - minLongitude) / longitudeRange) * 500;
      const y = 40 + (1 - (latitude - minLatitude) / latitudeRange) * 280;
      return `${x},${y}`;
    })
    .join(' ');
}

export function calculateParcelAreaSquareMeters(input: unknown): number | null {
  const points = parseParcelCoordinates(input);
  if (!points) return null;

  const earthRadiusMeters = 6_378_137;
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const [latitude1, longitude1] = points[index];
    const [latitude2, longitude2] = points[(index + 1) % points.length];
    const latitude1Radians = (latitude1 * Math.PI) / 180;
    const latitude2Radians = (latitude2 * Math.PI) / 180;
    const longitudeDifferenceRadians = ((longitude2 - longitude1) * Math.PI) / 180;

    area += longitudeDifferenceRadians * (2 + Math.sin(latitude1Radians) + Math.sin(latitude2Radians));
  }

  const areaSquareMeters = Math.abs((area * earthRadiusMeters * earthRadiusMeters) / 2);
  return areaSquareMeters > 0 && Number.isFinite(areaSquareMeters) ? areaSquareMeters : null;
}
