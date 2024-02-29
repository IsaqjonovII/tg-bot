const { Schema } = require("mongoose");

const userDataSchema = new Schema({
  name: String,
  phoneNumber: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

// Create Mongoose model
const UserData = mongoose.model("UserData", userDataSchema);
module.exports = UserData;
