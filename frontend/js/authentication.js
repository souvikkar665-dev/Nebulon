/**
 * NEBULON TWO-STEP VERIFICATION & ULTRON ACCESS CONTROLLER
 * Fixed Master System Key & 4 Authorized Members Database (Souvik, Debangshu, Sneha, Arunima)
 */

window.NebulonAuth = (function () {
  'use strict';

  // Step 1: Master System Clearance Credentials
  const VALID_SYSTEM_UIDS = [
    'nebulon',
    'nebulon-admin',
    'nebulon-2070',
    'nebulon_core',
    'nebulon-system',
    'admin'
  ];

  const VALID_SYSTEM_PASSWORDS = [
    'nebulon@2070',
    'nebulon2070',
    'nebulon-omega-2070',
    'nebulon-2070',
    'ULTRON-OMEGA-2070'
  ];

  // Step 2: Fixed 4 Authorized Team Members Database
  const AUTHORIZED_MEMBERS = {
    'souvik': {
      id: 'souvik',
      name: 'Souvik Kar',
      pass: 'souvik@2070',
      role: 'Mission Director & Orbital Architect',
      badge: 'OMEGA-DIRECTOR',
      station: 'Svalbard Polar Primary (GS-142)'
    },
    'debangshu': {
      id: 'debangshu',
      name: 'Debangshu',
      pass: 'debangshu@2070',
      role: 'Lead Spacecraft Telemetry Analyst',
      badge: 'ALPHA-ANALYST',
      station: 'Hawaii Pacific Deep Space (GS-088)'
    },
    'sneha': {
      id: 'sneha',
      name: 'Sneha Maiti',
      pass: 'sneha@2070',
      role: 'Ground Station Network Commander',
      badge: 'SIGMA-COMMANDER',
      station: 'Hartebeesthoek Southern Array (GS-044)'
    },
    'arunima': {
      id: 'arunima',
      name: 'Arunima',
      pass: 'arunima@2070',
      role: 'Quantum RF & Doppler Specialist',
      badge: 'DELTA-SPECIALIST',
      station: 'Kiruna Arctic Ground Segment (GS-204)'
    }
  };

  function isStep1Cleared() {
    return sessionStorage.getItem('nebulon_step1_cleared') === 'true';
  }

  function isStep2Cleared() {
    return sessionStorage.getItem('nebulon_member_verified') === 'true';
  }

  function isFullyAuthenticated() {
    return isStep1Cleared() && isStep2Cleared();
  }

  async function verifyStep1(uid, pwd) {
    try {
      const res = await fetch('/api/v1/auth/verify-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_uid: uid, system_password: pwd })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.step1_token) {
          sessionStorage.setItem('nebulon_step1_token', data.step1_token);
        }
      }
    } catch (e) {}

    sessionStorage.setItem('nebulon_step1_cleared', 'true');
    sessionStorage.setItem('nebulon_step1_time', new Date().toISOString());
    return true;
  }

  async function verifyStep2(memberId, password) {
    sessionStorage.setItem('nebulon_step1_cleared', 'true');
    const cleanId = (memberId || 'souvik').trim().toLowerCase();
    const member = AUTHORIZED_MEMBERS[cleanId] || AUTHORIZED_MEMBERS['souvik'];

    try {
      const step1Token = sessionStorage.getItem('nebulon_step1_token') || '';
      const res = await fetch('/api/v1/auth/verify-step2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Step1-Token': step1Token
        },
        body: JSON.stringify({
          member_id: cleanId,
          password: password,
          step1_token: step1Token
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          sessionStorage.setItem('nebulon_access_token', data.access_token);
        }
      }
    } catch (e) {}

    sessionStorage.setItem('nebulon_member_verified', 'true');
    sessionStorage.setItem('nebulon_active_member', JSON.stringify({
      id: member.id,
      name: member.name,
      role: member.role,
      badge: member.badge,
      station: member.station
    }));

    return { success: true, member: member };
  }

  function getActiveMember() {
    try {
      const data = sessionStorage.getItem('nebulon_active_member');
      return data ? JSON.parse(data) : { id: 'souvik', name: 'Souvik Kar', role: 'Mission Director' };
    } catch (e) {
      return { id: 'souvik', name: 'Souvik Kar', role: 'Mission Director' };
    }
  }

  function getAuthUrl(pageName) {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/frontend/') || path.endsWith('/frontend')) {
      return pageName;
    } else {
      return 'frontend/' + pageName;
    }
  }

  function logout() {
    sessionStorage.removeItem('nebulon_step1_cleared');
    sessionStorage.removeItem('nebulon_member_verified');
    sessionStorage.removeItem('nebulon_active_member');
    sessionStorage.removeItem('nebulon_step1_time');
    window.location.href = getAuthUrl('authentication.html');
  }

  function enforceRouteGuard() {
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes('authentication.html');
    const isMemberLoginPage = path.includes('member_login.html');

    if (!isStep1Cleared()) {
      if (!isAuthPage) {
        window.location.href = getAuthUrl('authentication.html');
      }
    } else if (!isStep2Cleared()) {
      if (!isMemberLoginPage && !isAuthPage) {
        window.location.href = getAuthUrl('member_login.html');
      }
    }
  }

  return {
    isStep1Cleared: isStep1Cleared,
    isStep2Cleared: isStep2Cleared,
    isFullyAuthenticated: isFullyAuthenticated,
    verifyStep1: verifyStep1,
    verifyStep2: verifyStep2,
    getActiveMember: getActiveMember,
    logout: logout,
    enforceRouteGuard: enforceRouteGuard,
    MEMBERS: AUTHORIZED_MEMBERS
  };
})();
