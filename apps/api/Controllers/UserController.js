import asyncHandler from "../Utils/AsyncHandler.js"
import { CreateInfo } from "../Utils/AuthUtils.js"
import ApiError from "../Utils/ApiError.js"
import ApiResponse from "../Utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import prisma from "../Utils/Prisma.js"
import { CreateAccessToken, CreateRefreshToken } from "../Utils/AuthUtils.js"
import { v4 as uuidv4 } from "uuid";

const HandelOauthCallback = asyncHandler(async (req, res) => {
  try {
    const secret = process.env.CLIENT_SECRET;
    const token = String(req.query.token || "");
    const user = jwt.verify(token, secret);

    if (!user) {
      throw new ApiError("Invalid Token", 400);
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    let newUser

    const providerId = user.provider_id == null ? null : String(user.provider_id);

    if (user.provider_name == "github") {
      if (!existingUser) {
        newUser = await prisma.user.create({
          data: {
            email: user.email,
            fullname: user.username,
            avatar: user.avatar,
            githubProviderId: providerId,
          }
        })
      }

    } else if (user.provider_name == "google") {
      if (!existingUser) {
        newUser = await prisma.user.create({
          data: {
            email: user.email,
            fullname: user.username,
            avatar: user.avatar,
            googleProviderId: providerId,
          }
        })
      }
    }

    const payload = {
      id: existingUser?.id || newUser?.id,
      fullname: existingUser?.fullname || newUser?.fullname,
      email: existingUser?.email || newUser?.email,
      avatar: existingUser?.avatar || newUser?.avatar
    }

    const newAccessToken = CreateAccessToken(payload.id, payload.email, payload.fullname, payload.avatar);
    const newRefreshToken = CreateRefreshToken(payload.id, payload.email, payload.fullname, payload.avatar);

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
    });

    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    if (req.accepts(["json", "html"]) === "json") {
      return res
        .status(200)
        .json(new ApiResponse(200, "OAuth session created", payload));
    }

    return res.redirect("http://localhost:5173/")

  } catch (err) {
    console.log("err", err.message)
    res.status(400).json({ message: "Failed to Decode Token", "err": err });
  }
})


const SetupUser = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body

  console.log("name", name)
  console.log("prefrences", avatar)
  const usrId = uuidv4()
  const token = CreateInfo(usrId, name, avatar)

  res.cookie("info", token, {
    sameSite: "strict",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    timeout: 1000 * 60 * 60 * 24 * 7, // 7 days
  })


  return res.status(200).json({
    "message": "User Info Setup Successfully",
    "data": {
      "id": usrId,
    }
  })
})

export { HandelOauthCallback, SetupUser }
