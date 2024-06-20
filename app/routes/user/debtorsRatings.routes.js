module.exports = app => {
    const debtorRating = require("../../controllers/user/debtorRating.controller.js");

    const router = require("express").Router();
    const jwt = require('jsonwebtoken');
    const auth = require("../../middleware/authentication.js");
    const Authorization = require("../../middleware/userAuthorizations.js");

    // Add a debtor
    router.post("/add",auth,debtorRating.addRating);
    // router.get("/getAllDebtorsByCompanyId", auth, debtorRating.getAllDebtorsByCompanyId);
    // get debtors of current company

    // router.use(Authorization.companyLoginValidation);

    app.use("/api/ratings", router);
};