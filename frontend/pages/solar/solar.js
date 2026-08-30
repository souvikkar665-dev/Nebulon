/**
 * NEBULON SOLAR SYSTEM EXPLORER — PHOTOREALISTIC 3D PLANETARY ENGINE
 * NASA 2070 / JARVIS Cockpit Specification · $300,000 Ultra-Premium Deep Cosmos
 * Cursor-Active Parallax Stars, 3D Astronomical Constellations & Hypervelocity Meteor Showers.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. AUTHORITATIVE HIGH-RESOLUTION REAL NASA PLANETARY TEXTURES
  // --------------------------------------------------------------------------
  const REAL_TEXTURES = {
    sun: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/sunmap.jpg',
    mercury: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/mercurymap.jpg',
    mercuryBump: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/mercurybump.jpg',
    venus: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/venusmap.jpg',
    venusBump: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/venusbump.jpg',
    earth: 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    earthNormal: 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg',
    earthSpecular: 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg',
    earthClouds: 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png',
    moon: 'https://threejs.org/examples/textures/planets/moon_1024.jpg',
    mars: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/marsmap1k.jpg',
    marsBump: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/marsbump1k.jpg',
    jupiter: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/jupitermap.jpg',
    saturn: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/saturnmap.jpg',
    saturnRing: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/saturnringcolor.jpg',
    uranus: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/uranusmap.jpg',
    uranusRing: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/uranusringcolour.jpg',
    neptune: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/neptunemap.jpg',
    pluto: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/plutomap1k.jpg',
    plutoBump: 'https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/plutobump1k.jpg'
  };

  // --------------------------------------------------------------------------
  // 1A. LIVE PLANETARY DATA — NASA/JPL HORIZONS
  // --------------------------------------------------------------------------
  // The visual catalog above remains the offline fallback. This additive layer
  // refreshes physical/orbital fields from NASA/JPL Horizons when available.
  const LIVE_PLANET_DATA = {
    sun: { command: '10', source: 'NASA/JPL Horizons' },
    mercury: { command: '199', source: 'NASA/JPL Horizons' },
    venus: { command: '299', source: 'NASA/JPL Horizons' },
    earth: { command: '399', source: 'NASA/JPL Horizons' },
    mars: { command: '499', source: 'NASA/JPL Horizons' },
    jupiter: { command: '599', source: 'NASA/JPL Horizons' },
    saturn: { command: '699', source: 'NASA/JPL Horizons' },
    uranus: { command: '799', source: 'NASA/JPL Horizons' },
    neptune: { command: '899', source: 'NASA/JPL Horizons' },
    pluto: { command: '999', source: 'NASA/JPL Horizons' }
  };

  const JPL_MEAN_RADII_KM = {
    sun: 695700, mercury: 2439.4, venus: 6051.8, earth: 6371.0084,
    mars: 3389.5, jupiter: 69911, saturn: 58232, uranus: 25362,
    neptune: 24622, pluto: 1188.3
  };

  const LIVE_DATA_ENDPOINTS = {
    horizons: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    physicalParameters: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
    nasaPlanets: 'https://science.nasa.gov/solar-system/planets/',
    esaMercury: 'https://www.esa.int/Science_Exploration/Space_Science/BepiColombo',
    jaxaVenus: 'https://www.isas.jaxa.jp/en/missions/spacecraft/current/akatsuki.html'
  };

  function parseHorizonsNumber(record, label) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = record.match(new RegExp('(?:^|\\n)\\s*' + escapedLabel + '\\s*=\\s*([+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[Ee][+-]?\\d+)?)', 'm'));
    return match ? Number(match[1]) : null;
  }

  function formatLiveValue(value, suffix, decimals = 3) {
    return Number.isFinite(value) ? `${value.toFixed(decimals)}${suffix}` : null;
  }

  async function fetchLivePlanetData(bodyId, config) {
    const params = new URLSearchParams({
      format: 'json',
      COMMAND: `'${config.command}'`,
      OBJ_DATA: 'NO',
      MAKE_EPHEM: 'YES',
      EPHEM_TYPE: 'ELEMENTS',
      CENTER: "'500@0'",
      TLIST: `'${new Date().toISOString().slice(0, 10)}'`,
      OUT_UNITS: "'AU-D'",
      REF_PLANE: "'ECLIPTIC'"
    });

    const response = await fetch(`${LIVE_DATA_ENDPOINTS.horizons}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);

    const payload = await response.json();
    const record = payload && typeof payload.result === 'string' ? payload.result : '';
    if (!record || /No matches found|ERROR/i.test(record)) throw new Error('No Horizons record');

    const body = BODIES[bodyId];
    if (!body) return;

    const semiMajorAu = parseHorizonsNumber(record, 'A');
    const eccentricity = parseHorizonsNumber(record, 'EC');
    const inclination = parseHorizonsNumber(record, 'IN');
    const longitudeAscendingNode = parseHorizonsNumber(record, 'OM');
    const periodDays = parseHorizonsNumber(record, 'PR');

    if (Number.isFinite(semiMajorAu)) body.semiMajor = `${semiMajorAu.toFixed(3)} AU`;
    if (Number.isFinite(eccentricity)) body.ecc = eccentricity.toFixed(4);
    if (Number.isFinite(inclination)) body.inc_deg = Number(inclination.toFixed(3));
    if (Number.isFinite(longitudeAscendingNode)) body.raan_deg = Number(longitudeAscendingNode.toFixed(3));
    if (Number.isFinite(periodDays)) {
      body.period = periodDays >= 365.25
        ? `${(periodDays / 365.25).toFixed(3)} years`
        : `${periodDays.toFixed(2)} days`;
    }

    body.meanRadiusKm = JPL_MEAN_RADII_KM[bodyId] || body.meanRadiusKm;
    body.liveSemiMajorAu = semiMajorAu;
    body.liveOrbitalSpeedKmS = Number.isFinite(semiMajorAu) && Number.isFinite(periodDays) && periodDays > 0
      ? (2 * Math.PI * semiMajorAu * 149597870.7) / (periodDays * 86400)
      : null;

    body.liveData = true;
    body.dataSource = config.source;
    body.dataSourceUrl = LIVE_DATA_ENDPOINTS.horizons;
    body.dataUpdatedAt = new Date().toISOString();
  }

  async function loadLivePlanetData() {
    const entries = Object.entries(LIVE_PLANET_DATA);
    const results = await Promise.allSettled(
      entries.map(([bodyId, config]) => fetchLivePlanetData(bodyId, config))
    );
    const failed = results.filter(result => result.status === 'rejected').length;
    if (failed) console.warn(`${failed} live planetary data request(s) unavailable; offline catalog retained.`);

    // Refresh only existing UI state; no rendering or interaction function is replaced.
    if (BODIES[currentTargetId]) {
      updateTelemetryMatrixUI(BODIES[currentTargetId]);
      updateCommandRailUI();
      buildSidebarTree();
    }
  }

  // --------------------------------------------------------------------------
  // 2. CELESTIAL BODIES DATA CATALOG (52 Cataloged Bodies)
  // --------------------------------------------------------------------------
  const BODIES = {
    // Central Star
    sun: {
      id: 'sun',
      name: 'Sun (Sol)',
      type: 'star',
      glyph: '☼',
      parent: null,
      radius: 32,
      dist: 0,
      inc_deg: 0,
      raan_deg: 0,
      orb_speed: 0,
      rot_speed: 0.004,
      tilt_deg: 7.25,
      color: '#ffb347',
      hexColor: 0xffb347,
      mass: '1.989 × 10³⁰ kg',
      gravity: '274.0 m/s²',
      dayLength: '27 Earth days',
      period: '—',
      semiMajor: '0.00 AU',
      ecc: '0.0000',
      status: 'GRAVITATIONAL ANCHOR',
      statusDetail: 'Main-Sequence G2V Dwarf · 4.603 Billion Years',
      agency: 'NASA / SOHO / SDO / ISRO ADITYA-L1',
      sourceTier: 'TIER A (DIRECT SATELLITE)',
      desc: 'The central star of the Solar System, containing 99.86% of the system’s total mass.'
    },

    // Mercury System
    mercury: {
      id: 'mercury',
      name: 'Mercury',
      type: 'planet',
      glyph: '☿',
      parent: 'sun',
      radius: 4.2,
      dist: 62,
      inc_deg: 7.0,
      raan_deg: 48.3,
      orb_speed: 0.24,
      rot_speed: 0.003,
      tilt_deg: 0.034,
      color: '#b0b0b0',
      hexColor: 0xb0b0b0,
      mass: '3.301 × 10²³ kg',
      gravity: '3.7 m/s²',
      dayLength: '58.6 Earth days',
      period: '87.97 days',
      semiMajor: '0.387 AU',
      ecc: '0.2056',
      status: 'PLANETARY OBSERVATION',
      statusDetail: '2 Spacecraft Missions Cataloged',
      agency: 'ESA / JAXA / NASA',
      sourceTier: 'TIER A (BepiColombo Ephemeris)',
      desc: 'Smallest and innermost planet in the Solar System, heavily cratered with high density.'
    },
    'bepicolombo': {
      id: 'bepicolombo',
      name: 'BepiColombo',
      type: 'satellite',
      glyph: '🛰',
      parent: 'mercury',
      radius: 0.8,
      dist: 9.5,
      inc_deg: 82.0,
      raan_deg: 145.0,
      orb_speed: 0.14,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#00f0ff',
      hexColor: 0x00f0ff,
      mass: '4,100 kg',
      gravity: '—',
      dayLength: 'Orbit: 9.2 hrs',
      period: '0.38 days',
      semiMajor: '2,980 km',
      ecc: '0.0042',
      status: 'ACTIVE CRUISE / APPROACH',
      statusDetail: 'Dual Orbiter Module (MPO + MMO)',
      agency: 'ESA / JAXA',
      sourceTier: 'TIER A (ESA Flight Dynamics)',
      desc: 'Joint European-Japanese mission to explore Mercury’s composition, geophysics, and magnetosphere.'
    },
    'messenger': {
      id: 'messenger',
      name: 'MESSENGER (Heritage)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'mercury',
      radius: 0.8,
      dist: 13.0,
      inc_deg: 12.0,
      raan_deg: 290.0,
      orb_speed: 0.09,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      mass: '1,093 kg',
      gravity: '—',
      dayLength: 'Orbit: 8.0 hrs',
      period: '0.33 days',
      semiMajor: '15,193 km',
      ecc: '0.7300',
      status: 'HERITAGE DEORBIT',
      statusDetail: 'Mission Completed 2015 · Surface Impact',
      agency: 'NASA / JHUAPL',
      sourceTier: 'TIER B (NASA PDS Archive)',
      desc: 'First spacecraft to orbit Mercury, discovering water ice in permanently shadowed polar craters.'
    },

    // Venus System
    venus: {
      id: 'venus',
      name: 'Venus',
      type: 'planet',
      glyph: '♀',
      parent: 'sun',
      radius: 9.6,
      dist: 94,
      inc_deg: 3.39,
      raan_deg: 76.7,
      orb_speed: 0.18,
      rot_speed: 0.001,
      tilt_deg: 177.4,
      color: '#ffd700',
      hexColor: 0xffd700,
      mass: '4.867 × 10²⁴ kg',
      gravity: '8.87 m/s²',
      dayLength: '243 Earth days (Retrograde)',
      period: '224.7 days',
      semiMajor: '0.723 AU',
      ecc: '0.0067',
      status: 'DENSE ATMOSPHERIC HARBOR',
      statusDetail: 'Runaway Greenhouse · 465°C Surface',
      agency: 'JAXA / ESA / NASA / ISRO',
      sourceTier: 'TIER A (JAXA ISAS Akatsuki)',
      desc: 'Second planet from the Sun, enveloped in dense reflective clouds of sulfuric acid with dense CO2.'
    },
    'akatsuki': {
      id: 'akatsuki',
      name: 'Akatsuki (PLANET-C)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'venus',
      radius: 0.8,
      dist: 15.5,
      inc_deg: 3.0,
      raan_deg: 172.0,
      orb_speed: 0.12,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#f43f5e',
      hexColor: 0xf43f5e,
      mass: '517 kg',
      gravity: '—',
      dayLength: 'Orbit: 10.8 days',
      period: '10.8 days',
      semiMajor: '140,000 km',
      ecc: '0.8000',
      status: 'ACTIVE METEOROLOGICAL',
      statusDetail: 'Cloud Top Super-Rotation Infrared Radar',
      agency: 'JAXA',
      sourceTier: 'TIER A (ISAS Telemetry)',
      desc: 'Japanese probe studying atmospheric super-rotation and 3D cloud dynamics on Venus.'
    },

    // Earth System
    earth: {
      id: 'earth',
      name: 'Earth (Terra)',
      type: 'planet',
      glyph: '🌍',
      parent: 'sun',
      radius: 10.5,
      dist: 132,
      inc_deg: 0.0,
      raan_deg: 0.0,
      orb_speed: 0.14,
      rot_speed: 0.02,
      tilt_deg: 23.44,
      color: '#00f0ff',
      hexColor: 0x00f0ff,
      mass: '5.972 × 10²⁴ kg',
      gravity: '9.807 m/s²',
      dayLength: '24.0 Hours',
      period: '365.25 days',
      semiMajor: '1.000 AU',
      ecc: '0.0167',
      status: 'PRIMARY MISSION WORKSPACE',
      statusDetail: '1 Natural Moon · 6 Artificial Spacecraft In Track',
      agency: 'NASA / ISRO / ESA / JAXA / ROSCOSMOS',
      sourceTier: 'TIER A (Direct Multi-Agency OEM)',
      desc: 'Third planet from the Sun, the only known astronomical object harboring liquid water and life.'
    },
    'moon': {
      id: 'moon',
      name: 'Moon (Luna)',
      type: 'moon',
      glyph: '🌙',
      parent: 'earth',
      radius: 2.8,
      dist: 24,
      inc_deg: 5.14,
      raan_deg: 125.0,
      orb_speed: 0.06,
      rot_speed: 0.005,
      tilt_deg: 1.54,
      color: '#d4d4d8',
      hexColor: 0xd4d4d8,
      mass: '7.342 × 10²² kg',
      gravity: '1.62 m/s²',
      dayLength: '27.3 Earth days',
      period: '27.32 days',
      semiMajor: '384,400 km',
      ecc: '0.0549',
      status: 'NATURAL SATELLITE',
      statusDetail: '2 Lunar Orbiters Cataloged',
      agency: 'NASA / ISRO',
      sourceTier: 'TIER A (JPL Ephemeris DE440)',
      desc: 'Earth’s only natural satellite in synchronous rotation, driving ocean tides.'
    },
    'iss': {
      id: 'iss',
      name: 'ISS (Zarya / NORAD 25544)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'earth',
      radius: 0.9,
      dist: 14.5,
      inc_deg: 51.64,
      raan_deg: 214.0,
      orb_speed: 0.18,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#00f0ff',
      hexColor: 0x00f0ff,
      mass: '419,936 kg',
      gravity: '—',
      dayLength: 'Orbit: 92.8 min',
      period: '0.064 days',
      semiMajor: '6,793 km',
      ecc: '0.0012',
      status: 'ACTIVE CREWED HABITATION',
      statusDetail: 'Expedition 72 · Altitude: 418.6 km · 7.66 km/s',
      agency: 'NASA / ROSCOSMOS / ESA / JAXA / CSA',
      sourceTier: 'TIER A (Direct OEM Ephemeris)',
      desc: 'Modular space station in low Earth orbit, serving as a continuous human-tended microgravity laboratory.'
    },
    'hubble': {
      id: 'hubble',
      name: 'Hubble Space Telescope',
      type: 'satellite',
      glyph: '🛰',
      parent: 'earth',
      radius: 0.8,
      dist: 16.5,
      inc_deg: 28.47,
      raan_deg: 68.0,
      orb_speed: 0.15,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#a855f7',
      hexColor: 0xa855f7,
      mass: '11,110 kg',
      gravity: '—',
      dayLength: 'Orbit: 95.4 min',
      period: '0.066 days',
      semiMajor: '6,913 km',
      ecc: '0.0003',
      status: 'ACTIVE ASTRONOMICAL',
      statusDetail: 'Altitude: 535.0 km · Optical/UV Deep Field',
      agency: 'NASA / ESA',
      sourceTier: 'TIER C (Public TLE Space-Track)',
      desc: 'Iconic space telescope orbiting above atmospheric distortion since 1990.'
    },
    'nisar': {
      id: 'nisar',
      name: 'NISAR (NASA-ISRO SAR)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'earth',
      radius: 0.8,
      dist: 18.2,
      inc_deg: 98.4,
      raan_deg: 195.0,
      orb_speed: 0.13,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#10b981',
      hexColor: 0x10b981,
      mass: '2,800 kg',
      gravity: '—',
      dayLength: 'Orbit: 99.2 min',
      period: '0.069 days',
      semiMajor: '7,125 km',
      ecc: '0.0001',
      status: 'ACTIVE RADAR IMAGING',
      statusDetail: 'Dual L-band & S-band Interferometric SAR',
      agency: 'NASA / ISRO',
      sourceTier: 'TIER B (Joint Pre-Launch State Vector)',
      desc: 'Joint NASA-ISRO mission using advanced synthetic aperture radar to map global earth dynamics.'
    },
    'chandrayaan3': {
      id: 'chandrayaan3',
      name: 'Chandrayaan-3 Propulsion',
      type: 'satellite',
      glyph: '🛰',
      parent: 'moon',
      radius: 0.7,
      dist: 5.0,
      inc_deg: 87.0,
      raan_deg: 320.0,
      orb_speed: 0.12,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      mass: '2,148 kg',
      gravity: '—',
      dayLength: 'Orbit: 127 min',
      period: '0.088 days',
      semiMajor: '1,837 km',
      ecc: '0.0018',
      status: 'ACTIVE SPECTRO-POLARIMETRY',
      statusDetail: 'SHAPE Payload Active · Polar Lunar Orbit',
      agency: 'ISRO',
      sourceTier: 'TIER A (ISTRAC Bangalore Telemetry)',
      desc: 'Indian lunar mission that achieved historic soft landing at the Moon’s southern pole.'
    },
    'lro': {
      id: 'lro',
      name: 'Lunar Reconnaissance Orbiter',
      type: 'satellite',
      glyph: '🛰',
      parent: 'moon',
      radius: 0.7,
      dist: 4.0,
      inc_deg: 90.0,
      raan_deg: 80.0,
      orb_speed: 0.10,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#3b82f6',
      hexColor: 0x3b82f6,
      mass: '1,916 kg',
      gravity: '—',
      dayLength: 'Orbit: 113 min',
      period: '0.078 days',
      semiMajor: '1,787 km',
      ecc: '0.0022',
      status: 'ACTIVE HIGH-RES MAPPING',
      statusDetail: 'LROC Narrow Angle Camera · 50 km Polar Orbit',
      agency: 'NASA / GSFC',
      sourceTier: 'TIER A (NASA PDS)',
      desc: 'NASA robotic spacecraft mapping the Moon in unprecedented 0.5m surface resolution.'
    },
    'adityal1': {
      id: 'adityal1',
      name: 'Aditya-L1 (Sun-Earth L1)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'earth',
      radius: 0.8,
      dist: 48.0,
      inc_deg: 16.0,
      raan_deg: 10.0,
      orb_speed: 0.03,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#ff6b6b',
      hexColor: 0xff6b6b,
      mass: '1,500 kg',
      gravity: '—',
      dayLength: 'Halo Orbit: 178 days',
      period: '178.0 days',
      semiMajor: '1.5M km',
      ecc: '0.0100',
      status: 'ACTIVE CORONAGRAPH',
      statusDetail: 'VELC / SUIT Corona & Chromosphere Feeds',
      agency: 'ISRO',
      sourceTier: 'TIER A (ISRO ISTRAC Spacecraft State)',
      desc: 'India’s first dedicated solar observatory stationed in halo orbit around Lagrange Point 1.'
    },

    // Mars System
    mars: {
      id: 'mars',
      name: 'Mars (Ares)',
      type: 'planet',
      glyph: '♂',
      parent: 'sun',
      radius: 5.8,
      dist: 185,
      inc_deg: 1.85,
      raan_deg: 49.6,
      orb_speed: 0.11,
      rot_speed: 0.019,
      tilt_deg: 25.19,
      color: '#ff6b6b',
      hexColor: 0xff6b6b,
      mass: '6.417 × 10²³ kg',
      gravity: '3.72 m/s²',
      dayLength: '24h 37m (Sol)',
      period: '686.98 days',
      semiMajor: '1.524 AU',
      ecc: '0.0934',
      status: 'MARTIAN HABITABILITY BASIN',
      statusDetail: '2 Natural Moons · 3 Active Orbiters',
      agency: 'NASA / ESA / ISRO / UAE',
      sourceTier: 'TIER A (JPL Mars Relay Network)',
      desc: 'Fourth planet from the Sun, featuring Olympus Mons and ancient river valleys.'
    },
    'phobos': {
      id: 'phobos',
      name: 'Phobos',
      type: 'moon',
      glyph: '🌙',
      parent: 'mars',
      radius: 0.9,
      dist: 9.2,
      inc_deg: 1.08,
      raan_deg: 92.0,
      orb_speed: 0.22,
      rot_speed: 0.02,
      tilt_deg: 0,
      color: '#71717a',
      hexColor: 0x71717a,
      mass: '1.065 × 10¹⁶ kg',
      gravity: '0.0057 m/s²',
      dayLength: '7.66 Hours',
      period: '0.318 days',
      semiMajor: '9,376 km',
      ecc: '0.0151',
      status: 'NATURAL SATELLITE',
      statusDetail: 'Tidally Locked · Decreasing Orbit (1.8m/century)',
      agency: 'NASA / ESA',
      sourceTier: 'TIER A (JPL Ephemeris MAR097)',
      desc: 'Innermost and larger of the two Martian moons, heavily cratered and destined to form a ring.'
    },
    'deimos': {
      id: 'deimos',
      name: 'Deimos',
      type: 'moon',
      glyph: '🌙',
      parent: 'mars',
      radius: 0.6,
      dist: 16.0,
      inc_deg: 1.79,
      raan_deg: 248.0,
      orb_speed: 0.10,
      rot_speed: 0.01,
      tilt_deg: 0,
      color: '#a1a1aa',
      hexColor: 0xa1a1aa,
      mass: '1.476 × 10¹⁵ kg',
      gravity: '0.003 m/s²',
      dayLength: '30.3 Hours',
      period: '1.263 days',
      semiMajor: '23,463 km',
      ecc: '0.0002',
      status: 'NATURAL SATELLITE',
      statusDetail: 'Smooth Regolith Mantle',
      agency: 'NASA / ESA',
      sourceTier: 'TIER A (JPL Ephemeris MAR097)',
      desc: 'Outer Martian moon covered in a thick layer of regolith that fills craters.'
    },
    'mro': {
      id: 'mro',
      name: 'Mars Reconnaissance Orbiter',
      type: 'satellite',
      glyph: '🛰',
      parent: 'mars',
      radius: 0.8,
      dist: 11.5,
      inc_deg: 92.7,
      raan_deg: 310.0,
      orb_speed: 0.14,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#00f0ff',
      hexColor: 0x00f0ff,
      mass: '2,180 kg',
      gravity: '—',
      dayLength: 'Orbit: 112 min',
      period: '0.077 days',
      semiMajor: '3,678 km',
      ecc: '0.0080',
      status: 'ACTIVE HI-RISE TELECOM',
      statusDetail: 'Primary Relay for Perseverance & Curiosity',
      agency: 'NASA / JPL',
      sourceTier: 'TIER A (JPL Navigation Ephemeris)',
      desc: 'Multipurpose spacecraft examining Mars surface and relaying rover telemetry to Earth.'
    },
    'maven': {
      id: 'maven',
      name: 'MAVEN',
      type: 'satellite',
      glyph: '🛰',
      parent: 'mars',
      radius: 0.8,
      dist: 19.5,
      inc_deg: 75.0,
      raan_deg: 155.0,
      orb_speed: 0.08,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#a855f7',
      hexColor: 0xa855f7,
      mass: '2,454 kg',
      gravity: '—',
      dayLength: 'Orbit: 4.5 hrs',
      period: '0.187 days',
      semiMajor: '6,200 km',
      ecc: '0.1200',
      status: 'ACTIVE ATMOSPHERIC ESCAPE',
      statusDetail: 'Solar Wind Ion Sputtering Analysis',
      agency: 'NASA / LASP',
      sourceTier: 'TIER A (NASA PDS)',
      desc: 'Probing the loss of Mars’ atmosphere and water to space across billions of years.'
    },
    'mangalyaan': {
      id: 'mangalyaan',
      name: 'Mangalyaan (MOM Heritage)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'mars',
      radius: 0.8,
      dist: 14.5,
      inc_deg: 150.0,
      raan_deg: 42.0,
      orb_speed: 0.11,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      mass: '1,337 kg',
      gravity: '—',
      dayLength: 'Orbit: 72.8 hrs',
      period: '3.03 days',
      semiMajor: '42,000 km',
      ecc: '0.8800',
      status: 'HERITAGE COMPLETE',
      statusDetail: 'Historic 8-Year Mission Life (2014-2022)',
      agency: 'ISRO',
      sourceTier: 'TIER A (ISRO Telemetry Archive)',
      desc: 'India’s groundbreaking first interplanetary mission, reaching Mars orbit on maiden attempt.'
    },

    // Jupiter System
    jupiter: {
      id: 'jupiter',
      name: 'Jupiter (Jove)',
      type: 'planet',
      glyph: '♃',
      parent: 'sun',
      radius: 22.0,
      dist: 290,
      inc_deg: 1.30,
      raan_deg: 100.5,
      orb_speed: 0.06,
      rot_speed: 0.045,
      tilt_deg: 3.13,
      color: '#ffc87a',
      hexColor: 0xffc87a,
      mass: '1.898 × 10²⁷ kg',
      gravity: '24.79 m/s²',
      dayLength: '9h 56m',
      period: '11.86 Years',
      semiMajor: '5.204 AU',
      ecc: '0.0489',
      status: 'GAS GIANT KING',
      statusDetail: '4 Galilean Moons · 3 Spacecraft Cataloged',
      agency: 'NASA / ESA / JAXA',
      sourceTier: 'TIER A (JPL Juno Trajectory)',
      desc: 'Largest planet in the Solar System, with massive magnetic field and the Great Red Spot storm.'
    },
    'io': {
      id: 'io',
      name: 'Io',
      type: 'moon',
      glyph: '🌙',
      parent: 'jupiter',
      radius: 3.0,
      dist: 34,
      inc_deg: 0.04,
      raan_deg: 48.0,
      orb_speed: 0.16,
      rot_speed: 0.02,
      tilt_deg: 0,
      color: '#eab308',
      hexColor: 0xeab308,
      mass: '8.932 × 10²² kg',
      gravity: '1.796 m/s²',
      dayLength: '42.5 Hours',
      period: '1.769 days',
      semiMajor: '421,700 km',
      ecc: '0.0041',
      status: 'VOLCANIC BODY',
      statusDetail: '400+ Active Sulfur Volcanoes',
      agency: 'NASA / JPL',
      sourceTier: 'TIER A (JPL JUP310)',
      desc: 'Most geologically active body in the Solar System, superheated by tidal flexing from Jupiter.'
    },
    'europa': {
      id: 'europa',
      name: 'Europa',
      type: 'moon',
      glyph: '🌙',
      parent: 'jupiter',
      radius: 2.6,
      dist: 48,
      inc_deg: 0.47,
      raan_deg: 172.0,
      orb_speed: 0.12,
      rot_speed: 0.015,
      tilt_deg: 0.1,
      color: '#e0f2fe',
      hexColor: 0xe0f2fe,
      mass: '4.800 × 10²² kg',
      gravity: '1.315 m/s²',
      dayLength: '85.2 Hours',
      period: '3.551 days',
      semiMajor: '670,900 km',
      ecc: '0.0090',
      status: 'SUBSURFACE OCEAN HARBOR',
      statusDetail: '100 km Deep Ocean Under Ice Shell',
      agency: 'NASA / ESA',
      sourceTier: 'TIER A (JPL JUP310)',
      desc: 'Smooth icy crust criss-crossed by lineae fractures, harboring a vast warm subsurface salty ocean.'
    },
    'ganymede': {
      id: 'ganymede',
      name: 'Ganymede',
      type: 'moon',
      glyph: '🌙',
      parent: 'jupiter',
      radius: 4.2,
      dist: 64,
      inc_deg: 0.18,
      raan_deg: 310.0,
      orb_speed: 0.08,
      rot_speed: 0.01,
      tilt_deg: 0.2,
      color: '#94a3b8',
      hexColor: 0x94a3b8,
      mass: '1.482 × 10²³ kg',
      gravity: '1.428 m/s²',
      dayLength: '171.7 Hours',
      period: '7.155 days',
      semiMajor: '1,070,400 km',
      ecc: '0.0013',
      status: 'LARGEST MOON IN SYSTEM',
      statusDetail: 'Internal Dynamo · Magnetic Field',
      agency: 'ESA / NASA',
      sourceTier: 'TIER A (JPL JUP310)',
      desc: 'Largest natural satellite in the Solar System (larger than Mercury), with its own intrinsic magnetic field.'
    },
    'callisto': {
      id: 'callisto',
      name: 'Callisto',
      type: 'moon',
      glyph: '🌙',
      parent: 'jupiter',
      radius: 3.9,
      dist: 82,
      inc_deg: 0.19,
      raan_deg: 95.0,
      orb_speed: 0.05,
      rot_speed: 0.008,
      tilt_deg: 0,
      color: '#64748b',
      hexColor: 0x64748b,
      mass: '1.076 × 10²³ kg',
      gravity: '1.235 m/s²',
      dayLength: '16.7 Earth days',
      period: '16.689 days',
      semiMajor: '1,882,700 km',
      ecc: '0.0074',
      status: 'ANCIENT CRATERED CRUST',
      statusDetail: 'Lowest Radiation in Jovian System',
      agency: 'NASA / ESA',
      sourceTier: 'TIER A (JPL JUP310)',
      desc: 'Most heavily cratered object in the Solar System, largely unchanged for 4 billion years.'
    },
    'juno': {
      id: 'juno',
      name: 'Juno Spacecraft',
      type: 'satellite',
      glyph: '🛰',
      parent: 'jupiter',
      radius: 0.9,
      dist: 28,
      inc_deg: 90.0,
      raan_deg: 265.0,
      orb_speed: 0.07,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#00f0ff',
      hexColor: 0x00f0ff,
      mass: '1,593 kg',
      gravity: '—',
      dayLength: 'Orbit: 38.0 days',
      period: '38.0 days',
      semiMajor: '2.4M km',
      ecc: '0.9800',
      status: 'ACTIVE POLAR PERIJOVE',
      statusDetail: 'Microwave Radiometer & Gravity Science',
      agency: 'NASA / JPL',
      sourceTier: 'TIER A (JPL Navigation Ephemeris)',
      desc: 'Solar-powered probe executing low polar flybys to map Jupiter’s core and deep atmosphere.'
    },
    'europaclipper': {
      id: 'europaclipper',
      name: 'Europa Clipper',
      type: 'satellite',
      glyph: '🛰',
      parent: 'jupiter',
      radius: 0.9,
      dist: 52,
      inc_deg: 52.0,
      raan_deg: 130.0,
      orb_speed: 0.04,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#10b981',
      hexColor: 0x10b981,
      mass: '6,065 kg',
      gravity: '—',
      dayLength: 'Orbit: 21.4 days',
      period: '21.4 days',
      semiMajor: '1.2M km',
      ecc: '0.8500',
      status: 'EN ROUTE / APPROACH',
      statusDetail: 'REASON Ice-Penetrating Radar Array',
      agency: 'NASA / JPL / APL',
      sourceTier: 'TIER A (NASA Mission Ops)',
      desc: 'Flagship mission to perform 49 low-altitude flybys of Europa to confirm habitability.'
    },
    'juice': {
      id: 'juice',
      name: 'JUICE (JUpiter ICy moons)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'jupiter',
      radius: 0.9,
      dist: 72,
      inc_deg: 28.0,
      raan_deg: 195.0,
      orb_speed: 0.03,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#a855f7',
      hexColor: 0xa855f7,
      mass: '6,070 kg',
      gravity: '—',
      dayLength: 'Orbit: Ganymede Insertion',
      period: '14.0 days',
      semiMajor: '950,000 km',
      ecc: '0.1200',
      status: 'INTERPLANETARY CRUISE',
      statusDetail: 'First Spacecraft to Orbit Ganymede (2034)',
      agency: 'ESA',
      sourceTier: 'TIER A (ESA ESOC Darmstadt)',
      desc: 'European Space Agency mission to characterize ocean-bearing Jovian moons.'
    },

    // Saturn System
    saturn: {
      id: 'saturn',
      name: 'Saturn (Cronus)',
      type: 'planet',
      glyph: '♄',
      parent: 'sun',
      radius: 18.5,
      dist: 420,
      inc_deg: 2.49,
      raan_deg: 113.7,
      orb_speed: 0.045,
      rot_speed: 0.04,
      tilt_deg: 26.73,
      color: '#ffe4a0',
      hexColor: 0xffe4a0,
      mass: '5.683 × 10²⁶ kg',
      gravity: '10.44 m/s²',
      dayLength: '10h 33m',
      period: '29.45 Years',
      semiMajor: '9.537 AU',
      ecc: '0.0542',
      status: 'SPECTACULAR RING REALM',
      statusDetail: 'Iconic Ring System · 4 Moons In Track',
      agency: 'NASA / ESA / ASI',
      sourceTier: 'TIER A (JPL SAT441)',
      desc: 'Sixth planet from the Sun, adorned with a dazzling system of icy rings and diverse moons.'
    },
    'titan': {
      id: 'titan',
      name: 'Titan',
      type: 'moon',
      glyph: '🌙',
      parent: 'saturn',
      radius: 4.1,
      dist: 58,
      inc_deg: 0.35,
      raan_deg: 68.0,
      orb_speed: 0.04,
      rot_speed: 0.01,
      tilt_deg: 0,
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      mass: '1.345 × 10²³ kg',
      gravity: '1.352 m/s²',
      dayLength: '15.9 Earth days',
      period: '15.945 days',
      semiMajor: '1,221,870 km',
      ecc: '0.0288',
      status: 'ORGANIC HAZE WORLD',
      statusDetail: 'Methane & Ethane Lakes · 1.45 atm Surface',
      agency: 'NASA / ESA (Huygens Landing Site)',
      sourceTier: 'TIER A (JPL SAT441)',
      desc: 'Only moon known to have a dense atmosphere, complete with liquid methane clouds, rain, and seas.'
    },
    'enceladus': {
      id: 'enceladus',
      name: 'Enceladus',
      type: 'moon',
      glyph: '🌙',
      parent: 'saturn',
      radius: 1.3,
      dist: 30,
      inc_deg: 0.02,
      raan_deg: 228.0,
      orb_speed: 0.14,
      rot_speed: 0.03,
      tilt_deg: 0,
      color: '#ffffff',
      hexColor: 0xffffff,
      mass: '1.080 × 10²⁰ kg',
      gravity: '0.113 m/s²',
      dayLength: '32.9 Hours',
      period: '1.370 days',
      semiMajor: '238,000 km',
      ecc: '0.0047',
      status: 'ACTIVE CRYOMAGMATIC GEYSERS',
      statusDetail: 'Tiger Stripes Venting Ocean Water Into E-Ring',
      agency: 'NASA / ESA',
      sourceTier: 'TIER A (JPL SAT441)',
      desc: 'Brilliant white ice moon erupting cryovolcanic plumes of organic-rich water vapor into space.'
    },
    'mimas': {
      id: 'mimas',
      name: 'Mimas',
      type: 'moon',
      glyph: '🌙',
      parent: 'saturn',
      radius: 1.0,
      dist: 24,
      inc_deg: 1.57,
      raan_deg: 340.0,
      orb_speed: 0.18,
      rot_speed: 0.04,
      tilt_deg: 0,
      color: '#d4d4d8',
      hexColor: 0xd4d4d8,
      mass: '3.75 × 10¹⁹ kg',
      gravity: '0.064 m/s²',
      dayLength: '22.6 Hours',
      period: '0.942 days',
      semiMajor: '185,520 km',
      ecc: '0.0202',
      status: 'HERSCHEL CRATER CRUST',
      statusDetail: '130 km Wide Herschel Impact Basin',
      agency: 'NASA / ESA',
      sourceTier: 'TIER A (JPL SAT441)',
      desc: 'Small moon dominated by the colossal Herschel Crater, resembling the Death Star.'
    },
    'cassini': {
      id: 'cassini',
      name: 'Cassini-Huygens (Heritage)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'saturn',
      radius: 0.9,
      dist: 38,
      inc_deg: 66.0,
      raan_deg: 290.0,
      orb_speed: 0.06,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      mass: '5,712 kg',
      gravity: '—',
      dayLength: 'Grand Finale Orbits',
      period: '6.5 days',
      semiMajor: '1.2M km',
      ecc: '0.8600',
      status: 'HERITAGE GRAND FINALE',
      statusDetail: '20-Year Flagship · Saturn Atmospheric Plunge',
      agency: 'NASA / ESA / ASI',
      sourceTier: 'TIER A (NASA PDS Archive)',
      desc: 'Legendary orbiter that spent 13 years unlocking the mysteries of Saturn, Titan, and Enceladus.'
    },

    // Uranus System
    uranus: {
      id: 'uranus',
      name: 'Uranus (Caelus)',
      type: 'planet',
      glyph: '♅',
      parent: 'sun',
      radius: 14.0,
      dist: 540,
      inc_deg: 0.77,
      raan_deg: 74.0,
      orb_speed: 0.03,
      rot_speed: 0.025,
      tilt_deg: 97.77,
      color: '#7fffd4',
      hexColor: 0x7fffd4,
      mass: '8.681 × 10²⁵ kg',
      gravity: '8.69 m/s²',
      dayLength: '17h 14m (Retrograde)',
      period: '84.01 Years',
      semiMajor: '19.19 AU',
      ecc: '0.0472',
      status: 'ICE GIANT ROLLER',
      statusDetail: 'Extreme 97.8° Axial Tilt · Ring System',
      agency: 'NASA',
      sourceTier: 'TIER A (JPL URA111)',
      desc: 'Ice giant tilted on its side, rolling around the Sun with cold methane atmosphere and dark rings.'
    },
    'titania': {
      id: 'titania',
      name: 'Titania',
      type: 'moon',
      glyph: '🌙',
      parent: 'uranus',
      radius: 2.2,
      dist: 30,
      inc_deg: 0.08,
      raan_deg: 55.0,
      orb_speed: 0.07,
      rot_speed: 0.02,
      tilt_deg: 0,
      color: '#cbd5e1',
      hexColor: 0xcbd5e1,
      mass: '3.527 × 10²¹ kg',
      gravity: '0.367 m/s²',
      dayLength: '8.7 Earth days',
      period: '8.706 days',
      semiMajor: '435,910 km',
      ecc: '0.0011',
      status: 'LARGEST URANIAN MOON',
      statusDetail: 'Deep Fault Canyons (Messina Chasma)',
      agency: 'NASA',
      sourceTier: 'TIER A (JPL URA111)',
      desc: 'Eighth-largest moon in the Solar System, sliced by massive graben fault valleys.'
    },
    'oberon': {
      id: 'oberon',
      name: 'Oberon',
      type: 'moon',
      glyph: '🌙',
      parent: 'uranus',
      radius: 2.0,
      dist: 42,
      inc_deg: 0.07,
      raan_deg: 210.0,
      orb_speed: 0.05,
      rot_speed: 0.015,
      tilt_deg: 0,
      color: '#94a3b8',
      hexColor: 0x94a3b8,
      mass: '3.014 × 10²¹ kg',
      gravity: '0.346 m/s²',
      dayLength: '13.5 Earth days',
      period: '13.463 days',
      semiMajor: '583,520 km',
      ecc: '0.0014',
      status: 'OUTERMAJOR MOON',
      statusDetail: 'Heavily Cratered Dark Floor Craters',
      agency: 'NASA',
      sourceTier: 'TIER A (JPL URA111)',
      desc: 'Outermost of the major Uranian moons, showing high crater density with dark carbonaceous floors.'
    },

    // Neptune System
    neptune: {
      id: 'neptune',
      name: 'Neptune (Poseidon)',
      type: 'planet',
      glyph: '♆',
      parent: 'sun',
      radius: 13.5,
      dist: 650,
      inc_deg: 1.77,
      raan_deg: 131.8,
      orb_speed: 0.024,
      rot_speed: 0.028,
      tilt_deg: 28.32,
      color: '#4169e1',
      hexColor: 0x4169e1,
      mass: '1.024 × 10²⁶ kg',
      gravity: '11.15 m/s²',
      dayLength: '16h 06m',
      period: '164.8 Years',
      semiMajor: '30.07 AU',
      ecc: '0.0086',
      status: 'SUPERSONIC ICE GIANT',
      statusDetail: 'Fastest Winds in System (2,100 km/h)',
      agency: 'NASA',
      sourceTier: 'TIER A (JPL NEP081)',
      desc: 'Outermost major planet, possessing brilliant azure blue color and supersonic wind storms.'
    },
    'triton': {
      id: 'triton',
      name: 'Triton',
      type: 'moon',
      glyph: '🌙',
      parent: 'neptune',
      radius: 2.2,
      dist: 28,
      inc_deg: 156.8, // Retrograde orbit
      raan_deg: 178.0,
      orb_speed: 0.06,
      rot_speed: 0.02,
      tilt_deg: 0,
      color: '#fbcfe8',
      hexColor: 0xfbcfe8,
      mass: '2.14 × 10²² kg',
      gravity: '0.779 m/s²',
      dayLength: '5.87 Earth days',
      period: '5.877 days (Retrograde)',
      semiMajor: '354,760 km',
      ecc: '0.0000',
      status: 'CAPTURED KUIPER BELT DWARF',
      statusDetail: 'Active Nitrogen Geysers · Cantaloupe Terrain',
      agency: 'NASA',
      sourceTier: 'TIER A (JPL NEP081)',
      desc: 'Only large moon with retrograde orbit, captured from the Kuiper Belt with active nitrogen plumes.'
    },

    // Pluto (Dwarf Planet System)
    pluto: {
      id: 'pluto',
      name: 'Pluto (134340)',
      type: 'dwarf',
      glyph: '♇',
      parent: 'sun',
      radius: 2.6,
      dist: 740,
      inc_deg: 17.16,
      raan_deg: 110.3,
      orb_speed: 0.018,
      rot_speed: 0.006,
      tilt_deg: 122.53,
      color: '#dda0dd',
      hexColor: 0xdda0dd,
      mass: '1.303 × 10²² kg',
      gravity: '0.62 m/s²',
      dayLength: '6.39 Earth days',
      period: '247.9 Years',
      semiMajor: '39.48 AU',
      ecc: '0.2488',
      status: 'KUIPER BELT DWARF REALM',
      statusDetail: 'Binary System with Charon · Nitrogen Glaciers',
      agency: 'NASA / JHUAPL',
      sourceTier: 'TIER A (JPL PLU055)',
      desc: 'Famous dwarf planet in the Kuiper belt, exhibiting the heart-shaped nitrogen ice plain Tombaugh Regio.'
    },
    'charon': {
      id: 'charon',
      name: 'Charon',
      type: 'moon',
      glyph: '🌙',
      parent: 'pluto',
      radius: 1.4,
      dist: 7.2,
      inc_deg: 0.0,
      raan_deg: 0.0,
      orb_speed: 0.04,
      rot_speed: 0.006,
      tilt_deg: 0,
      color: '#94a3b8',
      hexColor: 0x94a3b8,
      mass: '1.586 × 10²¹ kg',
      gravity: '0.288 m/s²',
      dayLength: '6.39 Earth days (Locked)',
      period: '6.387 days',
      semiMajor: '19,591 km',
      ecc: '0.0002',
      status: 'TIDALLY LOCKED BINARY',
      statusDetail: 'Mordor Macula Red Tholin Polar Cap',
      agency: 'NASA / JHUAPL',
      sourceTier: 'TIER A (JPL PLU055)',
      desc: 'Pluto’s massive companion, forming a mutually tidally locked binary system with barycenter above Pluto’s surface.'
    },
    'newhorizons': {
      id: 'newhorizons',
      name: 'New Horizons (Heritage)',
      type: 'satellite',
      glyph: '🛰',
      parent: 'pluto',
      radius: 0.8,
      dist: 12.5,
      inc_deg: 45.0,
      raan_deg: 220.0,
      orb_speed: 0.02,
      rot_speed: 0.05,
      tilt_deg: 0,
      color: '#a855f7',
      hexColor: 0xa855f7,
      mass: '478 kg',
      gravity: '—',
      dayLength: 'Historic Flyby Velocity: 13.8 km/s',
      period: 'Flyby Trajectory',
      semiMajor: 'Hyperbolic Escape',
      ecc: '1.0500',
      status: 'INTERSTELLAR ESCAPE',
      statusDetail: 'Beyond 58 AU · Still Transmitting Telemetry',
      agency: 'NASA / JHUAPL',
      sourceTier: 'TIER A (NASA PDS Archive)',
      desc: 'First spacecraft to explore Pluto and Arrokoth up close, now heading toward interstellar space.'
    }
  };

  // --------------------------------------------------------------------------
  // 3. THREE.JS ENGINE STATE & GLOBALS
  // --------------------------------------------------------------------------
  let scene, camera, renderer;
  let systemGroup, sunMesh, sunCoronaMesh, earthCloudsMesh;
  let asteroidInstancedMesh, deepStarsPoints, parallaxStarsPoints;
  let constellationGroup;
  const meteorList = [];
  const meshCatalog = new Map();
  const satelliteMeshList = [];
  let textureLoader;

  let currentTargetId = 'sun';
  let currentViewMode = 'system';
  let isWarping = false;

  // DYNAMIC LIVE CAMERA ORBIT TRACKING SYSTEM
  const focusTracking = {
    orbitRadius: 950,
    targetOrbitRadius: 950,
    azimuth: 0.25,
    elevation: 0.35,
    minRadius: 5,
    maxRadius: 2200
  };

  const cameraCurrentLook = new THREE.Vector3(0, 0, 0);
  const cameraCurrentPos = new THREE.Vector3(0, 120, 950);
  const tempTargetWorldPos = new THREE.Vector3();

  // CURSOR INTERACTION & PARALLAX STATE
  const cursorParallax = {
    screenX: 0,
    screenY: 0,
    targetX: 0,
    targetY: 0
  };

  const interaction = {
    isDragging: false,
    prevX: 0,
    prevY: 0
  };

  let lastFrameTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;

  // --------------------------------------------------------------------------
  // 4. TEXTURE LOADER WITH HIGH-RES REAL IMAGES
  // --------------------------------------------------------------------------
  function loadRealTexture(url, isColor = true) {
    if (!textureLoader) {
      textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin('anonymous');
    }

    const texture = textureLoader.load(
      url,
      function (tex) {
        if (isColor && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
      },
      undefined,
      function (err) {
        console.warn('Remote texture fallback active for:', url);
      }
    );
    return texture;
  }

  // --------------------------------------------------------------------------
  // 5. INITIALIZATION
  // --------------------------------------------------------------------------
  function init() {
    const container = document.getElementById('solar-canvas-container');
    if (!container || typeof THREE === 'undefined') return;

    // 1. Setup Three.js Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.1, 9500);
    camera.position.copy(cameraCurrentPos);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    systemGroup = new THREE.Group();
    scene.add(systemGroup);

    // 2. Add Realistic Lighting
    addLighting();

    // 3. Add $300,000 Premium Deep Space Cosmos (Parallax Stars, Constellations, Meteor Shower)
    addDeepSpaceEnvironment();
    addAstronomicalConstellations();
    initMeteorShowerEngine();

    // 4. Add 3D Jagged Asteroid Belt
    addRealisticAsteroidBelt();

    // 5. Build Real-Textured 3D Planetary Hierarchy
    buildSolarHierarchy();

    // 6. Setup UI & Event Handlers
    buildSidebarTree();
    setupInteraction(container);
    setupCommandRail();
    setupSearchModal();
    setupKeyboardShortcuts();
    selectBody('sun', 'system');

    // Additive live refresh; the existing offline catalog remains the fallback.
    loadLivePlanetData();

    // 7. Start Render Loop
    window.addEventListener('resize', handleResize);
    animate(performance.now());
  }

  // --------------------------------------------------------------------------
  // 6. LIGHTING
  // --------------------------------------------------------------------------
  function addLighting() {
    const sunLight = new THREE.PointLight(0xfffaed, 3.4, 6000, 0.3);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x0e1830, 1.5);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.45);
    rimLight.position.set(400, 300, 600);
    scene.add(rimLight);
  }

  // --------------------------------------------------------------------------
  // 7. $300k ULTRA-PREMIUM DEEP SPACE COSMOS (Parallax Stars & Cosmic Dust)
  // --------------------------------------------------------------------------
  function addDeepSpaceEnvironment() {
    // 1. Layer A: 4,000 Micro Deep Background Stars (Color temperature spectrum)
    const starCount = 4000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 3200 + Math.random() * 3000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const idx = i * 3;

      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.cos(phi);
      positions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Real spectral colors (O: Blue, B: White, G: Yellow, M: Red)
      const spec = Math.random();
      if (spec > 0.85) {
        colors[idx] = 0.6; colors[idx + 1] = 0.8; colors[idx + 2] = 1.0; // Blue star
      } else if (spec > 0.6) {
        colors[idx] = 1.0; colors[idx + 1] = 0.95; colors[idx + 2] = 0.85; // White-Yellow
      } else if (spec > 0.3) {
        colors[idx] = 1.0; colors[idx + 1] = 0.75; colors[idx + 2] = 0.55; // Orange-Amber
      } else {
        colors[idx] = 0.9; colors[idx + 1] = 0.95; colors[idx + 2] = 1.0; // Cyan-White
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    deepStarsPoints = new THREE.Points(starGeo, starMat);
    scene.add(deepStarsPoints);

    // 2. Layer B: 1,200 Foreground Interactive Stars (Drifts with cursor movement)
    const pCount = 1200;
    const pPositions = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const r = 1800 + Math.random() * 1400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const idx = i * 3;

      pPositions[idx] = r * Math.sin(phi) * Math.cos(theta);
      pPositions[idx + 1] = r * Math.cos(phi);
      pPositions[idx + 2] = r * Math.sin(phi) * Math.sin(theta);

      pColors[idx] = 0.85 + Math.random() * 0.15;
      pColors[idx + 1] = 0.9 + Math.random() * 0.1;
      pColors[idx + 2] = 1.0;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    parallaxStarsPoints = new THREE.Points(pGeo, pMat);
    scene.add(parallaxStarsPoints);
  }

  // --------------------------------------------------------------------------
  // 8. 3D CELESTIAL CONSTELLATIONS (Orion, Ursa Major, Cassiopeia, Cygnus, etc.)
  // --------------------------------------------------------------------------
  function addAstronomicalConstellations() {
    constellationGroup = new THREE.Group();
    constellationGroup.name = 'Astronomical Constellations';

    const R = 3200; // Constellation Sphere Distance

    // Convert celestial Spherical (RA deg, Dec deg) to 3D Cartesian
    function celestialToVector3(raDeg, decDeg) {
      const raRad = THREE.MathUtils.degToRad(raDeg);
      const decRad = THREE.MathUtils.degToRad(decDeg);
      return new THREE.Vector3(
        R * Math.cos(decRad) * Math.cos(raRad),
        R * Math.sin(decRad),
        R * Math.cos(decRad) * Math.sin(raRad)
      );
    }

    // Iconic Constellations definition
    const CONSTELLATIONS = [
      // 1. Orion (The Hunter)
      {
        name: 'ORION',
        color: 0x00f0ff,
        stars: [
          { name: 'Betelgeuse', ra: 88.8, dec: 7.4, mag: 2.8, color: 0xff7744 },
          { name: 'Rigel', ra: 78.6, dec: -8.2, mag: 3.2, color: 0x88ccff },
          { name: 'Bellatrix', ra: 81.3, dec: 6.3, mag: 2.2, color: 0xaaddff },
          { name: 'Saiph', ra: 86.9, dec: -9.7, mag: 2.0, color: 0x88ccff },
          { name: 'Alnitak', ra: 85.2, dec: -1.9, mag: 2.0, color: 0xaaddff },
          { name: 'Alnilam', ra: 84.1, dec: -1.2, mag: 2.2, color: 0xaaddff },
          { name: 'Mintaka', ra: 83.0, dec: -0.3, mag: 2.0, color: 0xaaddff }
        ],
        lines: [
          [0, 2], [2, 6], [6, 5], [5, 4], [4, 3], [3, 1], [1, 6], [0, 4]
        ]
      },
      // 2. Ursa Major (The Big Dipper)
      {
        name: 'URSA MAJOR',
        color: 0xa855f7,
        stars: [
          { name: 'Dubhe', ra: 165.9, dec: 61.8, mag: 2.5, color: 0xffdd88 },
          { name: 'Merak', ra: 165.5, dec: 56.4, mag: 2.2, color: 0xaaddff },
          { name: 'Phecda', ra: 178.5, dec: 53.7, mag: 2.0, color: 0xaaddff },
          { name: 'Megrez', ra: 183.9, dec: 57.0, mag: 1.8, color: 0xaaddff },
          { name: 'Alioth', ra: 193.5, dec: 55.9, mag: 2.5, color: 0xaaddff },
          { name: 'Mizar', ra: 200.9, dec: 54.9, mag: 2.4, color: 0xaaddff },
          { name: 'Alkaid', ra: 206.9, dec: 49.3, mag: 2.5, color: 0x88ccff }
        ],
        lines: [
          [0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]
        ]
      },
      // 3. Cassiopeia (The Queen 'W')
      {
        name: 'CASSIOPEIA',
        color: 0x10b981,
        stars: [
          { name: 'Schedar', ra: 10.1, dec: 56.5, mag: 2.4, color: 0xffaa55 },
          { name: 'Caph', ra: 2.3, dec: 59.2, mag: 2.2, color: 0xffffff },
          { name: 'Gamma Cas', ra: 14.2, dec: 60.7, mag: 2.6, color: 0x88ccff },
          { name: 'Ruchbah', ra: 21.5, dec: 60.2, mag: 2.0, color: 0xffffff },
          { name: 'Segin', ra: 26.6, dec: 63.7, mag: 1.9, color: 0xaaddff }
        ],
        lines: [
          [1, 0], [0, 2], [2, 3], [3, 4]
        ]
      },
      // 4. Cygnus (The Northern Cross)
      {
        name: 'CYGNUS',
        color: 0xf59e0b,
        stars: [
          { name: 'Deneb', ra: 310.4, dec: 45.3, mag: 3.2, color: 0xffffff },
          { name: 'Albireo', ra: 292.7, dec: 28.0, mag: 2.3, color: 0xffaa44 },
          { name: 'Sadr', ra: 305.6, dec: 40.3, mag: 2.4, color: 0xffeebb },
          { name: 'Gienah', ra: 311.5, dec: 33.9, mag: 2.0, color: 0x88ccff },
          { name: 'Fawaris', ra: 296.3, dec: 45.1, mag: 2.0, color: 0x88ccff }
        ],
        lines: [
          [0, 2], [2, 1], [3, 2], [2, 4]
        ]
      },
      // 5. Canis Major (With Sirius - Brightest Star)
      {
        name: 'CANIS MAJOR',
        color: 0x38bdf8,
        stars: [
          { name: 'Sirius', ra: 101.3, dec: -16.7, mag: 4.5, color: 0xddeeff },
          { name: 'Mirzam', ra: 95.7, dec: -18.0, mag: 2.0, color: 0xaaddff },
          { name: 'Wezen', ra: 107.1, dec: -26.4, mag: 2.2, color: 0xffeebb },
          { name: 'Adhara', ra: 104.7, dec: -29.0, mag: 2.4, color: 0x88ccff }
        ],
        lines: [
          [1, 0], [0, 2], [2, 3]
        ]
      }
    ];

    CONSTELLATIONS.forEach(constell => {
      const starVecs = constell.stars.map(s => celestialToVector3(s.ra, s.dec));

      // Draw Star Nodes with Bright Glowing Sprites
      constell.stars.forEach((st, i) => {
        const starGeo = new THREE.SphereGeometry(st.mag * 2.2, 12, 12);
        const starMat = new THREE.MeshBasicMaterial({ color: st.color });
        const starMesh = new THREE.Mesh(starGeo, starMat);
        starMesh.position.copy(starVecs[i]);
        constellationGroup.add(starMesh);
      });

      // Draw Laser Constellation Lines
      const linePositions = [];
      constell.lines.forEach(([i1, i2]) => {
        linePositions.push(starVecs[i1].x, starVecs[i1].y, starVecs[i1].z);
        linePositions.push(starVecs[i2].x, starVecs[i2].y, starVecs[i2].z);
      });

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

      const lineMat = new THREE.LineBasicMaterial({
        color: constell.color,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
      constellationGroup.add(lineMesh);
    });

    scene.add(constellationGroup);
  }

  // --------------------------------------------------------------------------
  // 9. HYPERVELOCITY METEOR SHOWER ENGINE (Falling Stars Cascade)
  // --------------------------------------------------------------------------
  function initMeteorShowerEngine() {
    const METEOR_COUNT = 8;

    for (let i = 0; i < METEOR_COUNT; i++) {
      const trailGeo = new THREE.BufferGeometry();
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -80)];
      trailGeo.setFromPoints(points);

      const trailMat = new THREE.LineBasicMaterial({
        color: 0x55f5ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const trailLine = new THREE.Line(trailGeo, trailMat);

      // Meteor head flare
      const headGeo = new THREE.SphereGeometry(2.0, 8, 8);
      const headMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      trailLine.add(headMesh);

      scene.add(trailLine);

      meteorList.push({
        line: trailLine,
        head: headMesh,
        active: false,
        pos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0,
        delayTimer: Math.random() * 4.0
      });
    }
  }

  function spawnMeteor(m) {
    // Pick random origin point on celestial sphere
    const r = 2400 + Math.random() * 800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    m.pos.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );

    // Random downward trajectory vector
    const speed = 400 + Math.random() * 350;
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      -0.6 - Math.random() * 0.8,
      (Math.random() - 0.5) * 2
    ).normalize();

    m.velocity.copy(dir.multiplyScalar(speed));
    m.life = 0;
    m.maxLife = 0.8 + Math.random() * 0.7;
    m.active = true;

    m.line.position.copy(m.pos);
    m.line.lookAt(m.pos.clone().add(m.velocity));
  }

  function updateMeteorShower(delta) {
    meteorList.forEach(m => {
      if (!m.active) {
        m.delayTimer -= delta;
        if (m.delayTimer <= 0) {
          spawnMeteor(m);
        }
      } else {
        m.life += delta;
        const progress = m.life / m.maxLife;

        // Move along velocity vector
        m.pos.addScaledVector(m.velocity, delta);
        m.line.position.copy(m.pos);

        // Alpha envelope: quick fade-in, long glowing decay
        let alpha = 0;
        if (progress < 0.2) alpha = progress / 0.2;
        else alpha = 1.0 - (progress - 0.2) / 0.8;

        m.line.material.opacity = alpha * 0.85;
        m.head.material.opacity = alpha;

        if (progress >= 1.0) {
          m.active = false;
          m.line.material.opacity = 0;
          m.head.material.opacity = 0;
          m.delayTimer = 1.5 + Math.random() * 3.5;
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 10. REALISTIC 3D JAGGED ASTEROID BELT (InstancedMesh)
  // --------------------------------------------------------------------------
  function addRealisticAsteroidBelt() {
    const asteroidCount = 1200;

    const baseGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const posAttr = baseGeo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      const noise = 1.0 + (Math.sin(v.x * 5.0) * Math.cos(v.y * 5.0) * Math.sin(v.z * 5.0)) * 0.35 + (Math.random() - 0.5) * 0.2;
      v.multiplyScalar(noise);
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }
    baseGeo.computeVertexNormals();

    const rockTex = loadRealTexture(REAL_TEXTURES.moon, true);
    const rockBump = loadRealTexture(REAL_TEXTURES.marsBump, false);

    const asteroidMat = new THREE.MeshStandardMaterial({
      map: rockTex,
      bumpMap: rockBump,
      bumpScale: 0.75,
      roughness: 0.9,
      metalness: 0.1,
      color: 0x948b81
    });

    asteroidInstancedMesh = new THREE.InstancedMesh(baseGeo, asteroidMat, asteroidCount);
    asteroidInstancedMesh.name = 'Asteroid Belt Instanced Rocks';

    const dummy = new THREE.Object3D();

    for (let i = 0; i < asteroidCount; i++) {
      const dist = 225 + (Math.random() - 0.5) * 48;
      const angle = Math.random() * Math.PI * 2;
      const ySpread = (Math.random() - 0.5) * 16;

      dummy.position.set(
        Math.cos(angle) * dist,
        ySpread,
        Math.sin(angle) * dist
      );

      const sx = 0.4 + Math.random() * 1.6;
      const sy = 0.3 + Math.random() * 1.4;
      const sz = 0.4 + Math.random() * 1.8;
      dummy.scale.set(sx, sy, sz);

      dummy.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      dummy.updateMatrix();
      asteroidInstancedMesh.setMatrixAt(i, dummy.matrix);
    }

    asteroidInstancedMesh.instanceMatrix.needsUpdate = true;
    systemGroup.add(asteroidInstancedMesh);
  }

  // --------------------------------------------------------------------------
  // 11. SATURN RINGS & 3D SPACECRAFT
  // --------------------------------------------------------------------------
  function createSaturnRings() {
    const ringTex = loadRealTexture(REAL_TEXTURES.saturnRing, true);
    const ringGeo = new THREE.RingGeometry(24, 48, 128);

    const pos = ringGeo.attributes.position;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      ringGeo.attributes.uv.setXY(i, (v3.length() - 24) / (48 - 24), 0.5);
    }

    const ringMat = new THREE.MeshPhongMaterial({
      map: ringTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
      shininess: 30
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    return ringMesh;
  }

  function buildRealisticSatelliteMesh(options = {}) {
    const satellite = new THREE.Group();
    satellite.name = options.name || 'Spacecraft';

    const goldFoilMat = new THREE.MeshPhongMaterial({
      color: 0xdeb841,
      emissive: 0x221703,
      specular: 0xfff5b8,
      shininess: 90
    });

    const titaniumMat = new THREE.MeshPhongMaterial({
      color: 0x475569,
      specular: 0x94a3b8,
      shininess: 60
    });

    const solarCellMat = new THREE.MeshPhongMaterial({
      color: 0x071e3d,
      emissive: 0x020d1c,
      specular: 0x00f0ff,
      shininess: 95
    });

    const dishMat = new THREE.MeshPhongMaterial({
      color: 0xf1f5f9,
      specular: 0xffffff,
      shininess: 80,
      side: THREE.DoubleSide
    });

    // 1. Central Avionics Bus
    const busGeo = new THREE.BoxGeometry(1.6, 1.0, 1.0);
    const busMesh = new THREE.Mesh(busGeo, goldFoilMat);
    satellite.add(busMesh);

    // Caps
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.15, 1.1), titaniumMat);
    topCap.position.y = 0.55;
    const botCap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.15, 1.1), titaniumMat);
    botCap.position.y = -0.55;
    satellite.add(topCap, botCap);

    // 2. Optical Sensor Lens
    const lensTubeGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.45, 16);
    const lensMat = new THREE.MeshPhongMaterial({
      color: options.hexColor || 0x00f0ff,
      emissive: 0x003355,
      specular: 0xffffff,
      shininess: 100
    });
    const lensTube = new THREE.Mesh(lensTubeGeo, lensMat);
    lensTube.rotation.x = Math.PI / 2;
    lensTube.position.set(0, 0, 0.6);
    satellite.add(lensTube);

    // 3. Parabolic Communications Dish
    const dishGroup = new THREE.Group();
    const dishGeo = new THREE.CylinderGeometry(0.75, 0.1, 0.25, 16, 1, true);
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI / 2;

    const feedMast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), titaniumMat);
    feedMast.rotation.x = Math.PI / 2;
    feedMast.position.z = 0.25;
    dishGroup.add(dishMesh, feedMast);
    dishGroup.position.set(0, -0.5, 0.3);
    dishGroup.rotation.x = Math.PI / 5;
    satellite.add(dishGroup);

    // 4. Solar Wings
    const solarWingLeft = new THREE.Group();
    const solarWingRight = new THREE.Group();

    const boomLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), goldFoilMat);
    boomLeft.rotation.z = Math.PI / 2;
    boomLeft.position.x = -0.7;

    const panelLeftGeo = new THREE.BoxGeometry(2.6, 0.9, 0.06);
    const panelLeft = new THREE.Mesh(panelLeftGeo, solarCellMat);
    panelLeft.position.x = -2.3;

    const navLedLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3b30 })
    );
    navLedLeft.position.set(-3.7, 0.4, 0);
    solarWingLeft.add(boomLeft, panelLeft, navLedLeft);

    const boomRight = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), goldFoilMat);
    boomRight.rotation.z = Math.PI / 2;
    boomRight.position.x = 0.7;

    const panelRightGeo = new THREE.BoxGeometry(2.6, 0.9, 0.06);
    const panelRight = new THREE.Mesh(panelRightGeo, solarCellMat);
    panelRight.position.x = 2.3;

    const navLedRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: options.hexColor || 0x00f0ff })
    );
    navLedRight.position.set(3.7, 0.4, 0);
    solarWingRight.add(boomRight, panelRight, navLedRight);

    satellite.add(solarWingLeft, solarWingRight);

    // 5. Thruster Bell & Ion Plume
    const thrusterBell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.35, 0.3, 12), titaniumMat);
    thrusterBell.rotation.x = Math.PI / 2;
    thrusterBell.position.set(0, 0, -0.6);

    const ionPlume = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.8, 12),
      new THREE.MeshBasicMaterial({
        color: options.hexColor || 0x00f0ff,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      })
    );
    ionPlume.rotation.x = -Math.PI / 2;
    ionPlume.position.set(0, 0, -1.1);
    satellite.add(thrusterBell, ionPlume);

    // 6. Conical Telemetry Radar Beam
    const radarBeam = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 9, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: options.hexColor || 0x00f0ff,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    radarBeam.rotation.x = Math.PI / 2;
    radarBeam.position.set(0, 0, 5.5);
    satellite.add(radarBeam);

    return satellite;
  }

  // --------------------------------------------------------------------------
  // 12. CRISS-CROSSING 3D KEPLERIAN ORBIT CALCULATION
  // --------------------------------------------------------------------------
  function computeOrbitPoint3D(radius, incRad, raanRad, theta) {
    const xp = radius * Math.cos(theta);
    const yp = radius * Math.sin(theta);

    const x = xp * Math.cos(raanRad) - yp * Math.cos(incRad) * Math.sin(raanRad);
    const y = yp * Math.sin(incRad);
    const z = xp * Math.sin(raanRad) + yp * Math.cos(incRad) * Math.cos(raanRad);

    return new THREE.Vector3(x, y, z);
  }

  function createOrbitRibbon(radius, incDeg, raanDeg, colorHex) {
    const points = [];
    const segments = 96;
    const incRad = THREE.MathUtils.degToRad(incDeg || 0);
    const raanRad = THREE.MathUtils.degToRad(raanDeg || 0);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(computeOrbitPoint3D(radius, incRad, raanRad, theta));
    }

    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({
      color: colorHex || 0x00f0ff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Line(orbitGeo, orbitMat);
  }

  function createFloatingLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(4, 8, 22, 0.78)';
    ctx.strokeStyle = color || '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(16, 4, 1);
    return sprite;
  }

  // --------------------------------------------------------------------------
  // 13. BUILD PHOTOREALISTIC CELESTIAL HIERARCHY
  // --------------------------------------------------------------------------
  function buildSolarHierarchy() {
    // 1. Hyper-Realistic Dynamic Plasma Sun
    const sunData = BODIES.sun;
    const sunTex = loadRealTexture(REAL_TEXTURES.sun, true);
    const sunGeo = new THREE.SphereGeometry(sunData.radius, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      color: 0xffffff
    });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.name = sunData.name;

    // Glowing Multi-Tier Sun Corona Halo
    const coronaGeo = new THREE.SphereGeometry(sunData.radius * 1.38, 32, 32);
    const coronaMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        glowColor: { value: new THREE.Color(0xffaa22) },
        power: { value: 2.8 },
        intensity: { value: 1.8 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float power;
        uniform float intensity;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          float glow = pow(rim, power) * intensity;
          gl_FragColor = vec4(glowColor, glow);
        }
      `
    });
    sunCoronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunMesh.add(sunCoronaMesh);

    const sunLabel = createFloatingLabel('SUN', '#ffb347');
    sunLabel.position.set(0, sunData.radius + 14, 0);
    sunMesh.add(sunLabel);

    systemGroup.add(sunMesh);
    meshCatalog.set('sun', { mesh: sunMesh, group: sunMesh, bodyData: sunData, labelSprite: sunLabel });

    // 2. Planets, Moons, and Satellites with Photorealistic Materials
    Object.values(BODIES).forEach(body => {
      if (body.id === 'sun') return;

      const bodyGroup = new THREE.Group();
      bodyGroup.name = `Group: ${body.name}`;

      const orbitLine = createOrbitRibbon(body.dist, body.inc_deg, body.raan_deg, body.hexColor);
      orbitLine.name = `Orbit: ${body.name}`;

      let mesh;
      if (body.type === 'satellite') {
        mesh = buildRealisticSatelliteMesh(body);
        mesh.scale.set(0.65, 0.65, 0.65);
        satelliteMeshList.push({
          mesh,
          bodyData: body,
          parentGroup: bodyGroup,
          theta: Math.random() * Math.PI * 2
        });
      } else {
        const geo = new THREE.SphereGeometry(body.radius, 64, 64);
        let mat;

        if (body.id === 'earth') {
          const earthDayTex = loadRealTexture(REAL_TEXTURES.earth, true);
          const earthNormalTex = loadRealTexture(REAL_TEXTURES.earthNormal, false);
          const earthSpecTex = loadRealTexture(REAL_TEXTURES.earthSpecular, false);

          mat = new THREE.MeshPhongMaterial({
            map: earthDayTex,
            normalMap: earthNormalTex,
            normalScale: new THREE.Vector2(0.85, 0.85),
            specularMap: earthSpecTex,
            specular: new THREE.Color(0x38bdf8),
            shininess: 15
          });
          mesh = new THREE.Mesh(geo, mat);

          const cloudTex = loadRealTexture(REAL_TEXTURES.earthClouds, true);
          const cloudGeo = new THREE.SphereGeometry(body.radius * 1.018, 64, 64);
          const cloudMat = new THREE.MeshPhongMaterial({
            map: cloudTex,
            transparent: true,
            opacity: 0.62,
            depthWrite: false
          });
          earthCloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
          mesh.add(earthCloudsMesh);

          const atmoGeo = new THREE.SphereGeometry(body.radius * 1.08, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.22,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
          });
          const atmo = new THREE.Mesh(atmoGeo, atmoMat);
          mesh.add(atmo);

        } else if (body.id === 'moon') {
          const moonTex = loadRealTexture(REAL_TEXTURES.moon, true);
          mat = new THREE.MeshPhongMaterial({
            map: moonTex,
            shininess: 5
          });
          mesh = new THREE.Mesh(geo, mat);

        } else if (body.id === 'mercury') {
          const mercTex = loadRealTexture(REAL_TEXTURES.mercury, true);
          const mercBump = loadRealTexture(REAL_TEXTURES.mercuryBump, false);
          mat = new THREE.MeshPhongMaterial({
            map: mercTex,
            bumpMap: mercBump,
            bumpScale: 0.45,
            shininess: 10
          });
          mesh = new THREE.Mesh(geo, mat);

        } else if (body.id === 'venus') {
          const venusTex = loadRealTexture(REAL_TEXTURES.venus, true);
          const venusBump = loadRealTexture(REAL_TEXTURES.venusBump, false);
          mat = new THREE.MeshPhongMaterial({
            map: venusTex,
            bumpMap: venusBump,
            bumpScale: 0.35,
            shininess: 15
          });
          mesh = new THREE.Mesh(geo, mat);

          const atmoGeo = new THREE.SphereGeometry(body.radius * 1.07, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: 0xffb347,
            transparent: true,
            opacity: 0.25,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
          });
          mesh.add(new THREE.Mesh(atmoGeo, atmoMat));

        } else if (body.id === 'mars') {
          const marsTex = loadRealTexture(REAL_TEXTURES.mars, true);
          const marsBump = loadRealTexture(REAL_TEXTURES.marsBump, false);
          mat = new THREE.MeshPhongMaterial({
            map: marsTex,
            bumpMap: marsBump,
            bumpScale: 0.55,
            shininess: 12
          });
          mesh = new THREE.Mesh(geo, mat);

          const atmoGeo = new THREE.SphereGeometry(body.radius * 1.06, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
          });
          mesh.add(new THREE.Mesh(atmoGeo, atmoMat));

        } else if (body.id === 'jupiter') {
          const jupTex = loadRealTexture(REAL_TEXTURES.jupiter, true);
          mat = new THREE.MeshPhongMaterial({
            map: jupTex,
            shininess: 18
          });
          mesh = new THREE.Mesh(geo, mat);

          const atmoGeo = new THREE.SphereGeometry(body.radius * 1.04, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: 0xffc87a,
            transparent: true,
            opacity: 0.18,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
          });
          mesh.add(new THREE.Mesh(atmoGeo, atmoMat));

        } else if (body.id === 'saturn') {
          const satTex = loadRealTexture(REAL_TEXTURES.saturn, true);
          mat = new THREE.MeshPhongMaterial({
            map: satTex,
            shininess: 18
          });
          mesh = new THREE.Mesh(geo, mat);

          const rings = createSaturnRings();
          mesh.add(rings);

        } else if (body.id === 'uranus') {
          const uraTex = loadRealTexture(REAL_TEXTURES.uranus, true);
          mat = new THREE.MeshPhongMaterial({
            map: uraTex,
            shininess: 15
          });
          mesh = new THREE.Mesh(geo, mat);

          const atmoGeo = new THREE.SphereGeometry(body.radius * 1.05, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x7fffd4,
            transparent: true,
            opacity: 0.22,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
          });
          mesh.add(new THREE.Mesh(atmoGeo, atmoMat));

        } else if (body.id === 'neptune') {
          const nepTex = loadRealTexture(REAL_TEXTURES.neptune, true);
          mat = new THREE.MeshPhongMaterial({
            map: nepTex,
            shininess: 20
          });
          mesh = new THREE.Mesh(geo, mat);

          const atmoGeo = new THREE.SphereGeometry(body.radius * 1.05, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x4169e1,
            transparent: true,
            opacity: 0.25,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending
          });
          mesh.add(new THREE.Mesh(atmoGeo, atmoMat));

        } else if (body.id === 'pluto') {
          const pluTex = loadRealTexture(REAL_TEXTURES.pluto, true);
          const pluBump = loadRealTexture(REAL_TEXTURES.plutoBump, false);
          mat = new THREE.MeshPhongMaterial({
            map: pluTex,
            bumpMap: pluBump,
            bumpScale: 0.35,
            shininess: 8
          });
          mesh = new THREE.Mesh(geo, mat);

        } else {
          const moonTex = loadRealTexture(REAL_TEXTURES.moon, true);
          mat = new THREE.MeshPhongMaterial({
            map: moonTex,
            color: new THREE.Color(body.hexColor),
            shininess: body.id === 'europa' || body.id === 'enceladus' ? 35 : 10
          });
          mesh = new THREE.Mesh(geo, mat);
        }

        mesh.rotation.z = THREE.MathUtils.degToRad(body.tilt_deg || 0);
      }

      mesh.name = body.name;

      let labelSprite = null;
      if (body.type === 'planet' || body.type === 'dwarf') {
        labelSprite = createFloatingLabel(body.name.toUpperCase(), body.color);
        labelSprite.position.set(0, body.radius + 6, 0);
        bodyGroup.add(labelSprite);
      }

      bodyGroup.add(mesh);

      const parentEntry = meshCatalog.get(body.parent);
      if (parentEntry) {
        parentEntry.group.add(bodyGroup);
        parentEntry.group.add(orbitLine);
      } else {
        systemGroup.add(bodyGroup);
        systemGroup.add(orbitLine);
      }

      meshCatalog.set(body.id, {
        mesh,
        group: bodyGroup,
        bodyData: body,
        orbitLine,
        labelSprite,
        theta: Math.random() * Math.PI * 2
      });
    });
  }

  function getBodyBadgeHtml(body, sizeClass = '') {
    if (!body) return '';
    if (body.type === 'star' || body.type === 'planet' || body.type === 'dwarf' || body.type === 'moon') {
      return `<span class="planet-pic-badge planet-pic-badge--${body.id} ${sizeClass}"></span>`;
    }
    return `<span style="font-size: 0.85rem; color: ${body.color};">🛰</span>`;
  }

  // --------------------------------------------------------------------------
  // 14. UI SIDEBAR TREE & METRICS
  // --------------------------------------------------------------------------
  function buildSidebarTree() {
    const treeEl = document.getElementById('solar-tree');
    if (!treeEl) return;
    treeEl.innerHTML = '';

    const planetList = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

    planetList.forEach(planetId => {
      const p = BODIES[planetId];
      if (!p) return;

      const node = document.createElement('div');
      node.className = `tree-node ${p.id === currentTargetId ? 'is-active' : ''} is-expanded`;
      node.id = `tree-node-${p.id}`;

      const directChildren = Object.values(BODIES).filter(b => b.parent === p.id);

      node.innerHTML = `
        <div class="tree-card" data-jump-id="${p.id}">
          ${getBodyBadgeHtml(p)}
          <div class="tree-body-info">
            <span class="tree-name">${p.name}</span>
            <span class="tree-sub">${directChildren.length > 0 ? `${directChildren.length} BODIES IN ORBIT` : p.semiMajor}</span>
          </div>
          ${directChildren.length > 0 ? `<span class="tree-expander">▸</span>` : ''}
        </div>
      `;

      if (directChildren.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'tree-children';

        directChildren.forEach(c => {
          const childNode = document.createElement('div');
          childNode.className = `tree-node ${c.id === currentTargetId ? 'is-active' : ''}`;
          childNode.id = `tree-node-${c.id}`;

          const grandChildren = Object.values(BODIES).filter(b => b.parent === c.id);
          const agencyClass = c.agency.includes('ISRO') ? 'agency-chip--isro' : c.agency.includes('ESA') ? 'agency-chip--esa' : '';

          childNode.innerHTML = `
            <div class="tree-child-card" data-jump-id="${c.id}">
              ${getBodyBadgeHtml(c, 'planet-pic-badge--sm')}
              <span class="tree-name" style="font-size: 0.74rem;">${c.name}</span>
              ${c.type === 'satellite' ? `<span class="agency-chip ${agencyClass}">${c.agency.split(' ')[0]}</span>` : ''}
            </div>
          `;

          if (grandChildren.length > 0) {
            const grandContainer = document.createElement('div');
            grandContainer.className = 'tree-children';
            grandChildren.forEach(gc => {
              const gcNode = document.createElement('div');
              gcNode.className = 'tree-child-card';
              gcNode.dataset.jumpId = gc.id;
              const gcAgencyClass = gc.agency && gc.agency.includes('ISRO') ? 'agency-chip--isro' : (gc.agency && gc.agency.includes('ESA') ? 'agency-chip--esa' : '');
              gcNode.innerHTML = `
                ${getBodyBadgeHtml(gc, 'planet-pic-badge--sm')}
                <span class="tree-name" style="font-size: 0.72rem;">${gc.name}</span>
                ${gc.type === 'satellite' ? `<span class="agency-chip ${gcAgencyClass}">${gc.agency.split(' ')[0]}</span>` : ''}
              `;
              grandContainer.appendChild(gcNode);
            });
            childNode.appendChild(grandContainer);
          }

          childContainer.appendChild(childNode);
        });

        node.appendChild(childContainer);
      }

      treeEl.appendChild(node);
    });

    treeEl.addEventListener('click', function (e) {
      const card = e.target.closest('[data-jump-id]');
      if (!card) return;
      const id = card.dataset.jumpId;
      selectBody(id);
    });

    const toggleAllBtn = document.getElementById('sidebar-toggle-all');
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', function () {
        const nodes = document.querySelectorAll('.tree-node');
        const anyExpanded = Array.from(nodes).some(n => n.classList.contains('is-expanded'));
        nodes.forEach(n => {
          if (anyExpanded) n.classList.remove('is-expanded');
          else n.classList.add('is-expanded');
        });
      });
    }
  }

  // --------------------------------------------------------------------------
  // 15. DYNAMIC REAL-TIME TARGET TRACKING & SELECTION
  // --------------------------------------------------------------------------
  function selectBody(bodyId, forcedMode) {
    const data = BODIES[bodyId];
    if (!data) return;

    currentTargetId = bodyId;

    if (forcedMode) {
      currentViewMode = forcedMode;
    } else {
      if (data.id === 'sun') currentViewMode = 'system';
      else if (data.type === 'planet' || data.type === 'dwarf') currentViewMode = 'planet';
      else currentViewMode = 'detail';
    }

    triggerWarpTransition();

    if (currentViewMode === 'system') {
      focusTracking.targetOrbitRadius = 950;
      focusTracking.elevation = 0.35;
    } else if (currentViewMode === 'planet') {
      focusTracking.targetOrbitRadius = data.radius * 3.6 + 12;
      focusTracking.elevation = 0.22;
    } else {
      focusTracking.targetOrbitRadius = data.radius * 4.8 + 6;
      focusTracking.elevation = 0.18;
    }

    updateCommandRailUI();
    updateTelemetryMatrixUI(data);
    updateSidebarActiveState(bodyId);
    updateQuickPlanetBar(bodyId);
  }

  function triggerWarpTransition() {
    const warpEl = document.getElementById('solar-warp-overlay');
    if (!warpEl) return;
    warpEl.classList.add('is-warping');
    isWarping = true;
    setTimeout(() => {
      warpEl.classList.remove('is-warping');
      isWarping = false;
    }, 400);
  }

  function updateCommandRailUI() {
    const modeTabs = document.querySelectorAll('.solar-mode-btn');
    const indicator = document.getElementById('solar-mode-indicator');
    modeTabs.forEach(tab => {
      const isActive = tab.dataset.viewMode === currentViewMode;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive && indicator) {
        indicator.style.left = `${tab.offsetLeft}px`;
        indicator.style.width = `${tab.offsetWidth}px`;
      }
    });

    const trailEl = document.getElementById('solar-bc-trail');
    const data = BODIES[currentTargetId];
    if (trailEl && data) {
      if (data.id === 'sun') {
        trailEl.innerHTML = `<button type="button" class="solar-bc-crumb" data-jump-id="sun">Solar System</button>`;
      } else if (data.type === 'planet' || data.type === 'dwarf') {
        trailEl.innerHTML = `
          <button type="button" class="solar-bc-crumb" data-jump-id="sun">Solar System</button>
          <span class="solar-bc-sep">›</span>
          <button type="button" class="solar-bc-crumb" data-jump-id="${data.id}">${data.name}</button>
        `;
      } else {
        const parentData = BODIES[data.parent];
        trailEl.innerHTML = `
          <button type="button" class="solar-bc-crumb" data-jump-id="sun">Solar System</button>
          <span class="solar-bc-sep">›</span>
          <button type="button" class="solar-bc-crumb" data-jump-id="${parentData ? parentData.id : 'sun'}">${parentData ? parentData.name : 'Orbit'}</button>
          <span class="solar-bc-sep">›</span>
          <button type="button" class="solar-bc-crumb" data-jump-id="${data.id}">${data.name}</button>
        `;
      }

      trailEl.querySelectorAll('.solar-bc-crumb').forEach(btn => {
        btn.addEventListener('click', () => selectBody(btn.dataset.jumpId));
      });
    }
  }

  function updateTelemetryMatrixUI(data) {
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const formatter = window.NebulonFormatters;
    const telemetry = formatter && typeof formatter.formatPlanetaryTelemetry === 'function'
      ? formatter.formatPlanetaryTelemetry(data)
      : null;
    const formatDeg = formatter && typeof formatter.formatDegrees === 'function'
      ? formatter.formatDegrees
      : (value) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(3)}°` : '—';
    const formatKm = formatter && typeof formatter.formatKm === 'function'
      ? formatter.formatKm
      : (value) => Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} km` : '—';

    const glyphEl = document.getElementById('hud-glyph');
    if (glyphEl) {
      if (data.type === 'star' || data.type === 'planet' || data.type === 'dwarf' || data.type === 'moon') {
        glyphEl.innerHTML = `<span class="planet-pic-badge planet-pic-badge--${data.id} planet-pic-badge--lg"></span>`;
      } else {
        glyphEl.innerHTML = `<span style="font-size: 1.5rem; color: ${data.color};">${data.glyph}</span>`;
      }
    }

    setTxt('hud-body-name', data.name.toUpperCase());
    setTxt('hud-body-sub', data.desc);
    setTxt('hud-tag-class', data.type.toUpperCase());
    setTxt('hud-orb-val', telemetry ? telemetry.orbital : `a: ${data.semiMajor} · e: ${data.ecc}`);
    setTxt('hud-orb-sub', `i: ${formatDeg(data.inc_deg)} · Ω: ${formatDeg(data.raan_deg)} · Period: ${data.period || '—'}`);

    const radiusKm = Number.isFinite(Number(data.meanRadiusKm)) ? formatKm(data.meanRadiusKm) : '—';
    setTxt('hud-phys-val', `Radius: ${radiusKm}`);
    setTxt('hud-phys-sub', `Mass: ${data.mass || '—'} · Gravity: ${data.gravity || '—'} · Tilt: ${formatDeg(data.tilt_deg)}`);
    setTxt('hud-tag-scale', data.mass || '—');

    setTxt('hud-mission-val', data.status);
    setTxt('hud-mission-sub', data.statusDetail);
    setTxt('hud-agency-val', data.agency);
    setTxt('hud-agency-sub', telemetry ? telemetry.provenance : (data.sourceTier || 'Catalog fallback'));

    const spatial = telemetry ? telemetry.spatial : `${(data.dist * 0.008).toFixed(2)} AU from Sun`;
    const speed = telemetry && telemetry.speed !== '—' ? telemetry.speed : `${(data.orb_speed * 120).toFixed(1)} km/s`;
    setTxt('hud-spatial-val', spatial);
    setTxt('hud-spatial-sub', `Orbital Speed: ${speed}`);

    const pods = document.querySelectorAll('.telemetry-pod');
    pods.forEach(pod => { pod.style.borderLeftColor = data.color; });
  }

  function updateSidebarActiveState(bodyId) {
    document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('is-active'));
    const activeNode = document.getElementById(`tree-node-${bodyId}`);
    if (activeNode) {
      activeNode.classList.add('is-active');
      activeNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function updateQuickPlanetBar(bodyId) {
    document.querySelectorAll('.quick-planet-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.bodyId === bodyId);
    });
  }

  // --------------------------------------------------------------------------
  // 16. USER INTERACTION & CONTROLS (With Cursor Dynamic Depth Tracking)
  // --------------------------------------------------------------------------
  function setupInteraction(container) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Track Cursor for Moving Parallax Stars
    window.addEventListener('pointermove', function (e) {
      cursorParallax.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      cursorParallax.targetY = (e.clientY / window.innerHeight - 0.5) * 2;

      if (interaction.isDragging) {
        const dx = e.clientX - interaction.prevX;
        const dy = e.clientY - interaction.prevY;
        interaction.prevX = e.clientX;
        interaction.prevY = e.clientY;

        focusTracking.azimuth -= dx * 0.005;
        focusTracking.elevation = Math.max(-1.4, Math.min(1.4, focusTracking.elevation + dy * 0.005));
      }
    });

    container.addEventListener('pointerdown', function (e) {
      interaction.isDragging = true;
      interaction.prevX = e.clientX;
      interaction.prevY = e.clientY;
    });

    window.addEventListener('pointerup', function () {
      interaction.isDragging = false;
    });

    container.addEventListener('wheel', function (e) {
      e.preventDefault();
      const zoomFactor = e.deltaY * (focusTracking.targetOrbitRadius * 0.0015 + 0.2);
      focusTracking.targetOrbitRadius = Math.max(
        focusTracking.minRadius,
        Math.min(focusTracking.maxRadius, focusTracking.targetOrbitRadius + zoomFactor)
      );
    }, { passive: false });

    container.addEventListener('click', function (e) {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.offsetWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.offsetHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const interactableMeshes = [];
      meshCatalog.forEach((val) => {
        if (val.mesh) interactableMeshes.push(val.mesh);
      });

      const intersects = raycaster.intersectObjects(interactableMeshes, true);
      if (intersects.length > 0) {
        let hitObj = intersects[0].object;
        while (hitObj.parent && !hitObj.name && hitObj !== scene) {
          hitObj = hitObj.parent;
        }

        for (const [id, val] of meshCatalog.entries()) {
          if (val.mesh === hitObj || (val.mesh && val.mesh.children.includes(hitObj))) {
            selectBody(id);
            break;
          }
        }
      }
    });
  }

  function setupCommandRail() {
    document.querySelectorAll('.solar-mode-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const mode = this.dataset.viewMode;
        if (mode === 'system') selectBody('sun', 'system');
        else if (mode === 'planet') {
          const current = BODIES[currentTargetId];
          const planetId = (current && (current.type === 'planet' || current.type === 'dwarf')) ? current.id : (current ? current.parent : 'earth');
          selectBody(planetId || 'earth', 'planet');
        } else {
          selectBody(currentTargetId, 'detail');
        }
      });
    });

    document.querySelectorAll('.quick-planet-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        selectBody(this.dataset.bodyId);
      });
    });
  }

  function setupSearchModal() {
    const searchBtn = document.getElementById('solar-search-btn');
    const modal = document.getElementById('solar-search-modal');
    const input = document.getElementById('solar-search-input');
    const resultsEl = document.getElementById('solar-search-results');
    const closeBtn = document.getElementById('solar-search-close');

    if (!modal || !input || !resultsEl) return;

    function openSearch() {
      modal.showModal();
      input.value = '';
      renderSearchResults('');
      input.focus();
    }

    function closeSearch() {
      modal.close();
    }

    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSearch();
    });

    input.addEventListener('input', (e) => {
      renderSearchResults(e.target.value.trim().toLowerCase());
    });

    function renderSearchResults(query) {
      resultsEl.innerHTML = '';
      const matches = Object.values(BODIES).filter(b => {
        if (!query) return true;
        return b.name.toLowerCase().includes(query) ||
               b.agency.toLowerCase().includes(query) ||
               b.desc.toLowerCase().includes(query) ||
               b.type.toLowerCase().includes(query);
      });

      matches.slice(0, 12).forEach(m => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <div class="result-main">
            ${(m.type === 'star' || m.type === 'planet' || m.type === 'dwarf' || m.type === 'moon') ? `<span class="planet-pic-badge planet-pic-badge--${m.id}"></span>` : `<span style="font-size: 1.1rem; color: ${m.color};">${m.glyph}</span>`}
            <div>
              <div class="result-name">${m.name}</div>
              <div class="result-parent">${m.type.toUpperCase()} · ${m.agency}</div>
            </div>
          </div>
          <span style="font-family: var(--n-font-mono); font-size: 0.68rem; color: var(--n-cyan);">JUMP ⏵</span>
        `;
        item.addEventListener('click', () => {
          selectBody(m.id);
          closeSearch();
        });
        resultsEl.appendChild(item);
      });
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    });
  }

  function setupKeyboardShortcuts() {
    const keyPlanetMap = {
      '1': 'sun',
      '2': 'mercury',
      '3': 'venus',
      '4': 'earth',
      '5': 'mars',
      '6': 'jupiter',
      '7': 'saturn',
      '8': 'uranus',
      '9': 'neptune',
      '0': 'pluto'
    };

    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      if (keyPlanetMap[e.key]) {
        selectBody(keyPlanetMap[e.key]);
      } else if (e.key === 'Escape') {
        selectBody('sun', 'system');
      }
    });
  }

  function handleResize() {
    const container = document.getElementById('solar-canvas-container');
    if (!container || !renderer || !camera) return;
    camera.aspect = container.offsetWidth / container.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.offsetWidth, container.offsetHeight);
  }

  // --------------------------------------------------------------------------
  // 17. ANIMATION & 60FPS RENDER LOOP (Deep Space & Meteor Showers)
  // --------------------------------------------------------------------------
  function animate(now) {
    requestAnimationFrame(animate);

    const delta = (now - lastFrameTime) * 0.001;
    lastFrameTime = now;

    // 1. Advance Orbital Positions of All Planets, Moons & Satellites (Untouched)
    meshCatalog.forEach((item) => {
      if (item.bodyData.id !== 'sun') {
        item.theta += item.bodyData.orb_speed * delta * 0.6;
        const pt = computeOrbitPoint3D(
          item.bodyData.dist,
          THREE.MathUtils.degToRad(item.bodyData.inc_deg),
          THREE.MathUtils.degToRad(item.bodyData.raan_deg),
          item.theta
        );
        item.group.position.copy(pt);
      }

      if (item.mesh && item.bodyData.type !== 'satellite') {
        item.mesh.rotation.y += item.bodyData.rot_speed;
      }
    });

    // 2. Earth Clouds Rotation
    if (earthCloudsMesh) {
      earthCloudsMesh.rotation.y += 0.008;
    }

    // 3. Spacecraft Criss-Crossing Movements
    satelliteMeshList.forEach((sat) => {
      sat.theta += sat.bodyData.orb_speed * delta * 1.5;
      const pt = computeOrbitPoint3D(
        sat.bodyData.dist,
        THREE.MathUtils.degToRad(sat.bodyData.inc_deg),
        THREE.MathUtils.degToRad(sat.bodyData.raan_deg),
        sat.theta
      );
      sat.mesh.position.copy(pt);
      sat.mesh.rotation.z += 0.01;
    });

    // 4. Asteroid Belt Rotation
    if (asteroidInstancedMesh) {
      asteroidInstancedMesh.rotation.y += 0.0003;
    }

    // 5. Sun Corona Pulse
    if (sunCoronaMesh) {
      sunCoronaMesh.rotation.z += 0.001;
    }

    // 6. CURSOR ACTIVE PARALLAX STARS MOVEMENT
    cursorParallax.screenX += (cursorParallax.targetX - cursorParallax.screenX) * 0.05;
    cursorParallax.screenY += (cursorParallax.targetY - cursorParallax.screenY) * 0.05;

    if (parallaxStarsPoints) {
      parallaxStarsPoints.rotation.y = cursorParallax.screenX * 0.06;
      parallaxStarsPoints.rotation.x = -cursorParallax.screenY * 0.06;
    }
    if (deepStarsPoints) {
      deepStarsPoints.rotation.y = cursorParallax.screenX * 0.015;
      deepStarsPoints.rotation.x = -cursorParallax.screenY * 0.015;
    }
    if (constellationGroup) {
      constellationGroup.rotation.y = cursorParallax.screenX * 0.02;
      constellationGroup.rotation.x = -cursorParallax.screenY * 0.02;
    }

    // 7. HYPERVELOCITY METEOR SHOWER CASCADE
    updateMeteorShower(delta);

    // 8. CONTINUOUS DYNAMIC TARGET TRACKING
    const targetEntry = meshCatalog.get(currentTargetId);
    if (targetEntry) {
      if (currentTargetId === 'sun') {
        tempTargetWorldPos.set(0, 0, 0);
      } else {
        const targetObj = targetEntry.mesh || targetEntry.group;
        targetObj.getWorldPosition(tempTargetWorldPos);
      }
    } else {
      tempTargetWorldPos.set(0, 0, 0);
    }

    focusTracking.orbitRadius += (focusTracking.targetOrbitRadius - focusTracking.orbitRadius) * 0.08;

    const cosEl = Math.cos(focusTracking.elevation);
    const sinEl = Math.sin(focusTracking.elevation);
    const cosAz = Math.cos(focusTracking.azimuth);
    const sinAz = Math.sin(focusTracking.azimuth);

    const desiredCamX = tempTargetWorldPos.x + focusTracking.orbitRadius * cosEl * sinAz;
    const desiredCamY = tempTargetWorldPos.y + focusTracking.orbitRadius * sinEl;
    const desiredCamZ = tempTargetWorldPos.z + focusTracking.orbitRadius * cosEl * cosAz;

    cameraCurrentLook.x += (tempTargetWorldPos.x - cameraCurrentLook.x) * 0.08;
    cameraCurrentLook.y += (tempTargetWorldPos.y - cameraCurrentLook.y) * 0.08;
    cameraCurrentLook.z += (tempTargetWorldPos.z - cameraCurrentLook.z) * 0.08;

    cameraCurrentPos.x += (desiredCamX - cameraCurrentPos.x) * 0.08;
    cameraCurrentPos.y += (desiredCamY - cameraCurrentPos.y) * 0.08;
    cameraCurrentPos.z += (desiredCamZ - cameraCurrentPos.z) * 0.08;

    camera.position.copy(cameraCurrentPos);
    camera.lookAt(cameraCurrentLook);

    // 9. Render 3D Scene
    renderer.render(scene, camera);

    // 10. Update Right HUD Telemetry
    frameCount++;
    if (now - fpsTimer > 1000) {
      const fpsEl = document.getElementById('hud-fps-val');
      if (fpsEl) fpsEl.textContent = `${frameCount} FPS`;
      frameCount = 0;
      fpsTimer = now;

      const posEl = document.getElementById('hud-cam-pos');
      const lookEl = document.getElementById('hud-look-at');
      const rangeEl = document.getElementById('hud-target-range');
      if (posEl) posEl.textContent = `${cameraCurrentPos.x.toFixed(1)}, ${cameraCurrentPos.y.toFixed(1)}, ${cameraCurrentPos.z.toFixed(1)}`;
      if (lookEl) lookEl.textContent = `${cameraCurrentLook.x.toFixed(1)}, ${cameraCurrentLook.y.toFixed(1)}, ${cameraCurrentLook.z.toFixed(1)}`;
      if (rangeEl) {
        const d = cameraCurrentPos.distanceTo(cameraCurrentLook);
        rangeEl.textContent = `${(d * 0.004).toFixed(2)} AU`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 18. BOOTSTRAP
  // --------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
