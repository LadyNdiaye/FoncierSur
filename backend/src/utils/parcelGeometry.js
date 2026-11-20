const EARTH_RADIUS_METERS = 6_378_137;

function geometryError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseParcelGeometry(input) {
  let polygon = input;
  if (typeof polygon === 'string') {
    try {
      polygon = JSON.parse(polygon);
    } catch {
      throw geometryError('Le polygone doit être un tableau de coordonnées ou un GeoJSON valide.');
    }
  }

  let positions = polygon;
  let longitudeFirst = false;
  if (polygon && typeof polygon === 'object' && !Array.isArray(polygon)) {
    if (polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates) || polygon.coordinates.length !== 1) {
      throw geometryError('Seuls les polygones GeoJSON simples sont acceptés.');
    }
    positions = polygon.coordinates[0];
    longitudeFirst = true;
  }

  if (!Array.isArray(positions)) {
    throw geometryError('Le polygone doit contenir au moins trois points GPS.');
  }

  const points = positions.map((position) => {
    if (
      !Array.isArray(position) ||
      position.length < 2 ||
      typeof position[0] !== 'number' ||
      typeof position[1] !== 'number' ||
      !Number.isFinite(position[0]) ||
      !Number.isFinite(position[1])
    ) {
      throw geometryError('Chaque point GPS doit contenir une latitude et une longitude valides.');
    }

    const latitude = longitudeFirst ? position[1] : position[0];
    const longitude = longitudeFirst ? position[0] : position[1];
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw geometryError('Les coordonnées GPS sont hors limites.');
    }
    return [latitude, longitude];
  });

  const vertices = points.slice();
  if (
    vertices.length > 1 &&
    vertices[0][0] === vertices[vertices.length - 1][0] &&
    vertices[0][1] === vertices[vertices.length - 1][1]
  ) {
    vertices.pop();
  }

  const distinctVertices = new Set(vertices.map(([latitude, longitude]) => `${latitude},${longitude}`));
  if (distinctVertices.size < 3) {
    throw geometryError('Le polygone doit contenir au moins trois points distincts.');
  }

  let area = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const [latitude1, longitude1] = vertices[index];
    const [latitude2, longitude2] = vertices[(index + 1) % vertices.length];
    const latitude1Radians = (latitude1 * Math.PI) / 180;
    const latitude2Radians = (latitude2 * Math.PI) / 180;
    const longitudeDifferenceRadians = ((longitude2 - longitude1) * Math.PI) / 180;

    area += longitudeDifferenceRadians * (2 + Math.sin(latitude1Radians) + Math.sin(latitude2Radians));
  }

  const areaSquareMeters = Math.abs((area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
  if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) {
    throw geometryError('La superficie du polygone doit être supérieure à zéro.');
  }

  return { polygon, points, areaSquareMeters };
}

module.exports = { parseParcelGeometry };
