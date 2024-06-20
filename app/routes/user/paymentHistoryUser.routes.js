module.exports = app => {
    const paymentHistoryUser = require("../../controllers/user/paymentHistoryUser.controller.js");

    const router = require("express").Router();
    const auth = require("../../middleware/authentication.js");
    const Authorization = require("../../middleware/userAuthorizations.js");
    // router.use(Authorization.companyLoginValidation);


    // router.get("/addReceivedPayment", auth, paymentHistoryUser.confirmPaymentByCreditor);
    router.get("/getTransactionsPendingForDocs", auth, Authorization.companyLoginValidation, paymentHistoryUser.getTransactionsPendingForDocs);
    router.get("/getAllApprovedTransactionsUser", auth, Authorization.companyLoginValidation, paymentHistoryUser.getAllApprovedTransactionsUser);
    router.post("/updatePaymentHistoryStatus", auth, Authorization.companyLoginValidation, paymentHistoryUser.updatePaymentHistoryStatus);
    router.post("/uploadSupportingDocuments", auth, Authorization.companyLoginValidation, paymentHistoryUser.uploadSupportingDocuments);
    router.post("/uploadSupportingDocumentsDirect", paymentHistoryUser.uploadSupportingDocuments);
    

    app.use("/api/user", router);
};