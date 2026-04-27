const nearbyQuery = (latitude, longitude, radiusMeters) => ({
    condition: `ST_DWithin(
        location::geography, ST_MakePoint($1, $2)::geography, $3)`,
    params: [longitude, latitude, radiusMeters],
});

const parsePoint = (geostr) => {
    if (!geostr) return null;
    const match = geostr.match(/POINT\(([^ ]+) ([^ )]+)\)/);
    if (!match) return null;
    return { longitude: parseFloat(match[1]), latitude: parseFloat(match[2]) };
};

const haversine = (a, b) => {
    const R = 6371000;
    const φ1 = a.latitude * Math.PI / 180;
    const φ2 = b.latitude * Math.PI / 180;
    const dφ = (b.latitude - a.latitude) * Math.PI / 180;
    const dλ = (b.longitude - a.longitude) * Math.PI / 180;
    const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

module.exports = { nearbyQuery, parsePoint, haversine };