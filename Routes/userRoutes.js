import express from "express"
import { test } from "../Controllers/userController.js"

const router = express.Router()


router.get("/hello", test)


export default router