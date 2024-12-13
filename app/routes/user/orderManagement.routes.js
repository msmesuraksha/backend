module.exports = app => {
    const defaulterEntry = require("../../controllers/user/defaulterEntry.controller.js");
    const orderEntry = require("../../controllers/user/orderManagement.controller.js");
    const router = require("express").Router();
    const jwt = require('jsonwebtoken');
    const auth = require("../../middleware/authentication.js");
    const Authorization = require("../../middleware/userAuthorizations.js");
    router.use(auth);
    router.use(Authorization.companyLoginValidation);

    // send bill
    router.post("/createPurchaseOrder", orderEntry.createPurchaseOrder);
    router.get("/getAllOrderCreateByMe", orderEntry.getAllOrderCreateByMe);
    router.get("/getAllOrderSentToMe", orderEntry.getAllOrderSentToMe);
    router.post("/orderStatusUpdate", orderEntry.orderStatusUpdate);
    router.post("/updatePurchaseOrder", orderEntry.updatePurchaseOrder);


    router.post("/initiatePaymentVerification", defaulterEntry.initiatePaymentVerification);
    router.post("/initiatePaymentVerificationGeneral", defaulterEntry.initiatePaymentVerificationGeneral);

    // router.post("/getAllDefaultInvoicesSentToDebtor", defaulterEntry.getAllInvoicesSentToDebtor);
    router.post("/defaultInvoicesById", defaulterEntry.defaultInvoicesById);
    router.post("/removeDefultingByInvoiceId", defaulterEntry.removeDefultingByInvoiceId);
    router.post("/deleteDefaulterEntryById", defaulterEntry.deleteDefaulterEntryById);

    app.use("/api/orderManagement", router);
};