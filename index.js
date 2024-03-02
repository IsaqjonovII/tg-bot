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
  region: String,
  city: String,
  street: String,
  birthdate: String,
  passportNumber: String,
  education: String,
  education_date: String,
  field: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const UserData = mongoose.model("UserData", userDataSchema);

// Event handler for '/start' command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  userData[chatId] = { stage: "NAME" }; // Initialize user data and stage
  await bot.sendMessage(chatId, "F.I.O kiriting:");
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
        bot.sendMessage(chatId, "Telefon raqamingiz:");
        break;
      case "PHONE_NUMBER":
        userData[chatId].phoneNumber = messageText;
        userData[chatId].stage = "REGION";
        bot.sendMessage(chatId, "Viloyatingizni kiriting:");
        break;
      case "REGION":
        userData[chatId].region = messageText;
        userData[chatId].stage = "CITY";
        bot.sendMessage(chatId, "Tuman(shahar)ingizni kiriting:");
        break;
      case "CITY":
        userData[chatId].city = messageText;
        userData[chatId].stage = "STREET";
        bot.sendMessage(chatId, "Mahallangizni kiriting:");
        break;
      case "STREET":
        userData[chatId].street = messageText;
        userData[chatId].stage = "BIRTHDATE";
        bot.sendMessage(chatId, "Tug'ilgan sanangizni yuboring (kun/oy/yil):");
        break;
      case "BIRTHDATE":
        userData[chatId].birthdate = messageText;
        userData[chatId].stage = "PASSPORT_NUMBER";
        bot.sendMessage(chatId, "Pasport raqamingizni kiriting:");
        break;
      case "PASSPORT_NUMBER":
        userData[chatId].passportNumber = messageText;
        userData[chatId].stage = "EDUCATION";
        bot.sendMessage(chatId, "Qaysi o'quv yurtini tamomlagansiz? :");
        break;
      case "EDUCATION":
        userData[chatId].education = messageText;
        userData[chatId].stage = "EDUCATION_DATE";
        bot.sendMessage(chatId, "Oquv ta`limni tamomlagan yilingiz?: ");
        break;
      case "EDUCATION_DATE":
        userData[chatId].education_date = messageText;
        userData[chatId].stage = "FIELD";
        bot.sendMessage(chatId, "Mutaxasisligingiz? :");
        break;
      case "FIELD":
        userData[chatId].field = messageText;
        userData[chatId].stage = "MESSAGE";
        bot.sendMessage(chatId, "xabaringizni yozing:");
        break;
      case "MESSAGE":
        userData[chatId].message = messageText;
        userData[chatId].stage = "PREVIEW";
        const previewMsg = `Arizangizni tekshiring: \n\n
        Ism: ${userData[chatId].name}\n
        Telefon: ${userData[chatId].phoneNumber}\n
        Viloyat: ${userData[chatId].region}\n
        Tuman(Shahar): ${userData[chatId].city}\n
        Mahalla: ${userData[chatId].street}\n
        Tug'ilgan sanasi: ${userData[chatId].birthdate}\n
        Pasport raqami: ${userData[chatId].passportNumber}\n
        O'quv yurti: ${userData[chatId].education}\n
        O'quv yilini: ${userData[chatId].education_date}\n
        Mutaxassisligi: ${userData[chatId].field}\n
        Xabar: ${userData[chatId].message}`;

        const previewOpts = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Ha", callback_data: "confirm" },
                { text: "Yo'q", callback_data: "cancel" },
              ],
            ],
          },
        };
        await bot.sendMessage(chatId, previewMsg, previewOpts);
        break;
      case "PREVIEW":
        // Do nothing if user is at preview stage
        break;
      default:
        break;
    }
  }
});

bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  switch (data) {
    case "confirm":
      const {
        name,
        phoneNumber,
        region,
        city,
        street,
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
        region,
        city,
        street,
        birthdate,
        passportNumber,
        message,
        education,
        education_date,
        field,
      });
      await newUser.save();
      await bot.sendMessage(
        chatId,
        "Arizangiz qabul qilindi. Tez orada siz bilan bog'lanamiz."
      );
      delete userData[chatId]; // Reset userData
      break;
    case "cancel":
      userData[chatId].stage = "NAME"; // Reset stage
      await bot.sendMessage(
        chatId,
        "Ariza bekor qilindi. Iltimos, ismingizni kiriting:"
      );
      break;
    default:
      break;
  }

  await bot.deleteMessage(chatId, callbackQuery.message.message_id);
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
