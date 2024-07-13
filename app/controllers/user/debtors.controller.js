const db = require("../../models/user");
const commondb = require("../../models/common/");
const Debtors = db.debtors;
const Companies = db.companies;
const SendBillTrans = db.sendBillTransactions;
const Token = commondb.token;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const commonUtil = require('../../util/commonUtil')
const service = require("../../service/user/");
const debtorService = service.debtor
const defaulterEntryService = service.defaulterEntry;
const constants = require('../../constants/userConstants');
const subscriptionService = service.subscription;


// Create and Save a new Tutorial
exports.add = async (req, res) => {

    try {
        if (req.token.userDetails.isActiveAccount == "INACTIVE") {
            return res.status(200).json({ message: 'Not Authorised to add debtor', success: true, response: "" });
        }
        const companyId = req.token.companyDetails.id;
        let condition = { creditorCompanyId: companyId, gstin: req.body.gstin };
        let debtor = await Debtors.find(condition)
        if (debtor && debtor.length > 0) {
            res.send({ message: 'Debtor Already exists', success: false, response: debtor });
            return
        }

        condition = { gstin: req.body.gstin, debtorType: "Unknown" };
        debtor = await Debtors.deleteMany(condition)
        //console.log(req.token)
        req.body.creditorCompanyId = companyId
        //console.log("logged in company details", req.body.companyDetails)


        const data = await debtorService.addDebtor(req.body)
        res.send({ message: 'Debtor added', success: true, response: data });

    } catch (error) {
        res.status(500).send({
            message: error.message || "Something went wrong.",
            success: false,
            response: null
        });
    }

};


exports.getDebtors = async (req, res) => {

    try {

        const id = req.token.companyDetails.id;
        let condition = { creditorCompanyId: id };
        const data = await Debtors.find(condition)
        res.send({ message: 'found', success: true, response: data });

    } catch (error) {
        res.status(500).send({
            message: error.message || "Something went wrong.",
            success: false,
            response: null
        });
    }

};



exports.getDebtorDetails = async (req, res) => {

    try {

        const id = req.token.companyDetails.id;
        if (!req.body.gstin && !req.body.companyPan) {
            res.send({ message: 'Please pass either gstin or companyPan to fetch the debtor Information', success: false });
            return;
        }
        let filter = {};
        if (req.body.gstin && req.body.gstin != "") {
            filter.gstin = req.body.gstin;
        }
        if (req.body.companyPan && req.body.companyPan != "") {
            filter.companyPan = req.body.companyPan;
        }
        // let condition = { creditorCompanyId: id };
        let data = await Debtors.findOne(filter)
        let companydetails = await Companies.findOne(filter).populate("companyOwner")
        if (companydetails) {
            data = data.toJSON()
            data.companyName = companydetails.companyName
            data.city = companydetails.city
            data.state = companydetails.state
            data.address1 = companydetails.address1
            data.address2 = companydetails.address2
            data.zipcode = companydetails.zipcode
            data.firstname = companydetails.companyOwner?.name ? companydetails.companyOwner?.name : data.firstname
            data.customerEmail = companydetails.companyOwner?.emailId ? companydetails.companyOwner?.emailId : data.customerEmail
            data.customerMobile = companydetails.companyOwner?.phoneNumber ? companydetails.companyOwner?.phoneNumber : data.customerMobile
            data.secCustomerMobile = companydetails.companyOwner?.secPhoneNumber ? companydetails.companyOwner?.secPhoneNumber : data.secCustomerMobile
        }
        res.send({ message: 'Debtor details found', success: true, response: data });

    } catch (error) {
        console.log(e)
        res.status(500).send({
            message: error.message || "Something went wrong.",
            success: false,
            response: null
        });
    }

};


exports.getCreditors = async (req, res) => {

    try {

        const pancard = req.body.session.companyDetails.companyPan;
        let condition = { companyPan: pancard };

        const data = await Debtors.find(condition)
        res.send({ message: 'found creditors', success: true, response: data });

    } catch (error) {
        res.status(500).send({
            message: error.message || "Something went wrong.",
            success: false,
            response: null
        });
    }

};

exports.getAllDebtorsByCompanyId = async (req, res) => {
    try {
        const dbtrs = await Debtors.find({ creditorCompanyId: req.token.companyDetails.id }).populate({ path: 'ratings', populate: ['question'] });
        res.status(200).json({ message: 'Debtors list fetched for company.', success: true, response: dbtrs });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.getAllCreditorsByCompanyId = async (req, res) => {
    try {
        const dbtrs = await Debtors.find({ gstin: req.token.companyDetails.gstin });
        //console.log(dbtrs);
        let crdtrs = [];
        for (let i = 0; i < dbtrs.length; i++) {
            console.log(dbtrs[i]);
            crdtrs[i] = await Companies.findOne({ _id: dbtrs[i].creditorCompanyId });
            //console.log(crdtrs[i]);
        }
        res.status(200).json({ message: 'Creditors list fetched for company.', success: true, response: crdtrs });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.getAllCreditorsByDebtorId = async (req, res) => {
    try {
        const dbtr = await Debtors.findOne({ _id: req.body.debtorId });
        const dbtrs = await Debtors.find({ gstin: dbtr.gstin });
        let credIds = dbtrs.map(item => item.creditorCompanyId);

        const crdtrs = await Companies.find({ _id: { $in: credIds } }).populate("companyOwner");
        let allEntries = []
        for (let elem of dbtrs) {
            let entries = await defaulterEntryService.findInvoicesForCreditorPendingByDebtor(elem.creditorCompanyId, elem._id.toString(), { $or: [{ status: constants.INVOICE_STATUS.PENDING }, { status: constants.INVOICE_STATUS.DEFAULTED }] }).populate("invoices")
            allEntries.push(...entries)
            console.log(allEntries)
        }
        let totalAmount = 0;
        for (let elem of allEntries) {
            let i = 0;
            // finding matching creditor from invoice
            while (i < crdtrs.length && crdtrs[i]._id != elem.creditorCompanyId) {
                i++;
            }
            if (i >= crdtrs.length) {
                console.log("creditor not found")
                break;
            }
            crdtrs[i] = crdtrs[i].toJSON()

            // finding lowest duefrom date
            for (let invoice of elem.invoices) {
                if (crdtrs[i].dueFrom) {
                    if (crdtrs[i].dueFrom > invoice.dueDate) {
                        crdtrs[i].dueFrom = invoice.dueDate
                    }
                } else {
                    crdtrs[i].dueFrom = invoice.dueDate
                }
            }
            crdtrs[i].dueFrom = commonUtil.getDateInGeneralFormat(crdtrs[i].dueFrom)
            crdtrs[i].status = elem.status
            crdtrs[i].latestStatus = elem.latestStatus

            //finding totalAmount
            crdtrs[i].totalAmount = 0;
            crdtrs[i].totalAmount += Number(elem.totalAmount)
        }

        res.status(200).json({ message: 'Creditors list fetched for company.', success: true, response: crdtrs });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.companySearch = async (req, res) => {
    try {
        // find in subscription by userId and isActive  => get subscription Id
        // find Rem Quota mapp . limit remaining using sId
        // const updateRemQuota = await subscriptionService.updateRemQuotaForAPI(req.token.userDetails, req.originalUrl);

        const updateRemQuota = true

        if (updateRemQuota) {

            /*
            // data = await companyService.findCompany(req.body);
            data = await debtorService.companySearch(req.body).populate("ratings");

            const dbtrs = await Debtors.find({gstin: data[i].gstin});
            let debtordIds = dbtrs.map(item => item._id);
    
            let allEntries = await defaulterEntryService.findInvoicesPendingByDebtorIds( debtordIds, { $or: [ {status: constants.INVOICE_STATUS.PENDING} , {status: constants.INVOICE_STATUS.DEFAULTED}] }).populate("invoices")

            for(let i=0;i<data.length;i++) {
                data[i] = data[i].toJSON()
                data[i].totalAmount = 0;

                for( let elem of allEntries){
                    // finding lowest duefrom date
                    for(let invoice of elem.invoices){
                        if(data[i].dueFrom){
                            if(data[i].dueFrom > invoice.dueDate) {
                                data[i].dueFrom = invoice.dueDate
                            }
                        } else {
                            data[i].dueFrom = invoice.dueDate
                        }
                    }
                    data[i].dueFrom = commonUtil.getDateInGeneralFormat(data[i].dueFrom)
        
                    //finding totalAmount
                    data[i].totalAmount += Number(elem.totalAmount)
                }
        
            }
            if (!data){
                res.status(404).send({ message: "Not found company ", success: false, response: ""});
            } else{
                res.status(200).json({ message: "Search successful", success: true, response: data});
            }
            */

            const debtors = await debtorService.companySearch(req.body).populate({ path: 'ratings', populate: ['question'] });

            // Iterate through each debtor
            const debtorsWithDefaulterEntries = await Promise.all(debtors.map(async (debtor) => {
                // Fetch defaulter entries for the debtor
                // const defaulterEntries = await DefaulterEntry.find({ debtor: debtor._id }).populate('invoices');
                let defaulterEntries = await defaulterEntryService.findInvoicesPendingByDebtorIds([debtor._id], {
                    $or: [{ userSuspended: false }, { userSuspended: { $exists: false } }]
                }).populate("invoices")

                // Calculate total amount pending for the debtor
                const totalAmountPending = defaulterEntries.reduce((total, entry) => total + Number(entry.totalAmount), 0);

                // Find the lowest due date among all defaulter entries invoices
                const dueDates = defaulterEntries.map(entry => entry.invoices.map(invoice => invoice.dueDate)).flat();
                const lowestDueDate = dueDates.length > 0 ? new Date(Math.min(...dueDates)) : null;

                // Return debtor information with defaulter entries, total amount pending, and lowest due date
                debtor = debtor.toJSON();
                debtor.totalAmount = totalAmountPending;
                debtor.dueFrom = commonUtil.getDateInYYYYMMDDFormat(lowestDueDate);
                return debtor;
            }));

            const groupedDebtors = debtorsWithDefaulterEntries.reduce((acc, debtor) => {
                if (!acc[debtor.gstin]) {
                    acc[debtor.gstin] = [];
                }
                acc[debtor.gstin].push(debtor);
                return acc;
            }, {});

            // Function to get the lowest due date among all valid due dates in the group
            function getLowestDueDate(debtorsGroup) {
                const dueDates = debtorsGroup
                    .filter(date => date.dueFrom && date.dueFrom != "")
                    .map(debtor => new Date(debtor.dueFrom));

                return dueDates.length > 0 ? new Date(Math.min(...dueDates)) : null;
            }

            const mergedDebtors = Object.values(groupedDebtors).map(debtorsGroup => {
                let mergedDebtor = debtorsGroup[0];

                mergedDebtor["debtorType"] = debtorsGroup.find(debtor => debtor.debtorType !== "Unknown")?.debtorType || "Unknown";
                mergedDebtor["ratings"] = debtorsGroup.reduce((allRatings, current) => allRatings.concat(current.ratings || []), []);
                mergedDebtor["totalAmount"] = debtorsGroup.reduce((total, debtor) => total + Number(debtor.totalAmount), 0);
                mergedDebtor["dueFrom"] = commonUtil.getDateInGeneralFormat(getLowestDueDate(debtorsGroup));
                return mergedDebtor;
            });

            if (!debtorsWithDefaulterEntries) {
                res.status(404).send({ message: "Not found company ", success: false, response: "" });
            } else {
                res.status(200).json({ message: "Search successful", success: true, response: mergedDebtors });
            }
        } else {
            res.status(200).send({ message: "you don't have an active subscription. Please purchase one suubscription to continue.", success: false, response: "" });
        }
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Error retrieving company", success: false, response: "" });
    }
};
