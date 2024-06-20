const nodemailer = require('nodemailer');

exports.isNotNull = (data) => {
    return data && data != null && data!="" 
}
