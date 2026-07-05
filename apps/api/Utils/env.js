const getRequiredEnv = (name) => {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
};

const getOptionalEnv = (name, fallback) => {
  const value = process.env[name];

  if (!value || !value.trim()) {
    return fallback;
  }

  return value.trim();
};

const getOptionalIntEnv = (name, fallback) => {
  const value = Number(process.env[name]);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value));
};

const getRequiredIntEnv = (name) => {
  const value = Number(getRequiredEnv(name));

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return Math.round(value);
};

const getAllowedOrigins = () => {
  return getRequiredEnv("CORS_ORIGIN")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export {
  getAllowedOrigins,
  getOptionalEnv,
  getOptionalIntEnv,
  getRequiredEnv,
  getRequiredIntEnv,
};
