const fastify = require("fastify")({
  logger: true,
  bodyLimit: 100 * 1024 * 1024,
});
const mongoose = require("mongoose");
const cors = require("@fastify/cors");
require("dotenv/config");

const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log("Connected to DB"))
  .catch((error) => console.error(`This happened: ${error}`));

//! Starting server
fastify.register(cors);

const userData = {};

// Define MongoDB schema for user data
const userDataSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

// Create Mongoose model
const UserData = mongoose.model("UserData", userDataSchema);

// Define route to handle bot updates
fastify.post("/bot", async (request, reply) => {
  await bot.processUpdate(request.body);
  reply.status(200).send("OK");
});
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const options = {
    reply_markup: JSON.stringify({
      keyboard: [["Ariza qoldirish"]],
      resize_keyboard: true,
    }),
  };
  bot.sendMessage(chatId, "Ariza qoldirish tugmasini bosing👇:", options);
});
bot.onText(/Ariza qoldirish/, (msg) => {
  const chatId = msg.chat.id;
  userData[chatId] = { stage: "NAME" }; // Set the stage to collect name
  bot.sendMessage(chatId, "Arizangizni qoldirish uchun ismingizni yuboring:", {
    reply_markup: JSON.stringify({
      remove_keyboard: true,
    }),
  });
});
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (userData[chatId] && userData[chatId].stage === "NAME") {
    // Save name and prompt for phone number
    userData[chatId].name = messageText;
    userData[chatId].stage = "PHONE_NUMBER";
    bot.sendMessage(chatId, "Iltimos telefon raqamingizni yuboring:");
  } else if (userData[chatId] && userData[chatId].stage === "PHONE_NUMBER") {
    // Save phone number and prompt for message
    userData[chatId].phoneNumber = messageText;
    userData[chatId].stage = "MESSAGE";
    bot.sendMessage(chatId, "Arizangizni yuboring:");
  } else if (userData[chatId] && userData[chatId].stage === "MESSAGE") {
    // Save message and store data in MongoDB
    userData[chatId].message = messageText;
    const { name, phoneNumber, message } = userData[chatId];

    // Create a new UserData document and save it to MongoDB
    const newUser = new UserData({ name, phoneNumber, message });
    await newUser.save();

    // Send confirmation message to the user
    bot.sendMessage(
      chatId,
      "Sizning arizangiz qabul qilindi. Tez orada siz bilan bog'lanamiz."
    );

    // Reset userData for this chatId
    delete userData[chatId];
  }
});

// Start the server
(() => {
  try {
    fastify.listen({ port: process.env.PORT || 8000 }, function (err, address) {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
      fastify.log.info(`Server is now listening on ${address}`);
    });
  } catch (error) {
    fastify.log.error(error);
  }
})();
