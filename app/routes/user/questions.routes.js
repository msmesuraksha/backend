module.exports = app => {
    const questions = require("../../controllers/user/questions.controller.js");

    const router = require("express").Router();
    const auth = require("../../middleware/authentication.js");

    router.get("/getQuestionById", auth, questions.getQuestionById);
    router.get("/getAllQuestions", auth, questions.getAllQuestions);

    app.use("/api/questions", router);
};