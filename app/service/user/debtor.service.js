const db = require("../../models/user");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const { ObjectId } = require('mongodb');
const Debtor = db.debtors;
const Companies = db.companies;
const DebtorRating = db.debtorRating;
const config = process.env;


exports.addDebtor = function(debtorDetails) {
    let joinedOn = new Date();
    joinedOn = new Date(joinedOn.getFullYear(), joinedOn.getMonth(), joinedOn.getDate());
    
    return Debtor.create({
        companyName: debtorDetails.companyName,
        gstin: debtorDetails.gstin,
        companyPan: debtorDetails.companyPan,

        debtorType: debtorDetails.debtorType,
        salutation: debtorDetails.salutation,
        firstname: debtorDetails.firstname,
        lastname: debtorDetails.lastname,
        customerEmail: debtorDetails.customerEmail,
        customerMobile: debtorDetails.customerMobile,
        secCustomerMobile: debtorDetails.secCustomerMobile,
        address1: debtorDetails.address1,
        address2: debtorDetails.address2,
        city: debtorDetails.city,
        state: debtorDetails.state,
        zipcode: debtorDetails.zipcode,
        joinedOn: joinedOn,

        creditorCompanyId: debtorDetails.creditorCompanyId
    });
};

exports.addDebtorRating = function(rating, defaulterEntryId) {
    let ratingObj = {
        debtorId: rating.debtorId,
        defaulterEntryId: defaulterEntryId,
        ratingCompany: rating.ratingCompany,
        question: rating.questionId,
        response: rating.response
    }
    return DebtorRating.create(ratingObj);
};


exports.getExistingDebtorRating = function(ratingFilter) {
    return DebtorRating.find(ratingFilter);
};

exports.updateDebtorCompanyNameBasedOnGSTIN = function(GSTIN, companyName){
    return Debtor.updateMany({"gstin": GSTIN}, {"companyName": companyName});
};


exports.updateExistingDebtorDetailsUsingRegisteredCompanyDetails = function(GSTIN, companyDetails){

    return Debtor.updateMany({"gstin": GSTIN}, { $set:{
            companyName: companyDetails.companyName,
            companyPan: companyDetails.companyPan,
        
            customerEmail: companyDetails.emailId,
            customerMobile: companyDetails.phoneNumber,
            secCustomerMobile: companyDetails.secPhoneNumber,
            address1: companyDetails.address1,
            address2: companyDetails.address2,
            city: companyDetails.city,
            state: companyDetails.state,
            zipcode: companyDetails.zipcode,
        }
    });
};

function buildDebtorQuery(companyDetails) {
    let queryConditions = [];

    if (companyDetails.companyPan) {
        queryConditions.push({ companyPan: companyDetails.companyPan });
    }

    if (companyDetails.gstin) {
        queryConditions.push({ gstin: companyDetails.gstin });
    }

    if (companyDetails.companyName) {
        queryConditions.push({ companyName: { $regex: companyDetails.companyName, $options: "i" } });
    }

    let condition = queryConditions.length ? { $or: queryConditions } : {};

    return condition;
}


exports.companySearch = function(companyDetails) {
    condition = buildDebtorQuery(companyDetails)
        return Debtor.find(condition);
};
  
exports.addDebtorRatingToDebtor = function(debtorId, rating) {
    
    return Debtor.findByIdAndUpdate(
        debtorId,
      { $push: {   
                ratings: rating._id
            } 
        },
      { new: true, useFindAndModify: false }
    );

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
            joinedOn: { $gte: startDate }
        };
    } else if (filters.dateSelection === "CUSTOM") {
        const startDate = new Date(filters.startDate);
        // startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(filters.endDate);
        // endDate.setHours(0, 0, 0, 0);

        dateFilter = {
            joinedOn: { $gte: startDate, $lte: endDate }
        };
    }

    return Debtor.find(dateFilter);
};

exports.getDebtorAndCompanyOwnerEmails = async function(GSTIN){
    
    const debtors = await Debtor.find({ gstin: GSTIN }).select("customerEmail");
    const debtorEmails = debtors.map(debtor => debtor.customerEmail);

    const company = await Companies.findOne({ gstin: GSTIN }).populate({
        path: 'companyOwner',
        // match: { role: 'OWNER' },
        select: 'emailId'
    });
    
    const ownerEmails = company && company.companyOwner ? [company.companyOwner.emailId] : [];

    const ccEmails = [...debtorEmails, ...ownerEmails];

    return Array.from(new Set(ccEmails));
}


exports.getCompanyOwnerEmail = async function(GSTIN){
    
    const company = await Companies.findOne({ gstin: GSTIN }).populate({
        path: 'companyOwner',
        // match: { role: 'OWNER' },
        select: 'emailId'
    });
    
    const ownerEmail = company && company.companyOwner ? company.companyOwner.emailId : "";

    return ownerEmail;
}