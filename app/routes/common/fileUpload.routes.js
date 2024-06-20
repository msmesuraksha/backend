const multer = require('multer');

module.exports = app => {
    const fileUpload = require("../../controllers/common/fileUpload.controller.js");
    const upload = multer();
    const auth = require("../../middleware/authentication.js");

    const router = require("express").Router();

    router.post("/upload", auth, upload.single('file'), fileUpload.uploadFile);
    router.post("/uploadDirect", upload.single('file'), fileUpload.uploadFile);
    router.post("/uploadMultiple", auth, upload.array('files'), fileUpload.uploadMultipleFile);
    router.post("/uploadMultipleDirect", upload.array('files'), fileUpload.uploadMultipleFile);
    router.get("/allFileData", fileUpload.getAllUploadedDocuments);
    router.get("/getGeneralDocuments", auth, fileUpload.getAllGeneralDocuments);
    router.post("/download", fileUpload.downloadFile);

    app.use("/api/files", router);
};