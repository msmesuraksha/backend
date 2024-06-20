module.exports = app => {
    const logs = require("../../controllers/common/token.controller.js");

    const router = require("express").Router();

    // router.post("/getLogsByPaymentId", logs.getLogsByPaymentId);
    // router.post("/createLog", logs.createLog);
    // router.post("/getAllLogs", logs.getAllLogs);

    app.use("/api/token", router);
};