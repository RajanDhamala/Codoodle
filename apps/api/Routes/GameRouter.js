
import Router from "express";

const GameRouter = Router()

GameRouter.get("/", (req, res) => {
  return res.send("Game Router is up and running")
})

export default GameRouter




