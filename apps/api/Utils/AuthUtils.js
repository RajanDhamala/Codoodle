import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from "./env.js";

const hashPassword = async (plain, rounds = 10) => {
  return await bcrypt.hash(plain, rounds)
}

const verifyPassword = async (plain, hashed) => {
  return await bcrypt.compare(plain, hashed);
}

const CreateAccessToken = (id, email, fullname, avatar) => {
  const payload = {
    id: id,
    fullname,
    email,
    avatar
  };
  return jwt.sign(payload, getRequiredEnv("ACCESS_TOKEN_SECRET"), { expiresIn: '15m' });
}

const CreateRefreshToken = (id, email, fullname, avatar) => {
  const payload = {
    id: id,
    email,
    fullname,
    avatar
  };
  return jwt.sign(payload, getRequiredEnv("REFRESH_TOKEN_SECRET"), { expiresIn: '7d' });
}

const CreateInfo = (id, username, avatar) => {
  const payload = {
    id: id,
    username,
    joinedAt: Date.now(),
    avatar,
  };
  return jwt.sign(payload, getRequiredEnv("INFO_SECRET"), { expiresIn: '7d' });
}


export {
  hashPassword, verifyPassword,
  CreateAccessToken, CreateRefreshToken,
  CreateInfo
}
