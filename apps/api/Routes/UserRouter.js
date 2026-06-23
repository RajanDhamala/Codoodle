import Router from "express";
import AuthUser from "../Middlewares/AuthMiddleware.js"

const UserRouter = Router()

UserRouter.get("/", (req, res) => {
  return res.send("User Router is up and running")
})

UserRouter.get("/test", AuthUser, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  })
})

export default UserRouter



