const db = require("../../models/user");
const commondb = require("../../models/common/");
const dotenv = require('dotenv');

dotenv.config();

const User = db.user;
const Companies = db.companies;
const Token = commondb.token;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const mailUtility = require('../../util/mailUtility')
const commonUtil = require('../../util/commonUtil')
const mailController = require('../../controllers/common/mailTemplates.controller')
const config = process.env;
const Joi = require("joi");
const crypto = require("crypto");
const service = require("../../service/user/");
const userService = service.user;
const companyService = service.company;
var constants = require('../../constants/userConstants');
const debtorService = service.debtor;
const subscriptionService = service.subscription



exports.signup = async (req, res) => {

    try {
        const oldUser = await User.findOne({ emailId: req.body.emailId });
        if (oldUser) {
            return res.status(409).send({ message: "User Already Exist.", success: false });
        }

        // Check if GSTIN already exists
        const existingCompany = await Companies.findOne({ gstin: req.body.gstin });
        if (existingCompany) {
            return res.status(409).send({ message: "Company with given GSTIN Already Exists.", success: false });
        }

        let password = commonUtil.generateRandomPassword()
        if (process.env.ENV == "LOCAL") {
            password = "password";
        }

        let encryptedPassword = await bcrypt.hash(password, 10);

        // Create a Tutorial
        req.body.role = "OWNER";
        req.body.password = encryptedPassword;
        let user = await userService.addUser(req.body);
        let companyDetails = {
            companyName: req.body.companyName,
            gstin: req.body.gstin,
            companyPan: req.body.companyPan,
            city: req.body.city,
            state: req.body.state,
            zipcode: req.body.zipcode,

            phoneNumber: req.body.mobile,
            secPhoneNumber: req.body.secPhoneNumber,
            emailId: req.body.emailId,
            companyOwner: user._id
        }
        const company = await companyService.addCompany(companyDetails)
        await userService.addCompanyToUser(user._id, company)

        user = await userService.getUserById(user._id).populate("companies");
        req.body.debtorType = "Unknown"
        req.body.customerEmail = user.emailId
        req.body.customerMobile = user.phoneNumber
        req.body.secCustomerMobile = user.secPhoneNumber
        const tempDebtor = await debtorService.addDebtor(req.body)

        // Adding Free Subscription by default for 5 years
        let currentDate = new Date();
        currentDate.setFullYear(currentDate.getFullYear() + 5);
        endDate = currentDate.toISOString();

        req.body.subscriptionPkgId = constants.FREE_PLAN_SUBSCRIPTION_PKG_ID
        req.body.tenure = "NO_LIMIT"
        token = {
            "userDetails": {
                "id": user._id
            }
        }
        await subscriptionService.createSubscription(token, req, currentDate, endDate)

        let replacements = [];
        replacements.push({ target: "password", value: password })
        mailObj = await mailController.getMailTemplate("USER_SIGNUP", replacements)

        mailObj.to = req.body.emailId
        mailUtility.sendMail(mailObj)

        res.status(201).json({ success: true, response: user });

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};


exports.updateUserData = async (req, res) => {

    try {
        const oldUser = await User.findOne({ emailId: req.token.userDetails.emailId });
        if (!oldUser) {
            return res.status(409).send({ message: "User does not exist.", success: false });
        }
        let password = commonUtil.generateRandomPassword()
        let encryptedPassword = await bcrypt.hash(password, 10);
        req.body.password = encryptedPassword;
        let user = await userService.updateUser(req.token.userDetails.id, req.body);
        user = await userService.getUserById(user._id).populate("companies");
        user.token = jwtUtil.generateUserToken(user);
        user.refreshToken = jwtUtil.generateUserRefreshToken(user);

        res.status(200).json({ success: true, response: user });

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};


exports.addEmployee = async (req, res) => {

    try {
        const oldUser = await User.findOne({ emailId: req.body.emailId });
        if (oldUser) {
            return res.status(409).send({ message: "User Already Exist.", success: false });
        }
        let password = commonUtil.generateRandomPassword()
        if (process.env.ENV == "LOCAL") {
            password = "password";
        }
        let encryptedPassword = await bcrypt.hash(password, 10);

        // Create a Tutorial
        req.body.role = "EMPLOYEE";
        req.body.password = encryptedPassword;
        req.body._id = undefined;
        let permissions = [];
        req.body.permissions.forEach(row => {
            if (row.allowed)
                permissions.push(row.apiName);
        })
        req.body.permissions = permissions;

        let user = await userService.addUser(req.body);

        await userService.addCompanyToUser(user._id, req.token.companyDetails)
        user = await userService.getUserById(user._id).populate("companies");

        // Adding Free Subscription by default for 5 years
        let currentDate = new Date();
        currentDate.setFullYear(currentDate.getFullYear() + 5);
        endDate = currentDate.toISOString();

        req.body.subscriptionPkgId = constants.FREE_PLAN_SUBSCRIPTION_PKG_ID
        req.body.tenure = "NO_LIMIT"
        token = {
            "userDetails": {
                "id": user._id
            }
        }
        await subscriptionService.createSubscription(token, req, currentDate, endDate)

        let replacements = [];
        replacements.push({ target: "password", value: password })
        mailObj = await mailController.getMailTemplate("USER_SIGNUP", replacements)

        mailObj.to = req.body.emailId
        mailUtility.sendMail(mailObj)


        res.status(201).json({ success: true, response: user });

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};


exports.getAllEmployees = async (req, res) => {
    try {
        let condition = { 'companies': { $in: [req.token.companyDetails.id] } };
        let emmployees = await User.find(condition);
        // return all members
        res.status(200).json({ message: "Employee list fetched successfully.", success: true, response: emmployees });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};
exports.changePasswordUsingToken = async (req, res) => {
    try {
        var decodedToken = jwt.verify(req.body.passwordChangeToken, config.TOKEN_KEY)
        var query = { _id: decodedToken.userDetails.id, password: decodedToken.userDetails.password };
        var newvalues = { $set: { password: await bcrypt.hash(req.body.password, 10), passwordChangeNeeded: false } };
        console.log(await User.findOne(query))
        let out = await User.findOneAndUpdate(query, newvalues)

        if (out) {
            res.status(200).json({ message: "Password changed successfully.", success: true });
        } else {
            res.status(200).json({ message: "Invalid details provided.", success: false });
        }
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};




exports.forgetPassword = async (req, res) => {
    try {
        const schema = Joi.object({ emailId: Joi.string().email().required() });
        const { error } = schema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        const user = await User.findOne({ emailId: req.body.emailId });
        if (!user){
            return res.status(400).send({ message: "user with given email doesn't exist.", success: false });
        } else if(user.isActiveAccount && user.isActiveAccount == "INACTIVE"){
                res.status(200).send({ message: "User is Inactive", success: false });
        }
        
        let token = await Token.findOne({ userId: user._id });
        if (!token) {
            token = await new Token({
                userId: user._id,
                token: crypto.randomBytes(32).toString("hex"),
            }).save();
        }

        const link = `${process.env.USER_FRONTEND_BASE_URL}/changePassword?userId=${user._id}&token=${token.token}`;
        let replacements = [];
        replacements.push({ target: "PASSWORD_RESET_LINK", value: link })
        mailObj = await mailController.getMailTemplate("FORGET_PASSWORD", replacements)

        mailObj.to = req.body.emailId
        mailUtility.sendMail(mailObj)

        res.status(200).json({ message: "password reset link sent to your email account.", success: true });

    } catch (error) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.forgetPasswordLink = async (req, res) => {
    try {
        const schema = Joi.object({ password: Joi.string().required() });
        const { error } = schema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        const user = await User.findById(req.params.userId);
        if (!user) return res.status(400).send({ message: "invalid link or expired.", success: false });

        const token = await Token.findOne({
            userId: user._id,
            token: req.params.token,
        });
        if (!token) return res.status(400).send({ message: "Invalid link or expired.", success: false });

        user.password = await bcrypt.hash(req.body.password, 10);
        await user.save();
        await token.delete();

        res.status(200).json({ message: "password reset sucessfully.", success: true });

    } catch (error) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.changePasswordUsingOldPass = async (req, res) => {
    try {
        var query = { _id: req.token.userDetails.id };
        var newvalues = { $set: { password: await bcrypt.hash(req.body.password, 10) } };
        let user = await User.findOne(query)

        if (user && (await bcrypt.compare(req.body.oldPassword, user.password))) {
            user.password = await bcrypt.hash(req.body.password, 10);
            user.save()
            res.status(200).json({ message: "Password changed successfully.", success: true });
        } else {
            res.status(200).json({ message: "Invalid details provided.", success: false });
        }
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};



exports.authenticateUser = async (req, res) => {
    try {
        const id = req.body.userName;
        // Validate if user exist in our database
        const user = await User.findOne({ userName: req.body.userName });
        if (!user) {
            res.status(200).send({ message: "User not found, Please signup", success: false });
        // } else if(user.isActiveAccount && user.isActiveAccount == "INACTIVE"){
        //     res.status(200).send({ message: "User is Inactive", success: false });
        } else if (user && (await bcrypt.compare(req.body.password, user.password))) {
            // Create token
            if (!user.passwordChangeNeeded) {
                user.token = jwtUtil.generateUserToken(user);
                user.refreshToken = jwtUtil.generateUserRefreshToken(user);
                res.status(200).json({ message: "Logged in Successfully.", success: true, response: user });
            } else {
                let passwordChangeToken = jwtUtil.generateUserToken(user);
                res.status(200).json({ message: "Please change your password to continue.", success: false, passwordChangeNeeded: true, passwordChangeToken: passwordChangeToken });
            }
        } else {
            res.status(400).send({ message: "Invalid Credentials", success: false });
        }

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    };
};


exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.body.refreshToken;
        let payload = await jwtUtil.verifyRefreshToken(refreshToken)
        let accessToken = ""
        let refToken = ""
        if (payload.companyDetails) {
            accessToken = jwtUtil.generateUserTokenWithCmpDetails(payload.userDetails, payload.companyDetails)
            refToken = jwtUtil.generateUserRefreshTokenWithCmpDetails(payload.userDetails, payload.companyDetails);
        } else {
            accessToken = jwtUtil.generateUserToken(payload.userDetails)
            refToken = jwtUtil.generateUserRefreshToken(payload.userDetails);
        }

        res.send({ message: "New Token generated successfully.", success: true, response: { "token": accessToken, "refreshToken": refToken } })

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    };
};


exports.logout = (req, res) => {
    req.session.destroy();
};
exports.getLoginInfo = async (req, res) => {
    let loggedInUser = await User.findOne({ _id: req.token.userDetails.id });
    let company = await Companies.findOne({ _id: req.token.companyDetails.id });
    loggedInUser = { ...loggedInUser.toJSON(), loggedInCompany: company };
    if (loggedInUser) {
        res.send({ message: 'Login Info', success: true, response: loggedInUser });
    } else
        res.status(403).send({ message: "Unauthorised", success: false });
};


//Temporary APIs
exports.changePasswordForce = async (req, res) => {
    try {
        var query = { emailId: req.body.emailId };
        var newvalues = { $set: { password: await bcrypt.hash(req.body.password, 10), passwordChangeNeeded: false } };
        let out = await User.findOneAndUpdate(query, newvalues)

        if (out) {
            res.status(200).json({ message: "Password changed successfully.", success: true });
        } else {
            res.status(200).json({ message: "User does not exists.", success: false });
        }
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};


exports.deleteUser = async (req, res) => {

    try {
        await User.deleteOne({ emailId: req.body.emailId });
        res.status(201).json({ success: true, message: "User deleted successfully." });

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};
