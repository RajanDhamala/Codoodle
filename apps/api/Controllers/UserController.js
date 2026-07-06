import asyncHandler from "../Utils/AsyncHandler.js"
import { CreateInfo } from "../Utils/AuthUtils.js"
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const setupUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(30),
  avatar: z.string().trim().min(1, "Avatar is required").max(128),
});

const SetupUser = asyncHandler(async (req, res) => {
  const result = setupUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    });
  }

  const { name, avatar } = result.data;

  const usrId = uuidv4();
  const token = CreateInfo(usrId, name, avatar);

  res.cookie("info", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  return res.status(200).json({
    message: "User setup completed successfully",
    data: {
      id: usrId,
    },
  });
});

export { SetupUser }
