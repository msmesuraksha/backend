const db = require("../../models/user");
const commondb = require("../../models/common/");

const User = db.user;
const Subscription = db.subscription;
const Companies = db.companies;
const Token = commondb.token;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const mailUtility = require('../../util/mailUtility')
const commonUtil = require('../../util/commonUtil')
const mailController=  require('../../controllers/common/mailTemplates.controller')
const config = process.env;
const Joi = require("joi");
const crypto = require("crypto");


exports.addUser = function(user) {
    let passwordChangeNeeded = process.env.ENV == "LOCAL" ? false : true;

    return User.create({
        name: user.name,
        userName: user.emailId,
        phoneNumber: user.mobile,
        secPhoneNumber: user.secPhoneNumber,
        aadharCardNo: user.aadharCardNo,
        password: user.password,
        emailId: user.emailId,
        role: user.role,
        passwordChangeNeeded: passwordChangeNeeded,
        city: user.city,
        state: user.state,
        permissions:  user.permissions,
        isActiveAccount: "ACTIVE"
    });
};


exports.getUserById = function(userId) {
    return  User.findById(userId);
};


exports.updateUser = function(userId, user) {
    let updates= {
        name: user.name,
        phoneNumber: user.mobile,
        secPhoneNumber: user.secPhoneNumber,
        aadharCardNo: user.aadharCardNo,
        password: user.password,
        city: user.city,
        state: user.state,
    }
    return  User.findByIdAndUpdate(userId, updates);
};


exports.addCompanyToUser = function(userId, company) {
    return  User.findByIdAndUpdate(
        userId,
      { $push: { companies: company._id } },
      { new: true, useFindAndModify: false }
    );
};

exports.getUsersWithActiveSubscriptionByCompanyId = async function(companyId) {
    let users = await User.find({
        companies: companyId
    }).populate({
        path: 'companies',
        match: { companyId: companyId }
    }).exec()
        
    const userIds = users.map(user => user._id);

    let subscriptions = await Subscription.find({
        userId: { $in: userIds },
        isActive: true
    }).exec();

    let us = await users.filter(user => {
            const userSubscription = subscriptions.find(sub => sub.userId === user._id.toString());
            return userSubscription && userSubscription.isActive;
        });

    return us;

};

exports.getCompanyOwner = function(creditorCompanyId) {
    return User.findOne({
        companies: { $elemMatch: { $eq: creditorCompanyId } }, // Match companyId within the companies array
        role: "OWNER"
    });
};


exports.findAllDateWise = function(filters){

    let dateFilter = {};

    if (filters.dateSelection === "1m" || filters.dateSelection === "2m" || filters.dateSelection === "3m" || filters.dateSelection === "6m" || filters.dateSelection === "1y") {
        const months = {
            "1m": 1,
            "2m": 2,
            "3m": 3,
            "6m": 6,
            "1y": 12
        };
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months[filters.dateSelection]);
        dateFilter = {
            createdAt: { $gte: startDate }
        };
    } else if (filters.dateSelection === "CUSTOM") {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        dateFilter = {
            createdAt: { $gte: startDate, $lte: endDate }
        };
    } 

    return User.find({dateFilter}).populate('companies','companyName');
};