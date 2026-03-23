export const catmullRomPoint = (pts, t) => {
  if (!pts || pts.length < 2) return pts?.[0] || { lat: 0, lng: 0 };
  const n = pts.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt = t * n - seg;
  const p0 = pts[Math.max(seg - 1, 0)];
  const p1 = pts[seg];
  const p2 = pts[Math.min(seg + 1, n)];
  const p3 = pts[Math.min(seg + 2, n)];
  const t2 = lt * lt, t3 = t2 * lt;
  return {
    lat: 0.5 * ((2*p1.lat) + (-p0.lat+p2.lat)*lt + (2*p0.lat-5*p1.lat+4*p2.lat-p3.lat)*t2 + (-p0.lat+3*p1.lat-3*p2.lat+p3.lat)*t3),
    lng: 0.5 * ((2*p1.lng) + (-p0.lng+p2.lng)*lt + (2*p0.lng-5*p1.lng+4*p2.lng-p3.lng)*t2 + (-p0.lng+3*p1.lng-3*p2.lng+p3.lng)*t3),
  };
};

export class GPSSmoother {
  constructor(alpha = 0.15) {
    this.alpha = alpha;
    this.lat = null;
    this.lng = null;
  }
  update(rawLat, rawLng) {
    if (this.lat === null) { this.lat = rawLat; this.lng = rawLng; return { lat: rawLat, lng: rawLng }; }
    this.lat = this.lat + this.alpha * (rawLat - this.lat);
    this.lng = this.lng + this.alpha * (rawLng - this.lng);
    return { lat: this.lat, lng: this.lng };
  }
}

export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export const findProgressOnTrack = (userLat, userLng, stations) => {
  let minDist = Infinity;
  let bestIdx = 0;
  stations.forEach((st, i) => {
    if (!st.latitude || !st.longitude) return;
    const d = haversineKm(userLat, userLng, st.latitude, st.longitude);
    if (d < minDist) { minDist = d; bestIdx = i; }
  });
  return bestIdx / Math.max(stations.length - 1, 1);
};

export class SpeedCalculator {
  constructor() { this.history = []; this.smoothedSpeed = 0; }
  update(lat, lng, timestamp) {
    this.history.push({ lat, lng, t: timestamp });
    if (this.history.length > 5) this.history.shift();
    if (this.history.length < 2) return 0;
    const first = this.history[0], last = this.history[this.history.length - 1];
    const dist = haversineKm(first.lat, first.lng, last.lat, last.lng);
    const hours = (last.t - first.t) / 3600000;
    const rawSpeed = hours > 0 ? dist / hours : 0;
    this.smoothedSpeed = this.smoothedSpeed * 0.7 + rawSpeed * 0.3;
    return Math.min(Math.round(this.smoothedSpeed), 250);
  }
}