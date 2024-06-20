module.exports = app => {
    const sendBillTransactions = require("../../controllers/user/sendBillTransactions.controller.js");
    const router = require("express").Router();
    const jwt = require('jsonwebtoken');
    const auth = require("../../middleware/authentication.js");
    const Authorization = require("../../middleware/userAuthorizations.js");
    router.use(auth);
    router.use(Authorization.companyLoginValidation);

    // send bill
    router.post("/create", sendBillTransactions.create);
    router.get("/getAllInvoicesSentToMe", sendBillTransactions.getAllInvoicesSentToMe);
    router.get("/getAllInvoicesRaisedByMe", sendBillTransactions.getAllInvoicesRaisedByMe);
    router.get("/getAllInvoicesForIds", sendBillTransactions.getAllInvoicesForIds);
    router.get("/getInvoicesForDefaulting", sendBillTransactions.getInvoicesForDefaulting);
    router.post("/proceedToDefault", sendBillTransactions.proceedToDefault);
    router.post("/initiatePaymentVerification", sendBillTransactions.initiatePaymentVerification);
    router.post("/updateInvoiceDocuments", sendBillTransactions.updateInvoiceDocuments);
    router.post("/updateInvoiceDocumentsCACertificate", sendBillTransactions.updateInvoiceDocumentsCACertificate);

    router.post("/updateInvoice", sendBillTransactions.updateInvoice);
    router.post("/getAllInvoicesSentToDebtor", sendBillTransactions.getAllInvoicesSentToDebtor);
    router.post("/defaultInvoicesById", sendBillTransactions.defaultInvoicesById);
    router.post("/requestDefaultInvoiceEdit", sendBillTransactions.requestDefaultInvoiceEdit);
    router.post("/removeDefultingByInvoiceId", sendBillTransactions.removeDefultingByInvoiceId);
    router.post("/createDefaultedInvoice", sendBillTransactions.createDefaultedInvoice);

    app.use("/api/transactions", router);
};