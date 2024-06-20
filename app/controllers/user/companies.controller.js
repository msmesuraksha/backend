const db = require("../../models/user");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const { ObjectId } = require('mongodb');
const axios = require('axios');
const Companies = db.companies;
const Subscription = db.subscription;
const SubscriptionIdRemQuotaMapping = db.subscriptionIdRemQuotaMapping;
const User = db.user;
const config = process.env;
const service = require("../../service/user/");
const userService = service.user;
const companyService = service.company;
const debtorService = service.debtor;

// Create and Save a new Tutorial
exports.addCompany = async(req, res) => {
    // Validate request
    // Create a Tutorial
    try {

        const loggedInUser = await User.findOne({ emailId: req.token.userDetails.emailId });

        const uniGST = await Companies.findOne({gstin: req.body.gstin})
        if(uniGST){
            return res.status(409).send({ message: "Company Already Exists with this gstin", success: false, response: "" });
        }
        req.body.phoneNumber = req.body.mobile;
        req.body.secPhoneNumber= req.body.secPhoneNumber;
        req.body.companyOwner= req.token.userDetails._id;

        
        const company = await companyService.addCompany(req.body);

        const debtor = await debtorService.updateExistingDebtorDetailsUsingRegisteredCompanyDetails(company.gstin, company);
        
        await userService.addCompanyToUser(req.token.userDetails.id, company);
        const user = await userService.getUserById( req.token.userDetails.id ).populate("companies");

        req.body.debtorType = "Unknown"
        req.body.firstname = user.name
        req.body.customerEmail = user.emailId
        req.body.customerMobile = req.body.mobile
        req.body.secCustomerMobile = req.body.secPhoneNumber
        const tempDebtor = await debtorService.addDebtor(req.body)

        // await userService.addUserToCompany(company._id, loggedInUser);
        // return new user
        res.status(200).json({message: 'Users list fetched.', success: true, response: company});
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};


exports.findAll = async(req, res) => {
    try{
        const title = req.query.title;
        data = await Companies.find();
        res.status(200).json({message: 'Companies list fetched.', success: true, response: data});
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.findAllByUserId = async(req, res) => {

    try{
        const user = await User.findById(req.token.userDetails.id).populate("companies");
        if(!user){ 
            res.status(403).json({message: 'Companies not found for user.', success: true, response: user.companies});
        }
        res.status(200).json({message: 'Companies list fetched for user.', success: true, response: user.companies});
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
        
};

exports.selectCompanyByCompanyId = async(req, res) => {
    try{
        const userToken = req.token.userDetails;
        company = await Companies.findOne({_id: req.body.companyId});
        if (!company){
            res.status(404).send({ message: "Not found company ", success: false });
        }
        const companyDetails = company.toJSON();
        companyDetails.id = companyDetails.id.toString();

        // console.log({userToken, companyDetails});
        const newToken = jwtUtil.generateUserTokenWithCmpDetails(userToken, companyDetails);
        const newRefreshToken = jwtUtil.generateUserRefreshTokenWithCmpDetails(userToken, companyDetails);
        res.status(200).json({  message: "Selected a company", success: true, response: {"token": newToken, "refreshToken": newRefreshToken}});
            
    }catch(error){
        console.log(error);
        res
            .status(500)
            .send({ message: "Error retrieving company", success: false });
    }

}
