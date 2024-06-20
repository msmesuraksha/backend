const db = require("../../models/common");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const Documents = db.documents;
const constants = require('../../constants/userConstants');
const service = require('../../service/common');
const { output } = require("pdfkit");
const AzureBlobService = service.azureBlobService;

// exports.uploadFile = async (req, res) => {
//     try {
//         const file = req.file;
//         if (!file) {
//             return res.status(400).send('No file uploaded.');
//         }

//         const { fileUrl, uniqueName } = await AzureBlobService.uploadFileToBlob(file.buffer, file.originalname);

//         let newType;
//         if(req.body.type == ""){
//             newType = constants.UPLOAD_FILE_TYPE.INVOICE
//         }else if(req.body.type == "GENERAL"){
//             newType = constants.UPLOAD_FILE_TYPE.GENERAL
//         }

//         const savedFile = await Documents.create({
//             userId: req.token.userDetails.id,
//             name: req.file.originalname,
//             url: fileUrl,
//             uniqueName: uniqueName,
//             type: newType
//         }); 
//         res.json({message: 'File Uploaded successfully.', success: true, response: { documentId: savedFile._id , fieldName: req.body.fieldName , fileUrl: savedFile.url}});

//     } catch (error) {
//         console.log(error);
//         res.status(500).send({ message: "Something went wrong", success: false });
//     }
// };

const upload = async (req, file) => {
    const { fileUrl, uniqueName } = await AzureBlobService.uploadFileToBlob(file.buffer, file.originalname);

    let newType;
    if (req.body.type == "") {
        newType = constants.UPLOAD_FILE_TYPE.INVOICE;
    } else if (req.body.type == "GENERAL") {
        newType = constants.UPLOAD_FILE_TYPE.GENERAL;
    }

    const savedFile = await Documents.create({
        userId: req.token.userDetails.id,
        name: file.originalname,
        url: fileUrl,
        uniqueName: uniqueName,
        type: newType,
    });

    return {
        documentId: savedFile._id,
        fieldName: req.body.fieldName,
        fileUrl: savedFile.url,
    };
};

exports.uploadFile = async (req, res) => {
    try {
        if(req.body.token){
            let token =  jwtUtil.verifyCustomToken(req.body.token)
            if(token) {
                req.token = {userDetails: {id: token.userId}}
            } else {
                return res.status(401).send({ success: false, message: 'Failed to authenticate token.' });
            }    
        }
        const file = req.file;

        if (!file) {
            return res.status(400).send('No files uploaded.');
        }

        const uploadResults = await upload(req, file);

        res.json({ message: 'Files Uploaded successfully.', success: true, response: uploadResults });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Something went wrong", success: false });
    }
};


exports.uploadMultipleFile = async (req, res) => {
    try {
        console.log(req.body.token )
        if(req.body.token){
            let token =  jwtUtil.verifyCustomToken(req.body.token)
            if(token) {
                req.token = {userDetails: {id: token.userId}}
            } else {
                return res.status(401).send({ success: false, message: 'Failed to authenticate token.' });
            }    
        }

        let out = [];
        let files = req.files
        if (!files || files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        out  = await Promise.all(files.map(file => upload(req, file)));
        res.json({message: 'File Uploaded successfully.', success: true, response: out});

    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Something went wrong", success: false });
    }
};

exports.downloadFile = async (req, res) => {
    try {
        const fileId = req.body.documentId;
        const file = await Documents.findById(fileId);

        if (!file) {
            return res.status(404).send('File not found');
        }

        const stream = await AzureBlobService.downloadBlob(file.url);
        res.setHeader('Content-Disposition', `attachment; filename=${file.name}`);
        stream.pipe(res);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error downloading file');
    }
};

exports.getAllUploadedDocuments = async(req, res) => {
    let allDocuments;
    try {
        allDocuments = await Documents.find();

    } catch (err) {
        console.log(err)
    }

    return template;
};

exports.getAllGeneralDocuments = async(req, res) => {
    let generalDocuments = [];
    try {
        generalDocuments = await Documents.find({userId: req.token.userDetails.id, type: constants.UPLOAD_FILE_TYPE.GENERAL});
        return res.status(200).send({ message: "All General Documents", success: true, response: generalDocuments });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};
