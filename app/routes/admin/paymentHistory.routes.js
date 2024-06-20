module.exports = app => {
    const paymentHistory = require("../../controllers/admin/paymentHistory.controller.js");
    const pS = require("../../service/admin/paymentHistory.service.js");

    const router = require("express").Router();
    const auth = require("../../middleware/authentication.js");

    router.get("/getAllApprovedTransactions", auth, paymentHistory.getAllApprovedTransactions);
    router.get("/getAllComplaintApproved", auth, paymentHistory.getAllComplaintApproved);
    router.post("/getAllTransactionsForOtherStatus", auth, paymentHistory.getAllTransactionsForOtherStatus);
    router.get("/getAllDisputedTransactions", auth, paymentHistory.getAllDisputedTransactions);
    router.post("/downloadAllDisputedTransactions", auth, paymentHistory.downloadAllDisputedTransactions);
    router.post("/downloadAllTransactions", auth, paymentHistory.downloadAllTransactions);

    router.post("/approveOrRejectPayment", auth, paymentHistory.approveOrRejectPayment);
    router.post("/askForSupportingDocument", auth, paymentHistory.askForSupportingDocument);
    router.post("/getDocumentsRequiredFromPaymentId", paymentHistory.getDocumentsRequiredFromPaymentId);
    router.post("/takeUpRequest", auth, paymentHistory.takeUpRequest);
    router.post("/assignPendingPaymentHistories", pS.assignPendingPaymentHistories);  // for testing, delete / comment later
    // router.post("/findByPendingWithAdminEmailIdAndUpdate", pS.findByPendingWithAdminEmailIdAndUpdate); // for testing , delete/ comment later

    router.post("/getAllDocumentsNeededTransactionsForLoggedInUser", auth, paymentHistory.getAllDocumentsNeededTransactionsForLoggedInUser);

    app.use("/api/admin", router);
};