module.exports = app => {
    const dashboard = require("../../controllers/admin/dashboard.controller.js");

    const router = require("express").Router();
    const auth = require("../../middleware/authentication.js");

    router.post("/getAdminData", auth, dashboard.getAdminData);
    // router.post("/findByPendingWithAdminEmailIdAndUpdate", pS.findByPendingWithAdminEmailIdAndUpdate); // for testing , delete/ comment later

    app.use("/api/admin/dashboard", router);
};