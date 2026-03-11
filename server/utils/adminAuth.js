import crypto from 'crypto';

const safeEqual = (left, right) => {
  const l = Buffer.from(String(left || ''), 'utf8');
  const r = Buffer.from(String(right || ''), 'utf8');
  if (l.length !== r.length) {
    return false;
  }
  return crypto.timingSafeEqual(l, r);
};

const parseBasicAuthHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const encoded = authHeader.slice('Basic '.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return null;
  }
};

const parseAdminCredentialsEnv = () => {
  const raw = process.env.ADMIN_CREDENTIALS || '';
  if (!raw.trim()) return [];

  // Format: "user1:pass1;user2:pass2"
  return raw
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex === -1) return null;

      return {
        username: entry.slice(0, separatorIndex).trim(),
        password: entry.slice(separatorIndex + 1).trim()
      };
    })
    .filter((entry) => entry && entry.username && entry.password);
};

export const getAdminCredentials = () => {
  const credentialList = parseAdminCredentialsEnv();

  if (credentialList.length > 0) {
    return credentialList;
  }

  if (process.env.ADMIN_USER && process.env.ADMIN_PASS) {
    return [
      {
        username: process.env.ADMIN_USER,
        password: process.env.ADMIN_PASS
      }
    ];
  }

  return [];
};

export const hasConfiguredAdminCredentials = () => getAdminCredentials().length > 0;

export const validateAdminCredentials = (username, password) => {
  const credentialList = getAdminCredentials();

  return credentialList.some(
    (entry) => safeEqual(username, entry.username) && safeEqual(password, entry.password)
  );
};

export const validateAdminBasicAuthHeader = (authHeader) => {
  const credentials = parseBasicAuthHeader(authHeader);
  if (!credentials) {
    return { ok: false, username: null };
  }

  const ok = validateAdminCredentials(credentials.username, credentials.password);
  return {
    ok,
    username: ok ? credentials.username : null
  };
};
