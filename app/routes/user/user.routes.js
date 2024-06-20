module.exports = app => {
    const user = require("../../controllers/user/user.controller.js");
    const debtor = require("../../controllers/user/debtors.controller.js");

    var router = require("express").Router();
    const jwt = require('jsonwebtoken');
    const auth = require("../../middleware/authentication.js");
    const Authorization = require("../../middleware/userAuthorizations.js");

    // Create a new Tutorial
    router.post("/signup", user.signup);

    router.post("/addEmployee", auth, Authorization.AuthorizeOwner, user.addEmployee);
    router.post("/getAllEmployee", auth, Authorization.AuthorizeOwner, user.getAllEmployees);
    router.post("/login", user.authenticateUser);
    router.post("/refreshToken", user.refreshToken);
    router.post("/logout", auth, user.logout);
    router.get("/getLoginInfo", auth, user.getLoginInfo);
    router.post("/updateUserData", auth, user.updateUserData);

    // router.post("/changePassword",auth, user.changePassword);
    router.post("/changePasswordUsingToken", user.changePasswordUsingToken);
    router.post("/changePasswordUsingOldPass", auth, user.changePasswordUsingOldPass);
    router.post("/forgetPassword", user.forgetPassword);
    router.post("/password-reset/:userId/:token", user.forgetPasswordLink);


    //Temporary APis
    router.post("/delete", user.deleteUser);
    router.post("/changePasswordForce", user.changePasswordForce);

    app.use("/api/user", router);
};