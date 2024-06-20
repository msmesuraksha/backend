module.exports = app => {
    const dashboard = require("../../controllers/user/dashboard.controller.js");
    const auth = require("../../middleware/authentication.js");

    var router = require("express").Router();

    // send bill
    // router.post("/getData", auth, dashboard.getData);

    // // Retrieve all Tutorials
    // router.get("/", tutorials.findAll);

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

    app.use("/api/dashboard", router);
};