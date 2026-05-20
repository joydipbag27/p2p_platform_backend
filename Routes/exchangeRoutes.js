import express from "express"
import { createRequest, deleteRequest } from "../controllers/exchangeController.js"

const router = express.Router()

router.post("/create", createRequest)

router.delete("/delete", deleteRequest)


export default router