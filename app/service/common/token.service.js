const db = require("../../models/common");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const { ObjectId } = require('mongodb');
const Token = db.token;
const DebtorRating = db.debtorRating;
const config = process.env;


exports.saveTokenToDb = function (tokenDetails) {

    return Token.create({
        defaulterEntryId: tokenDetails.defaulterEntryId,
        userType: tokenDetails.userType,
        token: tokenDetails.linkToken
    });

};

exports.deleteTokenFromDb = function (tokenDetails) {
    return Token.findOneAndDelete({ "defaulterEntryId": tokenDetails.defaulterEntryId, "userType": tokenDetails.userType });
}

exports.getTokenByPaymentIdAndUser = function (tokenDetails) {
    return Token.findOne({ "defaulterEntryId": tokenDetails.defaulterEntryId, "userType": tokenDetails.userType });
}
