import dotenv from "dotenv"

dotenv.config({
    path: ".env.local",
    override: true,
    quiet: true
})

export default process.env