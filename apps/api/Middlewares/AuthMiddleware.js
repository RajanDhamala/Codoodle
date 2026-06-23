import { getSessionFromRequest } from "../Utils/Session.js";

const AuthUser = async (req, res, next) => {
  const user = getSessionFromRequest(req);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  req.user = user;
  return next();
};

export default AuthUser;
