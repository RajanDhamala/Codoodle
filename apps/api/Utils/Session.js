import jwt from "jsonwebtoken";

const parseCookieHeader = (cookieHeader = "") => {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return cookies;

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (!key) return cookies;

      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
};

const normalizeUserPayload = (payload) => {
  if (!payload?.id || !payload?.email) return null;

  return {
    id: String(payload.id),
    email: payload.email,
    fullname: payload.fullname || payload.name || payload.email,
    avatar: payload.avatar || null,
  };
};

const verifyToken = (token, secret) => {
  if (!token || !secret) return null;

  try {
    return normalizeUserPayload(jwt.verify(token, secret));
  } catch {
    return null;
  }
};

const getSessionFromCookies = (cookies = {}) => {
  const accessToken = cookies.access_token || cookies.accessToken;
  const refreshToken = cookies.refresh_token || cookies.refreshToken;

  return (
    verifyToken(accessToken, process.env.ACCESS_TOKEN_SECRET) ||
    verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET)
  );
};

const getSessionFromRequest = (req) => {
  return getSessionFromCookies(req.cookies || {});
};

const getSessionFromSocket = (socket) => {
  const cookies = parseCookieHeader(socket.handshake.headers.cookie || "");
  return getSessionFromCookies(cookies);
};

export {
  getSessionFromCookies,
  getSessionFromRequest,
  getSessionFromSocket,
  parseCookieHeader,
};
