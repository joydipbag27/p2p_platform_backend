import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("DATABASE CONNECTED :)");
  } catch (error) {
    console.log(error);
    console.error("FAILED TO CONNECT DATABASE :(");
    process.exit(1);
  }
};


process.on("SIGINT", async() => {
  await mongoose.disconnect()
  console.log("DATABASE DISCONNECTED");
  process.exit(0)
})