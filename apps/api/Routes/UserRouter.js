import Router from "express";

import { SetupUser } from "../Controllers/UserController.js"
import MeAuth from "../Middlewares/MeUser.js"

const UserRouter = Router()

UserRouter.get("/", (req, res) => {
  return res.send("User Router is up and running")
})

UserRouter.get("/me", MeAuth)

UserRouter.post("/init", SetupUser)

export default UserRouter



