import { registerChatHandler, sendMessage } from "./handlers/chatHandler.js";

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`${socket.id} got connected`);
    console.log(io.engine.clientsCount);


    registerChatHandler(io, socket)
    sendMessage(io, socket)

    socket.on("disconnect", () => {
      console.log(`${socket.id} got disconnected`);
    });
  });
};
