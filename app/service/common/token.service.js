const db = require("../../models/common");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const { ObjectId } = require('mongodb');
const Token = db.token;
const DebtorRating = db.debtorRating;
const config = process.env;


exports.saveTokenToDb = function(tokenDetails) {

    return Token.create({
        paymentId: tokenDetails.paymentId,
        userType: tokenDetails.userType,
        token: tokenDetails.linkToken
    }); 

};

exports.deleteTokenFromDb = function(tokenDetails){
    return Token.findOneAndDelete({"paymentId": tokenDetails.paymentId, "userType": tokenDetails.userType}); 
}

exports.getTokenByPaymentIdAndUser = function(tokenDetails){
    return Token.findOne({"paymentId": tokenDetails.paymentId, "userType": tokenDetails.userType}); 
}
