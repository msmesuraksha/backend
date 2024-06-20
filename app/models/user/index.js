const dbConfig = require("../../config/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
db.url = dbConfig.url;
db.user = require("./user.model.js")(mongoose);
db.companies = require("./companies.model.js")(mongoose);
db.sendBillTransactions = require("./sendBillTransactions.model.js")(mongoose);
db.debtors = require("./debtors.model.js")(mongoose);
db.subscriptionIdRemQuotaMapping = require("./subscriptionIdRemQuotaMapping.model.js")(mongoose);
db.subscription = require("./subscription.model.js")(mongoose);
db.debtorRating = require("./debtorRating.model.js")(mongoose);
db.questions = require("./questions.model.js")(mongoose);
db.defaulterEntry = require("./defaulterEntry.model.js")(mongoose);

//db.admin = require("../admin/admins.model.js")(mongoose);

module.exports = db;