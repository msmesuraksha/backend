module.exports = app => {
    const debtors = require("../../controllers/user/debtors.controller.js");

    var router = require("express").Router();

    // get debtors of current company
    // router.post("/", debtors.getCreditors);


    // // Retrieve all Tutorials
    // router.get("/", tutorials.findAll);

    // // Retrieve all published Tutorials
    // router.get("/published", tutorials.findAllPublished);

    // // Update a Tutorial with id
    // router.put("/:id", tutorials.update);

    // // Delete a Tutorial with id
    // router.delete("/:id", tutorials.delete);

    // // Create a new Tutorial
    // router.delete("/", tutorials.deleteAll);

    app.use("/api/creditors", router);
};