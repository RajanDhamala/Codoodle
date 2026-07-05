const getRequiredViteEnv = (name: string) => {
  const value = import.meta.env[name];

  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return String(value).trim();
};

const apiBaseUrl = getRequiredViteEnv("VITE_API_URL").replace(/\/$/, "");

export { apiBaseUrl };
