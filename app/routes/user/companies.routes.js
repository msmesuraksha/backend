module.exports = app => {
    const companies = require("../../controllers/user/companies.controller.js");
    const auth = require("../../middleware/authentication.js");
    const Authorization = require("../../middleware/userAuthorizations.js");

    var router = require("express").Router();

    // // Create a new Tutorial
    // router.post("/", tutorials.create);

    // Retrieve all companies
    router.post("/",auth, companies.findAll);
    router.post("/basedOnUserId",auth, companies.findAllByUserId);
    router.post("/add",auth, companies.addCompany);

    router.post("/selectCompany",auth, companies.selectCompanyByCompanyId);

    // // Retrieve all published Tutorials
    // router.get("/published", tutorials.findAllPublished);

    // // Retrieve a single Tutorial with id
    // router.get("/:id", tutorials.findOne);

    // // Update a Tutorial with id
    // router.put("/:id", tutorials.update);

    // // Delete a Tutorial with id
    // router.delete("/:id", tutorials.delete);

    // // Create a new Tutorial
    // router.delete("/", tutorials.deleteAll);

    app.use("/api/companies", router);
};