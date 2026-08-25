-- ==========================================================================
-- NEBULON ORBITAL IDENTITY GRAPH — DATABASE SCHEMA
-- Two-Step Verification & Member Access Security Tables
-- ==========================================================================

CREATE TABLE IF NOT EXISTS system_clearance (
    id SERIAL PRIMARY KEY,
    system_key_name VARCHAR(64) UNIQUE NOT NULL,
    access_cipher_hash VARCHAR(128) NOT NULL,
    security_level VARCHAR(32) DEFAULT 'LEVEL_5_OMEGA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS authorized_members (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(64) UNIQUE NOT NULL,
    callsign VARCHAR(64) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(128) NOT NULL,
    clearance_badge VARCHAR(32) NOT NULL,
    ground_segment VARCHAR(128) NOT NULL,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(256) UNIQUE NOT NULL,
    member_id VARCHAR(64) REFERENCES authorized_members(member_id),
    step1_verified BOOLEAN DEFAULT FALSE,
    step2_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
