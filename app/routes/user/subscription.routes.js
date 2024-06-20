module.exports = app => {
    const subscription = require("../../controllers/user/subscription.controller.js");

    const router = require("express").Router();
    const jwt = require('jsonwebtoken');
    const auth = require("../../middleware/authentication.js");

    // subscription Id remaining Quota Mapping routes
    router.post("/addSubIdRemQtMapping", auth, subscription.addSubIdRemQtMapping);
    router.get("/getAllSubIdRemQtMapping", auth, subscription.getAllSubIdRemQtMapping);
    router.post("/getSubIdRemQtMappingById", auth, subscription.getSubIdRemQtMappingById);
    router.post("/updateSubIdRemQtMappingById", auth, subscription.updateSubIdRemQtMappingById);
    router.post("/deleteSubIdRemQtMappingById", auth, subscription.deleteSubIdRemQtMappingById);

    // subscription routes
    router.post("/addSubscription", auth, subscription.addSubscription);
    router.get("/getAllSubscription", auth, subscription.getAllSubscription);
    router.get("/getAllSubscriptionPkgsForUser", auth, subscription.getAllSubscriptionPkgsForUser);
    router.post("/getSubscriptionById", auth, subscription.getSubscriptionById);
    router.post("/deleteSubscriptionById", auth, subscription.deleteSubscriptionById);

    app.use("/api/subscription", router);
};