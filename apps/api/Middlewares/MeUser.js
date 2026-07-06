import jwt from 'jsonwebtoken';
import { getRequiredEnv } from "../Utils/env.js";


const MeAuth = (req, res, next) => {
  const cookies = req.cookies;
  const data = cookies.info


  if (!data) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
  try {
    const decoded = jwt.verify(data, getRequiredEnv("INFO_SECRET"));
    return res.status(200).json({
      message: "Authorized",
      userId: decoded.id,
      username: decoded.username,
      avatar: decoded.avatar
    });
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}


export default MeAuth;
