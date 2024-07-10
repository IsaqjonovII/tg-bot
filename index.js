const fastify = require("fastify")({ logger: true });
const mongoose = require("mongoose");
const cors = require("@fastify/cors");
require("dotenv/config");

mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log("Connected to DB"))
  .catch((error) => console.error(`Connection error: ${error}`));

//! Starting server
fastify.register(cors);

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
  languages: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const UserData = mongoose.model("UserData", userDataSchema);

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

fastify.listen({ port: process.env.PORT || 8000, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(
    `Server is now listening on ${fastify.server.address().port}`,
  );
});
