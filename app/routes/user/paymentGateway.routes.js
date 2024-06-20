module.exports = app => {
    const payment = require("../../controllers/user/payment.controller.js");

    const router = require("express").Router();
    const auth = require("../../middleware/authentication.js");

    router.post("/payment", payment.newPayment);
    router.post("/status/:txnId", payment.checkStatus);

    app.use("/api/paymentGateway", router);
};