import { User } from "../Models/userModel.js";


export const test = async (req, res) => {
  const newUser = await User.create({
    username: "test-user",
    email: "test@gmail.com",
    password: "123456",
    avatar: "hero.jpg",
    trustScore: 3
  })

  console.log(newUser);

  res.json(newUser)
};
