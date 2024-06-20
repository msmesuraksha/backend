const nodemailer = require('nodemailer');
const db = require("../models/common");
const axios = require('axios');
const fs = require('fs').promises;

const Documents = db.documents;

exports.sendEmailWithAttachments = async (mailObj, documentIds) => {
    try {

        // let mailTransporter = nodemailer.createTransport({
        //     service: 'gmail',
        //     auth: {
        //         user: process.env.SMTP_EMAILID,
        //         pass: process.env.SMTP_PASSWORD
        //     }
        // });
        let mailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false, // use SSL
            auth: {
                user: process.env.SMTP_EMAILID,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const documents = await Documents.find({ _id: { $in: documentIds } });
        const attachments = [];
        for (const doc of documents) {
            const response = await axios.get(doc.url, { responseType: 'arraybuffer' });
            const attachment = {
                filename: doc.name,
                content: response.data
            };
            attachments.push(attachment);
        }

        let mailDetails = {
            from: "customer@msmesuraksha.com",
            to: mailObj.to,
            cc: mailObj.cc,
            subject: mailObj.subject,
            html: mailObj.description,
            attachments: attachments
        };
        mailTransporter.verify(function (error, success) {
            if (error) {
                console.log("Connection error:", error);
            } else {
                console.log('Server is ready to take our messages');
            }
        });

        mailTransporter.sendMail(mailDetails, function (err, data) {
            if (err) {
                console.log('Error Occurred while sending email', err);
                console.log('Failed email details: ', mailDetails);
            }
        });

    } catch (error) {
        console.error("Error fetching document attachments:", error);
        throw error; // Handle or propagate the error as needed
    }
};

exports.sendMail = (mailObj) => {
    let mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false, // use SSL
        auth: {
            user: process.env.SMTP_EMAILID,
            pass: process.env.SMTP_PASSWORD
        }
    });

    let mailDetails = {
        from: 'customer@msmesuraksha.com',
        to: mailObj.to,
        cc: mailObj.cc,
        subject: mailObj.subject,
        html: mailObj.description
    };

    mailTransporter.sendMail(mailDetails, function (err, data) {
        if (err) {
            console.log('Error Occurred while sending email', err);
            console.log('Failed email details: ', mailDetails);
        }
    });
}
