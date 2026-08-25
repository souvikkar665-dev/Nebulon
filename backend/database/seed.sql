-- ==========================================================================
-- NEBULON ORBITAL IDENTITY GRAPH — DATABASE SEED DATA
-- Fixed Master System Access Key & 4 Authorized Members
-- ==========================================================================

-- 1. Step 1 Master System Clearance (Nebulon System Credentials)
INSERT INTO system_clearance (system_key_name, access_cipher_hash, security_level)
VALUES 
('NEBULON_MASTER_USER', 'nebulon', 'LEVEL_5_OMEGA'),
('NEBULON_MASTER_PASSWORD', 'nebulon@2070', 'LEVEL_5_OMEGA'),
('NEBULON_MASTER_GATEWAY', 'ULTRON-OMEGA-2070', 'LEVEL_5_OMEGA')
ON CONFLICT (system_key_name) DO UPDATE 
SET access_cipher_hash = EXCLUDED.access_cipher_hash;

-- 2. Step 2 Authorized Operators (4 Fixed Members Only)
INSERT INTO authorized_members (member_id, callsign, password_hash, role, clearance_badge, ground_segment)
VALUES
(
    'souvik',
    'Souvik Kar',
    'souvik@2070',
    'Mission Director & Orbital Architect',
    'OMEGA-DIRECTOR',
    'Svalbard Polar Primary (GS-142)'
),
(
    'debangshu',
    'Debangshu',
    'debangshu@2070',
    'Lead Spacecraft Telemetry Analyst',
    'ALPHA-ANALYST',
    'Hawaii Pacific Deep Space (GS-088)'
),
(
    'sneha',
    'Sneha Maiti',
    'sneha@2070',
    'Ground Station Network Commander',
    'SIGMA-COMMANDER',
    'Hartebeesthoek Southern Array (GS-044)'
),
(
    'adrika',
    'Adrika',
    'adrika@2070',
    'Quantum RF & Doppler Specialist',
    'DELTA-SPECIALIST',
    'Kiruna Arctic Ground Segment (GS-204)'
)
ON CONFLICT (member_id) DO UPDATE 
SET callsign = EXCLUDED.callsign,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    clearance_badge = EXCLUDED.clearance_badge,
    ground_segment = EXCLUDED.ground_segment;
