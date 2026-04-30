const EARTH_RADIUS_M = 6371000;

/** Haversine distance in metres between two points */
const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLon  = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Filter a list of rows by proximity.
 * Each row must have numeric `lat` and `lon` fields.
 * Returns rows with an added `distance_m` field, sorted nearest first.
 */
const filterByRadius = (rows, centerLat, centerLon, radiusMeters) => {
  return rows
    .map((row) => ({
      ...row,
      distance_m: haversine(centerLat, centerLon, parseFloat(row.lat), parseFloat(row.lon)),
    }))
    .filter((row) => row.distance_m <= radiusMeters)
    .sort((a, b) => a.distance_m - b.distance_m);
};

/**
 * Build a bounding box for a rough SQL pre-filter before Haversine.
 * Reduces the number of rows we need to process in JS.
 * Returns { minLat, maxLat, minLon, maxLon }
 */
const boundingBox = (lat, lon, radiusMeters) => {
  const latDelta = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const lonDelta = latDelta / Math.cos((lat * Math.PI) / 180);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
};

module.exports = { haversine, filterByRadius, boundingBox };