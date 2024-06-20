const db = require("../../models/user");
const admin_db = require("../../models/admin");
const commondb = require("../../models/common");
const Subscription = db.subscription;
const SubscriptionPkg = admin_db.subscriptionPkg;
const SubscriptionIdRemQuotaMapping = db.subscriptionIdRemQuotaMapping;
const SubscriptionPkgAPIQuotaMapping = admin_db.subscriptionPkgAPIQuotaMapping;
const Token = commondb.token;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const commonUtil = require('../../util/commonUtil')
const { addMonths, format } = require('date-fns');

const service = require('../../service/user')
const subscriptionService =  service.subscription

// subscription Id remaining Quota Mapping methods -----------------------------------------------------------------------------
exports.addSubIdRemQtMapping = async(req, res) => {
    try {
        const mapping = await SubscriptionIdRemQuotaMapping.findOne({ subscriptionId: req.body.subscriptionId, apiName: req.body.apiName});
        if (mapping) {
            return res.status(409).send({ message: "Mapping Already Exists.", success: false });
        }

        const SubscriptionIdRemQuotaMapping = await SubscriptionIdRemQuotaMapping.create({
                subscriptionId: req.body.subscriptionId,
                apiName: req.body.apiName,
                limitRemaining: req.body.limitRemaining
            })

        res.status(201).json({ message: "Mapping added successfully.", success: true, response: SubscriptionIdRemQuotaMapping });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};

exports.getAllSubIdRemQtMapping = async(req, res) => {
    try {
        let mappings = await SubscriptionIdRemQuotaMapping.find();
        res.status(201).json({ message: "Mappings found.", success: true, response: mappings });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};

exports.getSubIdRemQtMappingById = async(req, res) => {
    try {
        const subPkg = await SubscriptionIdRemQuotaMapping.findOne({ _id: req.body.remQuotaId});
        if (subPkg) {
            res.status(201).json({ message: "Mapping found.", success: true, response: subPkg });
        }else{
            res.status(409).send({ message: "Mapping Does Not Exists.", success: false, reponse: "" });
        }
        
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};

exports.updateSubIdRemQtMappingById = async(req, res) => {
    try {
        let updateMapping = {
            subscriptionId: req.body.subscriptionId,
            apiName: req.body.apiName,
            limitRemaining: req.body.limitRemaining
        }
        const updatedMapp = await SubscriptionIdRemQuotaMapping.findByIdAndUpdate({ _id: req.body.remQuotaId}, updateMapping);
        res.status(201).json({ message: "Mapping updated.", success: true, response: updatedMapp});
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};

exports.deleteSubIdRemQtMappingById = async(req, res) => {
    try {
        const remMapping = await SubscriptionIdRemQuotaMapping.findByIdAndRemove({ _id: req.body.remQuotaId });
        res.status(201).json({ message: "Mapping deleted.", success: true, response: remMapping });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};



// subscription methods --------------------------------------------------------------------------------------------------------


exports.addSubscription = async(req, res) => {
    try {
        const sub = await Subscription.find({ userId: req.token.userDetails.id, isActive: true});
        let endDate = null;
        let startDate = new Date();
        if (sub) {
            if(req.body.isForce == false){
                return res.status(409).send({ message: "Subscription Already Exists.", success: false });
            }else if(req.body.isForce == true){
                // found subscription and force is true here, disable previous subscription here
                // let updateData = {
                //     isActive: false
                // }
                for( elem of sub){
                    elem.isActive = false
                    elem.save()
                }
                // const updatedMapp = await Subscription.findByIdAndUpdate({ _id: { $in: sub }}, updateData );
            }
        }

        if(req.body.tenure == "Monthly"){
            let updatedDate= addMonths(startDate, 1);
            endDate = format(updatedDate, 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx')
        }else if(req.body.tenure == "Yearly"){
            let currentDate = new Date();
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            endDate = currentDate.toISOString();
        }

        if (sub) {
            // after creating new subscription, if already mapping for that subscriber is present, remove that mapping, make new below
            let subIds = sub.map(x => x._id)
            let varx = await SubscriptionIdRemQuotaMapping.deleteMany({ subscriptionId: {$in: subIds}});
        }
        let RSubscription = await subscriptionService.createSubscription(req.token, req, startDate, endDate)

        // const RSubscription = await Subscription.create({
        //         userId: req.token.userDetails.id,
        //         subscriptionPkgId: req.body.subscriptionPkgId,
        //         startDate: startDate.toISOString(),
        //         endDate: endDate,
        //         tenure: req.body.tenure,
        //         isActive: true
        //     })

        // let subscriptionIdRemQuota = []
        // // bring subscription package api quota from pkg id and check with tenure, assign limit and apiName on that basis
        // let tempObj = await SubscriptionPkgAPIQuotaMapping.find({subscriptionPkgId: req.body.subscriptionPkgId});
        // for(let i = 0; i < tempObj.length; i++){
        //     let limit = null;
        //     let api = tempObj[i].apiName;

        //     if(req.body.tenure == "Monthly"){
        //         limit = tempObj[i].monthlyQuotaLimit;
        //     }else if(req.body.tenure == "Yearly"){
        //         limit = tempObj[i].yearlyQuotaLimit;
        //     }

        //     // create new mapping for remaining quota
        //     subscriptionIdRemQuota.push(await SubscriptionIdRemQuotaMapping.create({
        //             subscriptionId: RSubscription._id,
        //             apiName: api,
        //             limitRemaining: limit
        //     }))
        // }
        // RSubscription.subscriptionIdRemQuotaMapping = subscriptionIdRemQuota
        // RSubscription.save()
        

        res.status(201).json({ message: "Subscription added successfully.", success: true, response: RSubscription });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};

exports.getAllSubscription = async(req, res) => {
    try {
        let sub = await Subscription.find({ userId: req.token.userDetails.id, isActive: true})
        .populate('subscriptionIdRemQuotaMapping'); // Adjust the path based on your actual field name

        res.status(201).json({ message: "Subscriptions found.", success: true, response: sub });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};

exports.getAllSubscriptionPkgsForUser = async(req, res) => {
    try {
        let subscriptionPkgs = await SubscriptionPkg.find({
                $or: [
                    { subscriptionFor: { $elemMatch: { $eq: req.token.userDetails.emailId } } },
                    { subscriptionFor: { $exists: true, $eq: [] } }
                ]
            
        });
        res.status(201).json({ message: "Subscription Packages found.", success: true, response: subscriptionPkgs });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.getSubscriptionById = async(req, res) => {
    try {
        const subPkg = await Subscription.findOne({ _id: req.body.subscriptionId});
        if (subPkg) {
            res.status(201).json({ message: "Subscription found.", success: true, response: subPkg });
        }else{
            res.status(409).send({ message: "Subscription Does Not Exists.", success: false, reponse: "" });
        }
        
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};

exports.deleteSubscriptionById = async(req, res) => {
    try {
        const sub = await Subscription.findByIdAndRemove({ _id: req.body.subscriptionId });
        res.status(201).json({ message: "Subscription deleted.", success: true, response: sub });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false, reponse: "" });
    }
};