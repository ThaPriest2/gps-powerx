// DEMO / TEST DATA ONLY.
// The postcodes below are FICTIONAL test codes used for demonstration. They are NOT
// issued by NIPOST and must never be presented as live government data.
// Locations are real Nigerian areas so the map looks realistic.

const DAY = 86400000;
const isoOffset = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

export const DEMO_POSTCODES = [
  { postcode: 'LG1-7VK-4A2', address: 'Adetokunbo Ademola Street, Victoria Island', area: 'Victoria Island', state: 'Lagos', lga: 'Eti-Osa', lat: 6.4281, lng: 3.4219 },
  { postcode: 'LG2-3LK-9B7', address: 'Admiralty Way, Lekki Phase 1', area: 'Lekki Phase 1', state: 'Lagos', lga: 'Eti-Osa', lat: 6.4474, lng: 3.4723 },
  { postcode: 'LG3-5IK-1C8', address: 'Allen Avenue, Ikeja', area: 'Ikeja', state: 'Lagos', lga: 'Ikeja', lat: 6.6018, lng: 3.3515 },
  { postcode: 'LG4-2SR-6D3', address: 'Adeniran Ogunsanya Street, Surulere', area: 'Surulere', state: 'Lagos', lga: 'Surulere', lat: 6.5, lng: 3.35 },
  { postcode: 'FC1-8WS-3E5', address: 'Aminu Kano Crescent, Wuse II', area: 'Wuse II', state: 'FCT', lga: 'Abuja Municipal Area Council', lat: 9.0765, lng: 7.4698 },
  { postcode: 'FC2-4GK-7F1', address: 'Gimbiya Street, Area 11, Garki', area: 'Garki', state: 'FCT', lga: 'Abuja Municipal Area Council', lat: 9.03, lng: 7.49 },
  { postcode: 'RV1-6PH-2G9', address: 'Aba Road, GRA Phase 2, Port Harcourt', area: 'GRA Phase 2', state: 'Rivers', lga: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { postcode: 'KN1-9KN-5H4', address: 'Bompai Road, Nassarawa', area: 'Bompai', state: 'Kano', lga: 'Nassarawa', lat: 12.0022, lng: 8.592 },
  { postcode: 'OY1-3BD-8J6', address: 'Bodija Market Road, Bodija, Ibadan', area: 'Bodija', state: 'Oyo', lga: 'Ibadan North', lat: 7.429, lng: 3.91 },
  // Not pre-registered: used for the guided Pitch Demo scenario and for live lookups of new buildings.
  { postcode: 'LG5-7TQ-2M9', address: 'Chevron Drive, Lekki', area: 'Lekki', state: 'Lagos', lga: 'Eti-Osa', lat: 6.44, lng: 3.53 },
  { postcode: 'LG6-1IK-4N7', address: 'Awolowo Road, Ikoyi', area: 'Ikoyi', state: 'Lagos', lga: 'Eti-Osa', lat: 6.45, lng: 3.433 },
  { postcode: 'KD1-5KD-9P2', address: 'Ahmadu Bello Way, Kaduna', area: 'Kaduna North', state: 'Kaduna', lga: 'Kaduna North', lat: 10.5105, lng: 7.4165 },
  { postcode: 'EN1-2EN-6Q8', address: 'Ogui Road, Enugu', area: 'Ogui', state: 'Enugu', lga: 'Enugu North', lat: 6.4584, lng: 7.5464 },
];

export const DEMO_SCENARIO = {
  postcode: 'LG5-7TQ-2M9',
  asset: {
    id: 'PX-AST-2001',
    type: 'Hybrid System',
    solarKw: 10,
    inverterKw: 12,
    batteryKwh: 20,
    installer: 'SunVolt Nigeria',
    installDaysAgo: 5,
    status: 'Online',
  },
  technicianId: 'TEC-01',
  problem:
    'Solar output ~50% below expected for current irradiance (performance anomaly detected by GPS PowerX). Inspect panels, string connectors and shading.',
};

export function buildSeed() {
  const buildings = DEMO_POSTCODES.slice(0, 9).map((p, i) => ({
    id: `PX-BLD-${1001 + i}`,
    postcode: p.postcode,
    address: p.address,
    area: p.area,
    state: p.state,
    lga: p.lga,
    lat: p.lat,
    lng: p.lng,
    source: 'demo',
    registeredAt: new Date(Date.now() - (300 - i * 20) * DAY).toISOString(),
  }));

  const a = (n, b, type, solarKw, inverterKw, batteryKwh, installAgo, lastAgo, nextIn, installer, anomaly = null) => ({
    id: `PX-AST-${n}`,
    buildingId: `PX-BLD-${1000 + b}`,
    type,
    solarKw,
    inverterKw,
    batteryKwh,
    installDate: isoOffset(-installAgo),
    installer,
    status: anomaly?.code === 'offline' ? 'Offline' : 'Online',
    lastService: isoOffset(-lastAgo),
    nextService: isoOffset(nextIn),
    anomaly,
  });

  const assets = [
    a(1001, 1, 'Hybrid System', 12, 15, 30, 420, 140, 40, 'SunVolt Nigeria'),
    a(1002, 2, 'Solar', 20, 0, 0, 300, 100, 80, 'Lagos Solar Works'),
    a(1003, 3, 'Battery', 0, 0, 20, 200, 60, 120, 'VoltGrid Services'),
    a(1004, 4, 'Hybrid System', 6, 8, 10, 520, 330, -30, 'SunVolt Nigeria', { code: 'underperformance', onsetHour: 6 }),
    a(1005, 5, 'Hybrid System', 25, 30, 60, 250, 80, 100, 'Abuja PowerTech'),
    a(1006, 6, 'Solar', 8, 0, 0, 380, 200, -15, 'Abuja PowerTech', { code: 'offline', onsetHour: 6 }),
    a(1007, 7, 'Hybrid System', 10, 12, 20, 150, 90, 90, 'Delta Energy Systems', { code: 'thermal', onsetHour: 6 }),
    a(1008, 8, 'Solar', 30, 0, 0, 310, 170, 10, 'Arewa Solar'),
    a(1009, 9, 'Inverter', 0, 10, 0, 90, 45, 135, 'Ibadan Inverters Ltd'),
  ];

  const technicians = [
    { id: 'TEC-01', name: 'Tunde Adeyemi', state: 'Lagos', phone: '+234 800 000 0001', skill: 'Solar & hybrid systems' },
    { id: 'TEC-02', name: 'Amina Bello', state: 'FCT', phone: '+234 800 000 0002', skill: 'Inverters & batteries' },
    { id: 'TEC-03', name: 'Chidi Okafor', state: 'Rivers', phone: '+234 800 000 0003', skill: 'Battery storage' },
    { id: 'TEC-04', name: 'Ibrahim Sani', state: 'Kano', phone: '+234 800 000 0004', skill: 'Large solar arrays' },
  ];

  const b4 = buildings[3];
  const b1 = buildings[0];
  const requests = [
    {
      id: 'SR-1001',
      assetId: 'PX-AST-1004',
      buildingId: b4.id,
      postcode: b4.postcode,
      location: `${b4.address}, ${b4.lga}, ${b4.state}`,
      problem: 'Panel output well below expected; suspected soiling or shading.',
      priority: 'High',
      status: 'Assigned',
      technicianId: 'TEC-01',
      createdAt: new Date(Date.now() - 2 * DAY).toISOString(),
    },
    {
      id: 'SR-1000',
      assetId: 'PX-AST-1001',
      buildingId: b1.id,
      postcode: b1.postcode,
      location: `${b1.address}, ${b1.lga}, ${b1.state}`,
      problem: 'Routine 6-month inspection.',
      priority: 'Low',
      status: 'Resolved',
      technicianId: 'TEC-01',
      createdAt: new Date(Date.now() - 141 * DAY).toISOString(),
    },
  ];

  return { buildings, assets, technicians, requests };
}
