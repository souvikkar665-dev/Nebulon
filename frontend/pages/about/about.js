/**
 * NEBULON PROTOCOL COMMAND CENTER CONTROLLER
 * NASA 2070 & JARVIS HUD SCI-FI SPECIFICATION
 * Manages 18 Worldwide & Autonomous Engine Protocols, Interactive Packet HUD,
 * Hex Stream Decoder, Real-time Handshake Telemetry Stream, and Export Engine.
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // PROTOCOL CATALOG DATA (18 Global & Internal Autonomous Protocols)
  // --------------------------------------------------------------------------
  const PROTOCOLS = [
    {
      id: 'CCSDS-502',
      domain: 'ccsds',
      authority: 'CCSDS / ISO',
      title: 'Orbit Data Messages (ODM)',
      name: 'CCSDS 502.0-B-3 / ISO 26900 Orbit Data Messages',
      desc: 'Standardizes exchange formats for orbital trajectories, including Orbit Parameter Messages (OPM), Orbit Ephemeris Messages (OEM), and Orbit Mean-Elements Messages (OMM).',
      latency: 'Real-time / Pass',
      cadence: 'Ephemeris Epoch (Hourly)',
      cipher: 'SHA-256 Checksum',
      compliance: 'ISO 26900 Certified',
      packetAnatomy: [
        { name: 'CCSDS_HDR', bytes: '6 Bytes' },
        { name: 'META_FRAME', bytes: '18 Bytes' },
        { name: 'KEPLER_STATE', bytes: '48 Bytes' },
        { name: 'CRC_CHKSUM', bytes: '4 Bytes' }
      ],
      hexSample: '1A 5C 88 01 00 2C 5F 89 20 26 09 06 14 28 00 00 48 F2 11 A0 7E 3D 00 12 B9 88 C4 10 99 AA FC 01',
      wireSpecSample: {
        standard: 'CCSDS 502.0-B-3',
        format: 'XML / KVN',
        object_id: 'NORAD 56987',
        epoch: '2026-09-06T14:28:00.000Z',
        reference_frame: 'EME2000',
        semi_major_axis_km: 6912.45,
        eccentricity: 0.00142,
        inclination_deg: 97.482
      }
    },
    {
      id: 'CCSDS-503',
      domain: 'ccsds',
      authority: 'CCSDS',
      title: 'Tracking Data Message (TDM)',
      name: 'CCSDS 503.0-B-2 Tracking Data Message Protocol',
      desc: 'Specifies ground tracking station observables including two-way coherent range, Doppler carrier frequency shifts, and antenna Azimuth/Elevation angles.',
      latency: '12.4 ms',
      cadence: '1 Hz Tracking Cadence',
      cipher: 'HMAC-SHA256',
      compliance: 'CCSDS Blue Book',
      packetAnatomy: [
        { name: 'TDM_SYNC', bytes: '8 Bytes' },
        { name: 'STATION_ID', bytes: '12 Bytes' },
        { name: 'DOPPLER_IQ', bytes: '64 Bytes' },
        { name: 'INTEGRITY', bytes: '8 Bytes' }
      ],
      hexSample: '7E 42 00 02 01 88 44 91 00 8E 53 76 61 6C 62 61 72 64 00 24 16 02 FF 48 3B 00 1A CE 40 88 EF 90',
      wireSpecSample: {
        standard: 'CCSDS 503.0-B-2',
        station_id: 'SATNOGS-STATION-142',
        carrier_freq_mhz: 437.450,
        doppler_shift_hz: -4820.5,
        elevation_deg: 42.8,
        snr_db: 18.4
      }
    },
    {
      id: 'CCSDS-505',
      domain: 'ccsds',
      authority: 'CCSDS / Space Command',
      title: 'Conjunction Data Message (CDM)',
      name: 'CCSDS 505.0-B-1 Conjunction Data Exchange Protocol',
      desc: 'Governs high-priority close-approach collision alerts between active orbital assets and cataloged orbital debris fragments, calculating Miss Distance and Probability of Collision (PoC).',
      latency: 'Sub-minute',
      cadence: 'On Conjunction Assessment',
      cipher: 'AES-256-GCM',
      compliance: 'International Space Safety',
      packetAnatomy: [
        { name: 'ALERT_HDR', bytes: '8 Bytes' },
        { name: 'COVARIANCE', bytes: '36 Bytes' },
        { name: 'TCA_EPHEM', bytes: '32 Bytes' },
        { name: 'RISK_SIG', bytes: '16 Bytes' }
      ],
      hexSample: 'FF 11 00 48 20 26 09 06 00 00 01 C8 44 20 FF 00 12 48 99 00 14 BC 88 22 10 04 FE 88 AA 11 CC 40',
      wireSpecSample: {
        standard: 'CCSDS 505.0-B-1',
        alert_level: 'CRITICAL_WATCH',
        asset_id: 'AURORA-1',
        debris_id: 'COSMOS-DEBRIS-49120',
        tca_epoch: '2026-09-07T04:12:18.441Z',
        miss_distance_m: 142.8,
        collision_probability: 0.000482
      }
    },
    {
      id: 'CCSDS-130',
      domain: 'ccsds',
      authority: 'CCSDS / IETF',
      title: 'Space Communications (SCPS)',
      name: 'CCSDS 130.0 Space Communications Protocol Specification',
      desc: 'High-reliability transport protocol optimized for high packet latency, intermittent signal attenuation, and asymmetrical space-ground links in Low Earth and Deep Space orbits.',
      latency: 'Variable',
      cadence: 'Continuous Frame Stream',
      cipher: 'TLS 1.3 Space Profile',
      compliance: 'DTN / CCSDS Standard',
      packetAnatomy: [
        { name: 'SCPS_TP_HDR', bytes: '12 Bytes' },
        { name: 'ACK_VECTOR', bytes: '16 Bytes' },
        { name: 'FRAME_BODY', bytes: '128 Bytes' },
        { name: 'FEC_REED_SOL', bytes: '32 Bytes' }
      ],
      hexSample: '08 00 27 10 00 55 4B 88 12 00 04 10 99 AA 88 12 40 88 10 22 CC BB 01 02 44 88 10 99 22 44 00 11',
      wireSpecSample: {
        standard: 'CCSDS 130.0-G-3',
        transport: 'SCPS-TP Over CCSDS Space Link',
        window_size_kb: 512,
        intermittent_retransmission: 'Selective-NACK',
        reed_solomon_fec: 'RS(255,223)'
      }
    },
    {
      id: 'NASA-SP800',
      domain: 'nasa',
      authority: 'NASA / JPL',
      title: 'Deep Space Network DSN Protocol',
      name: 'NASA SP-800 Deep Space Telecommunication & Delta-DOR',
      desc: 'Governs high-gain interplanetary 34m/70m antenna telemetry extraction, carrier phase tracking, and Delta Differential One-Way Ranging (Delta-DOR) micro-radian angular resolution.',
      latency: 'Interplanetary Light-Time',
      cadence: 'Continuous Deep Pass',
      cipher: 'NASA SP-800-53 Rev 5',
      compliance: 'NASA Level-1 Mission Direct',
      packetAnatomy: [
        { name: 'DSN_SYNC', bytes: '16 Bytes' },
        { name: 'BEAM_COV', bytes: '24 Bytes' },
        { name: 'TELEMETRY_PKT', bytes: '96 Bytes' },
        { name: 'DOR_PHASE', bytes: '16 Bytes' }
      ],
      hexSample: '4E 41 53 41 20 44 53 4E 00 01 00 14 88 AA FF CC 12 34 56 78 90 AB CD EF 01 23 45 67 89 AB CD EF',
      wireSpecSample: {
        governing_standard: 'NASA SP-800-53',
        complex: 'Goldstone Complex (DSS-14)',
        uplink_ghz: 7.145,
        downlink_ghz: 8.420,
        delta_dor_accuracy_nrad: 2.1,
        snr_eb_n0_db: 14.8
      }
    },
    {
      id: 'NASA-SGP4',
      domain: 'nasa',
      authority: 'NASA / AFSPC',
      title: 'SGP4/SDP4 Propagator Model',
      name: 'Brouwer-Lyddane Simplified General Perturbations (SGP4/SDP4)',
      desc: 'The mathematical standard for propagating orbital state vectors from Two-Line Elements (TLE), accounting for Earth oblateness (J2, J3, J4) and atmospheric drag deceleration.',
      latency: '0.4 ms',
      cadence: 'Sub-millisecond Compute',
      cipher: 'Deterministic Math Model',
      compliance: 'Astrodynamic Benchmark',
      packetAnatomy: [
        { name: 'TLE_EPOCH', bytes: '14 Bytes' },
        { name: 'DRAG_BSTAR', bytes: '12 Bytes' },
        { name: 'ELEMENTS_6', bytes: '48 Bytes' },
        { name: 'PERTURB_PARMS', bytes: '16 Bytes' }
      ],
      hexSample: '31 20 35 36 39 38 37 55 20 32 36 32 34 38 2E 31 32 34 38 31 39 30 20 2E 30 30 30 31 34 32 38 30',
      wireSpecSample: {
        model: 'SGP4 / SDP4 (Vallado 2006 Ref)',
        target_object: 'NORAD 56987',
        bstar_drag: '0.00014280',
        step_size_sec: 1.0,
        perturbations: 'J2-J4 Zonal Harmonics + Exponential Atmospheric Density'
      }
    },
    {
      id: 'NASA-2070',
      domain: 'nasa',
      authority: 'NASA 2070 Spec',
      title: 'Cryptographic Proof-of-Telemetry',
      name: 'NASA 2070 Cryptographic Proof-of-Telemetry (CPoT)',
      desc: 'Zero-knowledge identity proof standard binding spacecraft RF beacons to authenticated operator sign-offs using post-quantum Blake3/Dilithium cryptographic hashes.',
      latency: '4.2 ms',
      cadence: 'On-Verification Commit',
      cipher: 'HMAC-SHA256 / Dilithium-3',
      compliance: 'Level-5 Quantum CPoT',
      packetAnatomy: [
        { name: 'CPOT_HEADER', bytes: '16 Bytes' },
        { name: 'OPERATOR_SIG', bytes: '32 Bytes' },
        { name: 'BEACON_HASH', bytes: '32 Bytes' },
        { name: 'ZERO_K_PROOF', bytes: '64 Bytes' }
      ],
      hexSample: '4E 45 42 2D 43 50 4F 54 2D 32 30 37 30 00 01 02 8A 19 4E CC 91 B4 02 7E 18 90 AA FF CC EE 12 34',
      wireSpecSample: {
        protocol: 'NASA 2070 CPoT v4',
        verifying_operator: 'Souvik Kar (Mission Director)',
        proof_type: 'ZK-SNARK Proof of Doppler Residual',
        hash_root: '0x8a194ecc91b4027e1890aaffccee1234bbf018',
        immutable_block: 15502
      }
    },
    {
      id: 'SPACE-TRACK',
      domain: 'military',
      authority: '18th SDS / USSF',
      title: 'Space-Track SATCAT Stream',
      name: '18th Space Defense Squadron Space-Track API v2.0',
      desc: 'Authoritative Space Surveillance Network (SSN) pipeline publishing primary satellite catalogs (SATCAT), automated high-cadence radar element sets, and covariance error ellipsoids.',
      latency: 'Sub-second API',
      cadence: 'Continuous Radar Updates',
      cipher: 'TLS 1.3 / OAuth2 Token',
      compliance: 'USSF / SSN Authoritative',
      packetAnatomy: [
        { name: 'REST_QUERY', bytes: '24 Bytes' },
        { name: 'SATCAT_RECORD', bytes: '80 Bytes' },
        { name: 'RADAR_EPOCH', bytes: '16 Bytes' },
        { name: 'SIG_AUTH', bytes: '16 Bytes' }
      ],
      hexSample: '53 50 41 43 45 2D 54 52 41 43 4B 2F 32 2E 30 00 35 36 39 38 37 00 4C 45 4F 5F 4F 52 42 49 54 00',
      wireSpecSample: {
        endpoint: 'api.space-track.org/basicspacesdata/query',
        class: 'elset',
        norad_cat_id: 56987,
        object_name: 'AURORA-1',
        radar_station: 'Eglin AFB / Cavalier AFS',
        epoch: '2026-09-06T14:00:00Z'
      }
    },
    {
      id: 'CSPO-EPHEM',
      domain: 'military',
      authority: 'CSpO Allies',
      title: 'Combined Space Operations Format',
      name: 'Combined Space Operations (CSpO) Allied Ephemeris Protocol',
      desc: 'Multilateral defense data exchange format connecting US, UK, Canada, Australia, New Zealand, France, and Germany for shared Space Domain Awareness (SDA).',
      latency: '24 ms',
      cadence: 'Hourly Synchronized Broadcast',
      cipher: 'AES-256 Military Grade',
      compliance: 'NATO STANAG 4609 / CSpO',
      packetAnatomy: [
        { name: 'CSPO_ROUTING', bytes: '16 Bytes' },
        { name: 'ALLIED_NODE', bytes: '16 Bytes' },
        { name: 'STATE_MATRIX', bytes: '64 Bytes' },
        { name: 'MAC_AUTH', bytes: '16 Bytes' }
      ],
      hexSample: '43 53 70 4F 2D 53 44 41 20 41 4C 4C 49 45 44 00 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F',
      wireSpecSample: {
        framework: 'CSpO Allied Ephemeris v3.2',
        origin_node: 'Vandenberg Space Force Base',
        security_classification: 'RELEASABLE ALLIED SDA',
        object_id: 'OBJECT 56987',
        sensor_fusion_count: 8
      }
    },
    {
      id: 'ECSS-70-41',
      domain: 'esa',
      authority: 'ESA / ESTEC',
      title: 'Packet Utilization Standard (PUS)',
      name: 'ECSS-E-ST-70-41C Spacecraft Telemetry & Telecommand PUS',
      desc: 'The European Space Agency standard defining operational telemetry packets, telecommands, diagnostic monitoring, and onboard memory management services.',
      latency: 'Sub-20ms',
      cadence: 'Sub-second Packet Stream',
      cipher: 'ECSS Cryptographic Header',
      compliance: 'ECSS European Standard',
      packetAnatomy: [
        { name: 'PUS_HEADER', bytes: '6 Bytes' },
        { name: 'SERVICE_TYPE', bytes: '2 Bytes' },
        { name: 'APP_DATA', bytes: '112 Bytes' },
        { name: 'PACKET_CRC', bytes: '2 Bytes' }
      ],
      hexSample: '08 19 01 00 00 70 03 19 00 01 48 90 22 11 00 00 12 48 99 AA BB CC DD EE FF 00 11 22 33 44 55 66',
      wireSpecSample: {
        standard: 'ECSS-E-ST-70-41C',
        service_type: 3,
        subservice: 25,
        service_name: 'Housekeeping Parameter Reporting',
        source_apid: 142,
        sequence_count: 8192
      }
    },
    {
      id: 'ESA-DISCOS',
      domain: 'esa',
      authority: 'ESA Space Debris Office',
      title: 'DISCOSweb Space Debris API',
      name: 'ESA Database and Information System Characterising Objects in Space',
      desc: 'ESA official launch, mission history, physical dimensions, mass, cross-sectional area, and shape model database for orbital decay and collision cross-section calculations.',
      latency: 'REST API (~120ms)',
      cadence: 'Daily Sync',
      cipher: 'HTTPS / Bearer Auth',
      compliance: 'ESA Debris Office Standard',
      packetAnatomy: [
        { name: 'DISCOS_REQ', bytes: '16 Bytes' },
        { name: 'OBJECT_PHYS', bytes: '48 Bytes' },
        { name: 'SOLAR_RAD_COEF', bytes: '16 Bytes' },
        { name: 'API_SIG', bytes: '8 Bytes' }
      ],
      hexSample: '44 49 53 43 4F 53 2D 57 45 42 20 41 50 49 00 01 00 00 56 98 70 00 41 75 72 6F 72 61 2D 31 00 00',
      wireSpecSample: {
        provider: 'ESA Space Debris Office (Darmstadt)',
        cospar_id: '2026-042A',
        mass_kg: 18.5,
        cross_section_m2: 0.12,
        shape: '12U CubeSat Form Factor'
      }
    },
    {
      id: 'IADC-MIT',
      domain: 'esa',
      authority: 'IADC Steering Group',
      title: 'IADC Debris Mitigation Guidelines',
      name: 'Inter-Agency Space Debris Coordination Committee Protocol',
      desc: 'International framework establishing 25-year post-mission orbital decay rules, deliberate fragmentation bans, and protected Low-Earth & Geostationary orbital altitude regimes.',
      latency: 'Mission Phase',
      cadence: 'Long-term Assessment',
      cipher: 'Audit Integrity Hash',
      compliance: 'IADC-02-01 Standard',
      packetAnatomy: [
        { name: 'IADC_RULE', bytes: '8 Bytes' },
        { name: 'ORBIT_REGIME', bytes: '16 Bytes' },
        { name: 'DECAY_PREDICT', bytes: '32 Bytes' },
        { name: 'CLEARANCE_SIG', bytes: '16 Bytes' }
      ],
      hexSample: '49 41 44 43 2D 30 32 2D 30 31 00 00 00 00 00 00 4C 45 4F 5F 50 52 4F 54 45 43 54 45 44 00 00 00',
      wireSpecSample: {
        standard: 'IADC-02-01 Guidelines',
        protected_region: 'LEO (Altitude < 2,000 km)',
        estimated_lifetime_years: 4.8,
        disposal_mode: 'Atmospheric Re-entry Burn',
        mitigation_status: 'COMPLIANT'
      }
    },
    {
      id: 'SATNOGS-NET',
      domain: 'nebulon',
      authority: 'Libre Space / Open Science',
      title: 'SatNOGS Network & DB API',
      name: 'SatNOGS Decentralized Ground Station Network Protocol',
      desc: 'Open science protocol connecting 420+ crowd-sourced Software Defined Radio (SDR) ground antennas worldwide to schedule passes, record IQ demodulated audio, and extract beacons.',
      latency: 'Sub-second',
      cadence: 'Pass Schedule Cadence',
      cipher: 'HTTPS / API Token',
      compliance: 'Open Hardware & Science',
      packetAnatomy: [
        { name: 'NET_PASS_ID', bytes: '12 Bytes' },
        { name: 'STATION_COORDS', bytes: '24 Bytes' },
        { name: 'IQ_WATERFALL', bytes: '128 Bytes' },
        { name: 'DECODE_PREAMBLE', bytes: '16 Bytes' }
      ],
      hexSample: '53 61 74 4E 4F 47 53 2D 4E 65 74 00 00 00 00 8E 48 90 22 11 00 00 12 48 99 AA BB CC DD EE FF 00',
      wireSpecSample: {
        network: 'SatNOGS Global Network',
        active_stations: 420,
        demodulation: 'GFSK 9600 bps / BPSK 1200 bps',
        waterfall_format: 'PNG Doppler Spectrogram',
        telemetry_frame_export: 'SiDS Open Protocol'
      }
    },
    {
      id: 'NEB-01',
      domain: 'nebulon',
      authority: 'Nebulon Core Engine',
      title: 'Multi-Sensor Ingestion Protocol',
      name: 'NEB-01 Asynchronous Multi-Source Telemetry Ingestion Engine',
      desc: 'Autonomous ingest pipeline normalizing heterogenous orbital element streams, ground station RF Doppler waterfalls, and launch deployment manifests into unified spatial-temporal vectors.',
      latency: '8.4 ms',
      cadence: 'Real-Time Event Stream',
      cipher: 'AES-256-GCM',
      compliance: 'Nebulon Core Standard',
      packetAnatomy: [
        { name: 'INGEST_ROUTING', bytes: '16 Bytes' },
        { name: 'SENSOR_ORIGIN', bytes: '16 Bytes' },
        { name: 'NORMALIZED_VEC', bytes: '64 Bytes' },
        { name: 'CHECKSUM', bytes: '8 Bytes' }
      ],
      hexSample: '4E 45 42 2D 30 31 2D 49 4E 47 45 53 54 00 00 01 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F 10',
      wireSpecSample: {
        protocol: 'NEB-01 Telemetry Normalizer',
        sources: ['18th SDS Space-Track', 'CelesTrak', 'SatNOGS', 'Launch Manifest'],
        throughput_packets_sec: 1420,
        average_latency_ms: 8.4
      }
    },
    {
      id: 'NEB-02',
      domain: 'nebulon',
      authority: 'Nebulon Core Engine',
      title: 'Physics Residual Arbitration',
      name: 'NEB-02 Deterministic Doppler Physics Residual Filter',
      desc: 'Continuous astrodynamic filter comparing empirical SatNOGS RF carrier frequency shifts against SGP4 Keplerian projections, enforcing a strict Root-Mean-Square Error (RMSE) < 0.05 kHz.',
      latency: '1.2 ms',
      cadence: 'Per Observation Pass',
      cipher: 'Mathematical Residual Seal',
      compliance: 'Physics-First Non-Statistical',
      packetAnatomy: [
        { name: 'FILTER_ID', bytes: '8 Bytes' },
        { name: 'EMPIRICAL_RF', bytes: '32 Bytes' },
        { name: 'SGP4_THEORY', bytes: '32 Bytes' },
        { name: 'RESIDUAL_DELTA', bytes: '16 Bytes' }
      ],
      hexSample: '4E 45 42 2D 30 32 2D 52 45 53 49 44 55 41 4C 00 00 14 20 48 88 AA FF CC 12 34 56 78 90 AB CD EF',
      wireSpecSample: {
        filter_algorithm: 'Levenberg-Marquardt Doppler Curve Fit',
        theoretical_model: 'SGP4 Vallado Ephemeris',
        tolerance_threshold_khz: 0.05,
        measured_rmse_khz: 0.018,
        match_status: 'CONFIRMED'
      }
    },
    {
      id: 'NEB-03',
      domain: 'nebulon',
      authority: 'Nebulon Core Engine',
      title: 'Identity Graph Solver Protocol',
      name: 'NEB-03 Multi-Hypothesis Evidence Network & Contradiction Arbiter',
      desc: 'Bipartite graph optimization engine linking candidate radar track IDs to spacecraft hypotheses, dynamically flagging frequency conflicts, timing anomalies, and calculate confidence scores.',
      latency: '3.6 ms',
      cadence: 'Dynamic Evidence Ingestion',
      cipher: 'Bayesian Graph Hash',
      compliance: 'Graph-Theoretic Arbiter',
      packetAnatomy: [
        { name: 'GRAPH_EPOCH', bytes: '8 Bytes' },
        { name: 'HYPOTHESIS_ID', bytes: '16 Bytes' },
        { name: 'EDGE_WEIGHTS', bytes: '48 Bytes' },
        { name: 'CONFLICT_FLAGS', bytes: '16 Bytes' }
      ],
      hexSample: '4E 45 42 2D 30 33 2D 47 52 41 50 48 00 00 00 01 02 04 08 10 20 40 80 FF 00 11 22 33 44 55 66 77',
      wireSpecSample: {
        graph_nodes: 14,
        active_hypotheses: 3,
        conflict_status: 'RESOLVED',
        physics_match_score: 94.8,
        recommended_candidate: 'NORAD 56987'
      }
    },
    {
      id: 'NEB-04',
      domain: 'nebulon',
      authority: 'Nebulon Core Engine',
      title: 'Next-Best Pass Optimization',
      name: 'NEB-04 Next-Best Observation Pass Optimization (NBPO)',
      desc: 'Autonomous observation scheduler evaluating planetary ground station geometry to recommend upcoming satellite passes that maximize Doppler divergence and resolve identification ambiguity.',
      latency: '15 ms',
      cadence: '15-Minute Lookahead',
      cipher: 'Schedule Proof Token',
      compliance: 'Optimal Information Gain',
      packetAnatomy: [
        { name: 'NBPO_WINDOW', bytes: '12 Bytes' },
        { name: 'STATION_MATRIX', bytes: '36 Bytes' },
        { name: 'DIVERGENCE_VAL', bytes: '24 Bytes' },
        { name: 'TASK_TOKEN', bytes: '16 Bytes' }
      ],
      hexSample: '4E 45 42 2D 30 34 2D 4E 42 50 4F 00 00 00 00 01 44 88 12 00 11 AA CC 20 48 99 00 14 BC 88 22 10',
      wireSpecSample: {
        recommended_station: 'SatNOGS Station 142 (Svalbard)',
        aos_utc: '2026-09-06T15:22:10Z',
        los_utc: '2026-09-06T15:34:40Z',
        max_elevation_deg: 68.4,
        doppler_separation_khz: 14.2
      }
    },
    {
      id: 'NEB-05',
      domain: 'nebulon',
      authority: 'Nebulon Core Engine',
      title: 'Cryptographic Verification Seal',
      name: 'NEB-05 Human-in-the-Loop Cryptographic Provenance Commitment',
      desc: 'The definitive cryptographic seal binding verified spacecraft identification to the authenticated Mission Director sign-off, creating an immutable SHA-256 HMAC provenance chain.',
      latency: '2.1 ms',
      cadence: 'Operator Execution',
      cipher: 'SHA-256 HMAC + Quantum Seal',
      compliance: 'Zero-Defect Audit Trail',
      packetAnatomy: [
        { name: 'SEAL_ROOT', bytes: '16 Bytes' },
        { name: 'OPERATOR_ID', bytes: '24 Bytes' },
        { name: 'EVIDENCE_SELECTION', bytes: '32 Bytes' },
        { name: 'CRYPTO_HASH', bytes: '32 Bytes' }
      ],
      hexSample: '4E 45 42 2D 30 35 2D 53 45 41 4C 00 00 00 01 00 53 6F 75 76 69 6B 20 4B 61 72 00 00 8A 19 4E CC',
      wireSpecSample: {
        seal_status: 'COMMITTED',
        verifying_operator: 'Souvik Kar · Mission Director',
        spacecraft_bound: 'Aurora-1 ↔ NORAD 56987',
        cryptographic_hash: '0x8a194ecc91b4027e1890aaffccee1234bbf018',
        timestamp: '2026-09-06T14:35:18.000Z'
      }
    }
  ];

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  let currentFilter = 'all';
  let searchQuery = '';
  let selectedProtocol = PROTOCOLS[0];

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------
  function init() {
    renderFilterCounts();
    renderProtocolGrid();
    updateInspectorHUD(selectedProtocol);
    bindFilterControls();
    bindSearchControl();
    bindInspectorActions();
    bindTopologyInteraction();
    startHandshakeStream();
  }

  // --------------------------------------------------------------------------
  // FILTERING & RENDERING
  // --------------------------------------------------------------------------
  function renderFilterCounts() {
    const counts = {
      all: PROTOCOLS.length,
      ccsds: PROTOCOLS.filter(p => p.domain === 'ccsds').length,
      nasa: PROTOCOLS.filter(p => p.domain === 'nasa').length,
      military: PROTOCOLS.filter(p => p.domain === 'military').length,
      esa: PROTOCOLS.filter(p => p.domain === 'esa').length,
      nebulon: PROTOCOLS.filter(p => p.domain === 'nebulon').length
    };

    Object.keys(counts).forEach(k => {
      const el = document.querySelector(`.protocol-chip-count[data-count="${k}"]`);
      if (el) el.textContent = counts[k];
    });
  }

  function getFilteredProtocols() {
    return PROTOCOLS.filter(p => {
      const matchFilter = currentFilter === 'all' || p.domain === currentFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        p.id.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.authority.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.cipher.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }

  function renderProtocolGrid() {
    const container = document.getElementById('protocol-grid');
    if (!container) return;

    const list = getFilteredProtocols();

    if (list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; background: rgba(8, 14, 34, 0.6); border: 1px dashed rgba(0, 240, 255, 0.2); border-radius: 8px;">
          <p class="n-body" style="color: var(--n-muted); font-family: var(--n-font-mono);">
            NO SPACE PROTOCOLS MATCH SEARCH QUERY: "${searchQuery}"
          </p>
          <button type="button" class="n-btn n-btn--xs n-btn--primary" id="protocol-reset-search" style="margin-top: 1rem;">
            Reset Search Filters
          </button>
        </div>
      `;
      const resetBtn = document.getElementById('protocol-reset-search');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          searchQuery = '';
          const input = document.getElementById('protocol-search');
          if (input) input.value = '';
          renderProtocolGrid();
        });
      }
      return;
    }

    container.innerHTML = list.map(p => `
      <div class="protocol-card protocol-card--${p.domain} ${p.id === selectedProtocol.id ? 'is-selected' : ''}" data-protocol-id="${p.id}">
        <div>
          <div class="protocol-card__head">
            <span class="protocol-card__id">${p.id}</span>
            <span class="protocol-card__authority">${p.authority}</span>
          </div>
          <h4 class="protocol-card__title">${p.title}</h4>
          <p class="protocol-card__desc">${p.desc}</p>
        </div>
        <div class="protocol-card__footer">
          <span class="protocol-status-pip">
            <span class="protocol-status-pip__dot"></span>
            ACTIVE // ENFORCED
          </span>
          <span>${p.latency}</span>
        </div>
      </div>
    `).join('');

    // Bind card click
    container.querySelectorAll('.protocol-card').forEach(card => {
      card.addEventListener('click', function () {
        const id = this.getAttribute('data-protocol-id');
        const proto = PROTOCOLS.find(p => p.id === id);
        if (proto) {
          selectedProtocol = proto;
          container.querySelectorAll('.protocol-card').forEach(c => c.classList.remove('is-selected'));
          this.classList.add('is-selected');
          updateInspectorHUD(proto);
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // STICKY LIVE INSPECTOR HUD CONTROLLER
  // --------------------------------------------------------------------------
  function updateInspectorHUD(proto) {
    if (!proto) return;

    const elId = document.getElementById('inspector-id');
    const elTitle = document.getElementById('inspector-title');
    const elAuth = document.getElementById('inspector-authority');
    const elLatency = document.getElementById('inspector-latency');
    const elCadence = document.getElementById('inspector-cadence');
    const elCipher = document.getElementById('inspector-cipher');
    const elAnatomy = document.getElementById('inspector-anatomy-rail');
    const elHex = document.getElementById('inspector-hex-code');

    if (elId) elId.textContent = proto.id;
    if (elTitle) elTitle.textContent = proto.name;
    if (elAuth) elAuth.textContent = proto.authority;
    if (elLatency) elLatency.textContent = proto.latency;
    if (elCadence) elCadence.textContent = proto.cadence;
    if (elCipher) elCipher.textContent = proto.cipher;

    // Render Packet Anatomy Rail
    if (elAnatomy && proto.packetAnatomy) {
      elAnatomy.innerHTML = proto.packetAnatomy.map(block => `
        <div class="packet-block">
          <span class="packet-block__name">${block.name}</span>
          <span class="packet-block__bytes">${block.bytes}</span>
        </div>
      `).join('');
    }

    // Render Hex Code with highlighted color keys
    if (elHex && proto.hexSample) {
      const bytes = proto.hexSample.split(' ');
      elHex.innerHTML = bytes.map((b, idx) => {
        let cls = 'hex-byte--payload';
        if (idx < 6) cls = 'hex-byte--header';
        else if (idx < 14) cls = 'hex-byte--meta';
        else if (idx >= bytes.length - 4) cls = 'hex-byte--seal';
        return `<span class="${cls}">${b}</span>`;
      }).join(' ');
    }
  }

  // --------------------------------------------------------------------------
  // CONTROLS BINDING
  // --------------------------------------------------------------------------
  function bindFilterControls() {
    document.querySelectorAll('.protocol-chip-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.protocol-chip-btn').forEach(b => b.classList.remove('is-active'));
        this.classList.add('is-active');
        currentFilter = this.getAttribute('data-filter');
        renderProtocolGrid();
      });
    });
  }

  function bindSearchControl() {
    const input = document.getElementById('protocol-search');
    if (!input) return;
    input.addEventListener('input', function () {
      searchQuery = this.value;
      renderProtocolGrid();
    });
  }

  function bindInspectorActions() {
    const simBtn = document.getElementById('inspector-sim-btn');
    if (simBtn) {
      simBtn.addEventListener('click', function () {
        simBtn.disabled = true;
        const originalText = simBtn.innerHTML;
        simBtn.innerHTML = `<span>⟳</span> <span>Transmitting Handshake Packet...</span>`;

        setTimeout(() => {
          simBtn.innerHTML = `<span>✓</span> <span>Handshake Validated (0.8ms)</span>`;
          if (window.NebulonApp && typeof window.NebulonApp.showToast === 'function') {
            window.NebulonApp.showToast(
              'Handshake Verified',
              `Protocol ${selectedProtocol.id} wire packet acknowledged by Ground Network. Integrity: Nominal.`,
              'success'
            );
          }
          setTimeout(() => {
            simBtn.disabled = false;
            simBtn.innerHTML = originalText;
          }, 1800);
        }, 600);
      });
    }

    const copyBtn = document.getElementById('inspector-copy-spec');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const specStr = JSON.stringify(selectedProtocol.wireSpecSample, null, 2);
        navigator.clipboard.writeText(specStr).then(() => {
          if (window.NebulonApp && typeof window.NebulonApp.showToast === 'function') {
            window.NebulonApp.showToast('Spec Copied', `${selectedProtocol.id} JSON Wire Spec copied to clipboard.`, 'info');
          }
        }).catch(() => {
          alert(specStr);
        });
      });
    }

    const exportBtn = document.getElementById('inspector-export-json');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        const specStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedProtocol.wireSpecSample, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", specStr);
        dlAnchor.setAttribute("download", `${selectedProtocol.id}_Wire_Spec.json`);
        dlAnchor.click();
      });
    }
  }

  function bindTopologyInteraction() {
    // Interactive pipeline stage cards
    document.querySelectorAll('.pipeline-stage-card[data-stage]').forEach(card => {
      card.addEventListener('click', function () {
        document.querySelectorAll('.pipeline-stage-card').forEach(c => c.classList.remove('is-active-stage'));
        this.classList.add('is-active-stage');

        const stage = this.getAttribute('data-stage');
        const stepNo = this.querySelector('.stage-step-no') ? this.querySelector('.stage-step-no').textContent.trim() : '';

        // Map step to primary protocol
        let targetProtoId = 'NEB-01';
        if (stepNo.includes('SSN')) targetProtoId = 'SPACE-TRACK';
        else if (stepNo.includes('NEB-01')) targetProtoId = 'NEB-01';
        else if (stepNo.includes('NEB-02')) targetProtoId = 'NEB-02';
        else if (stepNo.includes('NEB-03')) targetProtoId = 'NEB-03';
        else if (stepNo.includes('NEB-05')) targetProtoId = 'NEB-05';

        const proto = PROTOCOLS.find(p => p.id === targetProtoId);
        if (proto) {
          selectedProtocol = proto;
          updateInspectorHUD(proto);

          // Update active card in grid
          document.querySelectorAll('.protocol-card').forEach(c => {
            if (c.getAttribute('data-protocol-id') === targetProtoId) {
              c.classList.add('is-selected');
              c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
              c.classList.remove('is-selected');
            }
          });

          if (window.NebulonApp && typeof window.NebulonApp.showToast === 'function') {
            window.NebulonApp.showToast(
              'Pipeline Stage Selected',
              `${proto.id} (${proto.title}) inspected. Active telemetry synchronized.`,
              'info'
            );
          }
        }
      });
    });

    // Start live Doppler residual subtle modulation
    setInterval(() => {
      const residualValues = ['0.014', '0.018', '0.011', '0.021', '0.015', '0.009', '0.017'];
      const val = residualValues[Math.floor(Math.random() * residualValues.length)];
      const residualEl = document.querySelector('.stage-card--s3 .stage-readout-item strong');
      if (residualEl) {
        residualEl.textContent = `${val} kHz`;
      }
      const summaryEl = document.querySelectorAll('.pipeline-summary-val')[1];
      if (summaryEl) {
        summaryEl.textContent = `${val} kHz (PASS)`;
      }
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // REAL-TIME HANDSHAKE TELEMETRY STREAM TICKER
  // --------------------------------------------------------------------------
  function startHandshakeStream() {
    const terminal = document.getElementById('protocol-stream-terminal');
    if (!terminal) return;

    const streamEvents = [
      { badge: 'CCSDS', cls: 'stream-badge--ccsds', msg: 'Ingested 18th SDS SATCAT #56987 · Ephemeris epoch 2026.249 · CCSDS ODM compliant' },
      { badge: 'SatNOGS', cls: 'stream-badge--satnogs', msg: 'Decoded 437.450 MHz GFSK beacon (Station 142 Svalbard) · SNR 18.4 dB · Doppler delta 0.018 kHz' },
      { badge: 'NASA DSN', cls: 'stream-badge--nasa', msg: 'Carrier lock acquired DSS-14 Goldstone · Protocol SP-800 confirmed · Delta-DOR nominal' },
      { badge: 'NEB-02', cls: 'stream-badge--neb', msg: 'Deterministic Doppler residual arbitration passed · RMSE 0.014 kHz (Threshold 0.050 kHz)' },
      { badge: '18TH SDS', cls: 'stream-badge--18th', msg: 'SSN Radar track correlation established · Covariance matrix updated for NORAD 56987' },
      { badge: 'NEB-05', cls: 'stream-badge--neb', msg: 'Cryptographic Identity Seal committed by Mission Director Souvik Kar · HMAC-SHA256 valid' },
      { badge: 'ECSS', cls: 'stream-badge--ccsds', msg: 'ECSS-E-70-41C telemetry frame #8192 decoded · Subservice 25 nominal parameter status' }
    ];

    let index = 0;

    setInterval(() => {
      const ev = streamEvents[index % streamEvents.length];
      index++;

      const now = new Date();
      const timeStr = now.toISOString().substring(11, 19) + ' UTC';

      const line = document.createElement('div');
      line.className = 'protocol-stream-line';
      line.innerHTML = `
        <span class="stream-time">${timeStr}</span>
        <span class="stream-badge ${ev.cls}">${ev.badge}</span>
        <span class="stream-msg">${ev.msg}</span>
        <span class="stream-status">VALIDATED</span>
      `;

      terminal.insertBefore(line, terminal.firstChild);

      // Keep maximum 30 lines
      if (terminal.children.length > 30) {
        terminal.removeChild(terminal.lastChild);
      }
    }, 3200);
  }

  // --------------------------------------------------------------------------
  // DOM READY
  // --------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
