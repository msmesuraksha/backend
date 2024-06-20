const db = require("../../models/user");
const commondb = require("../../models/common");
const dotenv = require('dotenv');

dotenv.config();

const DebtorRating = db.debtorRating;
const Debtor = db.debtors;
const Companies = db.companies;
const Token = commondb.token;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const mailUtility = require('../../util/mailUtility')
const commonUtil = require('../../util/commonUtil')
const mailController=  require('../common/mailTemplates.controller')
const config = process.env;
const Joi = require("joi");
const crypto = require("crypto");
const service = require("../../service/user");
const userService = service.user;
const debtorService = service.debtor;
var constants = require('../../constants/userConstants');


exports.addRating = async(req, res) => {

    try {
        if(req.body.ratingsArray.length ==0){
            return res.status(200).send({ message: "please pass atleast one rating to  add rating.", success: false });
        }
        const oldUser = await Debtor.findOne({ id: req.body.ratingsArray[0].debtorId });
        if (!oldUser) {
            return res.status(404).send({ message: "Debtor does not exist.", success: false });
        }
        if (!req.body.defaulterEntryId){
            return res.status(400).send({ message: "Defaulter entry id is mandatory to add rating..", success: false });
        }
        let resArray = [];
        for(let i = 0; i<req.body.ratingsArray.length; i++){
            let ratingFilter = {
                ratingCompany: req.token.companyDetails.id,
                debtorId: req.body.ratingsArray[i].debtorId,
                question: req.body.ratingsArray[i].questionId
            }
            // check if rating exists already for this question
            // let ratings = await debtorService.getExistingDebtorRating(ratingFilter)
            // if(ratings && ratings.length!=0){
            //     // update existing rating
            //     for(let j=0;j<ratings.length;j++){
            //         ratings[j].response = req.body[i].response
            //         ratings[j].save()
            //     }
            // } else {
                // add new rating
                req.body.ratingsArray[i].ratingCompany = req.token.companyDetails.id
                const rating = await debtorService.addDebtorRating(req.body.ratingsArray[i], req.body.defaulterEntryId)
                await debtorService.addDebtorRatingToDebtor(req.body.ratingsArray[i].debtorId, rating)
            // }
        }
        let givenRating = await DebtorRating.find({ratingCompany: req.token.companyDetails.id}).populate("ratingCompany question")
       res.status(200).json({success: true, message: "Rating added successfully", response: givenRating});

    } catch (err) {
        console.log(err)
        res
            .status(500)
              .send({ message: "Something went wrong", success: false });
    }
};

exports.getAllEmployees = async(req, res) => {
    try {
        let condition = { 'companies': { $in: [req.token.companyDetails.id] } };
        let emmployees = await DebtorRating.find(condition);
        // return all members
        res.status(200).json({ message: "Employee list fetched successfully.", success: true, response: emmployees });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};
