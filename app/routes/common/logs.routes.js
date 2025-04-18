module.exports = app => {
    const logs = require("../../controllers/common/logs.controller.js");

    const router = require("express").Router();

    router.post("/getLogsByPaymentId", logs.getLogsByPaymentId);
    router.post("/createLog", logs.createLog);
    router.post("/getAllLogs", logs.getAllLogs);
    router.post("/getAllLogsByDefaulterEntry", logs.getAllLogsByDefaulterEntry);

    app.use("/api/logs", router);
};