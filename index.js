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
  .catch((error) => console.error(`Connection error: ${error}`));

//! Starting server
fastify.register(cors);

const userData = {}; // Store user data and stages

const userDataSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  address: String,
  birthdate: String,
  passportNumber: String,
  education: String,
  education_date: String,
  field: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const UserData = mongoose.model("UserData", userDataSchema);

// Route to handle bot updates
fastify.post("/bot", async (request, reply) => {
  await bot.processUpdate(request.body);
  reply.status(200).send("OK");
});

// Event handler for '/start' command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  userData[chatId] = { stage: "NAME" }; // Initialize user data and stage
  bot.sendMessage(chatId, "Arizangizni yuborish uchun ismingizni kiriting:");
});

// Event handler for incoming messages
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (userData[chatId]) {
    switch (userData[chatId].stage) {
      case "NAME":
        userData[chatId].name = messageText;
        userData[chatId].stage = "PHONE_NUMBER";
        bot.sendMessage(chatId, "Iltimos, telefon raqamingizni yuboring:");
        break;
      case "PHONE_NUMBER":
        userData[chatId].phoneNumber = messageText;
        userData[chatId].stage = "ADDRESS";
        bot.sendMessage(chatId, "Yashayotgan manzilingizni kiriting:");
        break;
      case "ADDRESS":
        userData[chatId].address = messageText;
        userData[chatId].stage = "BIRTHDATE";
        bot.sendMessage(chatId, "Tug'ilgan sanangizni yuboring (sana/oyn/yil):");
        break;
      case "BIRTHDATE":
        userData[chatId].birthdate = messageText;
        userData[chatId].stage = "PASSPORT_NUMBER";
        bot.sendMessage(chatId, "Pasport raqamingizni kiriting:");
        break;
      case "PASSPORT_NUMBER":
        userData[chatId].passportNumber = messageText;
        userData[chatId].stage = "EDUCATION";
        bot.sendMessage(chatId, "Yozmoqchi bo'lgan xabaringizni yuboring:");
        break;
      case "EDUCATION":
        userData[chatId].education = messageText;
        userData[chatId].stage = "EDUCATION_DATE";
        bot.sendMessage(chatId, "Qaysi oquv talimni tamomlagansiz?:");
        break;
      case "EDUCATION_DATE":
        userData[chatId].education_date = messageText;
        userData[chatId].stage = "FIELD";
        bot.sendMessage(chatId, "Oquv ta`limni tamomlagan yilingiz?:");
        break;
      case "FIELD":
        userData[chatId].field = messageText;
        userData[chatId].stage = "MESSAGE";
        bot.sendMessage(chatId, "Mutaxasisligingizni yuboring:");
        break;
      case "MESSAGE":
        userData[chatId].message = messageText;
        const {
          name,
          phoneNumber,
          address,
          birthdate,
          passportNumber,
          education,
          education_date,
          field,
          message,
        } = userData[chatId];
        const newUser = new UserData({
          name,
          phoneNumber,
          address,
          birthdate,
          passportNumber,
          message,
          education,
          education_date,
          field,
        });
        await newUser.save();
        // Send confirmation message to the user
        bot.sendMessage(
          chatId,
          "Arizangiz qabul qilindi. Tez orada siz bilan bog'lanamiz."
        );
        // Reset userData for this chatId
        delete userData[chatId];
        break;
      default:
        break;
    }
  }
});

// Route to fetch API data
fastify.get("/api-data", async (_, reply) => {
  try {
    const data = await UserData.find().lean();
    if (data) {
      return reply.send(data);
    }
    return reply.send({ msg: "Malumot topilmadi :(" });
  } catch (error) {
    return reply.send({ error });
  }
});

// Start the server
fastify.listen({ port: process.env.PORT || 8000, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(
    `Server is now listening on ${fastify.server.address().port}`
  );
});
