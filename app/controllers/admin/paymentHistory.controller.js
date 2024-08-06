const db = require("../../models/admin/");
const user_db = require("../../models/user/");
const commondb = require("../../models/common");
const Logs = commondb.logs;

const PaymentHistory = db.paymentHistory;
const Companies = user_db.companies;
const Debtors = user_db.debtors;
const Admin = db.admin;
const Users = user_db.user;
const DefaulterEntry = user_db.defaulterEntry;
const constants = require('../../constants/userConstants');
const service = require("../../service/admin/");
const userService = require("../../service/user/user.service");
const debtorService = require("../../service/user/debtor.service");
const commonService = require("../../service/common");
const paymentHistoryService = service.paymentHistoryService
const mailController = require('../../controllers/common/mailTemplates.controller')
const mailUtility = require('../../util/mailUtility')
const commonUtil = require('../../util/commonUtil')
const crypto = require("crypto");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const excel = require('exceljs');
const fs = require('fs');



const createExcel = async (disputedTransactions) => {

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Disputed Transactions');

    worksheet.columns = [
        { header: 'Document(s) Required From Creditor', key: 'documentsRequiredFromCreditor', width: 30 },
        { header: 'Document(s) Required From Debtor', key: 'documentsRequiredFromDebtor', width: 30 },
        { header: 'Creditor Additional Document(s)', key: 'creditoradditionaldocuments', width: 30 },
        { header: 'Debtor Additional Document(s)', key: 'debtoradditionaldocuments', width: 30 },
        { header: 'Defaulter Entry ID', key: 'defaulterEntryId', width: 20 },
        { header: 'Amount Paid', key: 'amtPaid', width: 15 },
        { header: 'Requestor', key: 'requestor', width: 15 },
        { header: 'Payment Date', key: 'paymentDate', width: 15 },
        { header: 'Debtor Attachments', key: 'debtorAttachments', width: 30 },
        { header: 'Creditor Attachments', key: 'creditorAttachments', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Pending With', key: 'pendingWith', width: 15 },
        { header: 'Approved By Creditor', key: 'approvedByCreditor', width: 20 },
        { header: 'Is Dispute', key: 'isDispute', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 25 },
        { header: 'Updated At', key: 'updatedAt', width: 25 }
    ];

    //data rows
    disputedTransactions.forEach(transaction => {
        worksheet.addRow({
            documentsRequiredFromCreditor: transaction.documentsRequiredFromCreditor ? transaction.documentsRequiredFromCreditor.join(', ') : '',
            documentsRequiredFromDebtor: transaction.documentsRequiredFromDebtor ? transaction.documentsRequiredFromDebtor.join(', ') : '',
            creditoradditionaldocuments: transaction.creditoradditionaldocuments ? transaction.creditoradditionaldocuments.join(', ') : '',
            debtoradditionaldocuments: transaction.debtoradditionaldocuments ? transaction.debtoradditionaldocuments.join(', ') : '',
            defaulterEntryId: transaction.defaulterEntryId,
            amtPaid: transaction.amtPaid,
            requestor: transaction.requestor,
            paymentDate: transaction.paymentDate,
            debtorAttachments: transaction.debtorAttachments ? transaction.debtorAttachments.join(', ') : '',
            creditorAttachments: transaction.creditorAttachments ? transaction.creditorAttachments.join(', ') : '',
            status: transaction.status,
            pendingWith: transaction.pendingWith,
            approvedByCreditor: transaction.approvedByCreditor,
            isDispute: transaction.isDispute,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;

    // local testing
    // const filePath = 'D://disputed_transactions.xlsx';
    // await workbook.xlsx.writeFile(filePath);
    // return filePath;
};


const createAllTransactionsExcel = async (transactions) => {

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    worksheet.columns = [
        { header: 'Buyer name', key: 'buyerName', width: 30 },
        { header: 'Seller name', key: 'sellerName', width: 30 },
        { header: 'Payment Due Date', key: 'paymentDueDate', width: 30 },
        { header: 'Defaulter Entry ID', key: 'defaulterEntryId', width: 20 },
        { header: 'Amount', key: 'amtPaid', width: 15 },
        { header: 'Buyer Contact no', key: 'buyesContactno', width: 15 },
        { header: 'Payment Date', key: 'paymentDate', width: 15 },
        { header: 'Seller Contact no', key: 'sellerContactno', width: 30 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Is Dispute', key: 'isDispute', width: 15 },
    ];

    //data rows
    transactions.forEach(transaction => {
        worksheet.addRow({
            buyerName: transaction?.defaulterEntry?.debtor?.companyName,
            sellerName: transaction?.defaulterEntry?.creditor?.companyName,
            paymentDueDate: commonUtil.findOldestDueDate(transaction?.defaulterEntry?.invoices),
            defaulterEntryId: transaction.defaulterEntryId,
            amtPaid: transaction.amtPaid,
            buyesContactno: transaction?.defaulterEntry?.debtor?.customerMobile,
            sellerContactno: transaction?.defaulterEntry?.creditor?.customerMobile,
            paymentDate: transaction.paymentDate,
            status: transaction.status,
            isDispute: transaction.isDispute,
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;

    // local testing
    // const filePath = 'D://disputed_transactions.xlsx';
    // await workbook.xlsx.writeFile(filePath);
    // return filePath;
};

exports.getAllApprovedTransactions = async (req, res) => {
    try {
        let transactions = await PaymentHistory.find({
            status: constants.PAYMENT_HISTORY_STATUS.APPROVED,
        }).populate(
            [
                { path: 'defaulterEntry' },
                {
                    path: 'defaulterEntry', populate: {
                        path: 'invoices', populate: [
                            'purchaseOrderDocument',
                            'challanDocument',
                            'invoiceDocument',
                            'transportationDocument',
                            'otherDocuments'
                        ]
                    }
                },
                {
                    path: 'disputedInvoiceSupportingDocuments', populate: [
                        'invoice',
                        'documents'
                    ]
                },
                {
                    path: 'defaulterEntry', populate: {
                        path: 'debtor', populate: {
                            path: 'ratings', populate: "question"
                        }
                    }
                },
                { path: 'defaulterEntry', populate: { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" } },
                { path: 'creditorcacertificate' },
                { path: 'creditoradditionaldocuments' },
                { path: 'attachments' },
                { path: 'debtorcacertificate' },
                { path: 'debtoradditionaldocuments' },
                { path: 'supportingDocuments' }
                // { path: 'defaulterEntry.creditorCompanyId', model: 'company' } // Populate the creditorCompanyId field
            ]
        );

        transactions = transactions.map(transaction => {
            transaction = transaction.toJSON();
            if (transaction.defaulterEntry && transaction.defaulterEntry.creditorCompanyId) {
                transaction.defaulterEntry.creditor = transaction.defaulterEntry.creditorCompanyId;
                delete transaction.defaulterEntry.creditorCompanyId;
            }
            return transaction;
        });

        let transBackup = [];
        transBackup = transactions;

        let resArray = [];
        let countMap = new Map();
        let count = 0;

        // +++++++++++++   Old code without total amount - ++++++++++++++++++  FOR BACKUP  +++++++++++++++++++++
        // for (let i = 0; i < transactions.length; i++) {
        //     if (countMap.has(transactions[i].defaulterEntryId)) {
        //         delete transactions[i].defaulterEntry;
        //         resArray[countMap.get(transactions[i].defaulterEntryId)].pHArray.push(transactions[i]);
        //     } else {
        //         let temp = { "defaulterEntry": transactions[i].defaulterEntry }
        //         delete transactions[i].defaulterEntry;
        //         temp["pHArray"] = [transactions[i]];

        //         resArray[count] = temp;
        //         countMap.set(transactions[i].defaulterEntryId, count);
        //         count++;
        //     }
        // }
        // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

        // New with total amount
        for (let i = 0; i < transactions.length; i++) {
            const defaulterEntryId = transactions[i].defaulterEntryId;
            if (countMap.has(defaulterEntryId)) {
                resArray[countMap.get(defaulterEntryId)].totalAmountPaid += Number(transactions[i].amtPaid);

                delete transactions[i].defaulterEntry;
                resArray[countMap.get(defaulterEntryId)].pHArray.push(transactions[i]);
            } else {
                // finding lowest duefrom date
                if (transactions[i].defaulterEntry?.invoices) {
                    for (let invoice of transactions[i].defaulterEntry?.invoices) {
                        if (transactions[i].defaulterEntry.dueFrom) {
                            if (transactions[i].defaulterEntry.dueFrom > invoice.dueDate) {
                                transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                            }
                        } else {
                            transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                        }
                    }
                    transactions[i].defaulterEntry.dueFrom = commonUtil.getDateInGeneralFormat(transactions[i].defaulterEntry.dueFrom)
                }
                let temp = { defaulterEntry: transactions[i].defaulterEntry, totalAmountPaid: 0 };

                // below code will filter ratings only for current defaulter Entry Id by removing deleted null values
                for (let j = 0; j < temp.defaulterEntry.debtor.ratings.length; j++) {
                    if (!(temp.defaulterEntry._id == temp.defaulterEntry.debtor.ratings[j].defaulterEntryId)) {
                        delete temp.defaulterEntry.debtor.ratings[j];
                    }
                }
                temp.defaulterEntry.debtor.ratings = temp.defaulterEntry.debtor.ratings.filter(item => item !== null);

                temp.totalAmountPaid += Number(transactions[i].amtPaid);

                delete transactions[i].defaulterEntry;
                temp.pHArray = [transactions[i]];
                resArray[count] = temp;
                countMap.set(defaulterEntryId, count);
                count++;
            }
        }

        return res.status(200).send({ message: "", success: true, response: resArray });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};

exports.getAllTransactionsForOtherStatus = async (req, res) => {
    try {

        let otherFilters = {};
        if (req.body.roleBasedFilter) {
            otherFilters = {
                pendingWith: req.token.adminDetails.adminRole,
                $or: [
                    { pendingWithAdminEmailId: { $exists: false } },
                    { pendingWithAdminEmailId: "" },
                    { pendingWithAdminEmailId: req.token.adminDetails.emailId }
                ]
            }
        }
        let transactions = await paymentHistoryService.getTransactionsWithFilters({
            status: { $in: req.body.status },
            ...otherFilters
        });

        transBackup = transactions;

        let resArray = [];
        let countMap = new Map();
        let count = 0;

        // New with total amount
        for (let i = 0; i < transactions.length; i++) {
            const defaulterEntryId = transactions[i].defaulterEntryId;
            if (countMap.has(defaulterEntryId)) {
                //   resArray[countMap.get(defaulterEntryId)].totalAmountPaid += Number(transactions[i].amtPaid);

                delete transactions[i].defaulterEntry;
                resArray[countMap.get(defaulterEntryId)].pHArray.push(transactions[i]);
            } else {
                // finding lowest duefrom date
                if (transactions[i].defaulterEntry?.invoices) {
                    for (let invoice of transactions[i].defaulterEntry?.invoices) {
                        if (transactions[i].defaulterEntry.dueFrom) {
                            if (transactions[i].defaulterEntry.dueFrom > invoice.dueDate) {
                                transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                            }
                        } else {
                            transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                        }
                    }
                    transactions[i].defaulterEntry.dueFrom = commonUtil.getDateInGeneralFormat(transactions[i].defaulterEntry.dueFrom)
                }
                let temp = { defaulterEntry: transactions[i].defaulterEntry };

                // below code will filter ratings only for current defaulter Entry Id by removing deleted null values
                for (let j = 0; j < temp.defaulterEntry.debtor.ratings.length; j++) {
                    if (!(temp.defaulterEntry._id == temp.defaulterEntry.debtor.ratings[j].defaulterEntryId)) {
                        delete temp.defaulterEntry.debtor.ratings[j];
                    }
                }
                temp.defaulterEntry.debtor.ratings = temp.defaulterEntry.debtor.ratings.filter(item => item !== null);

                //   temp.totalAmountPaid += Number(transactions[i].amtPaid); 

                delete transactions[i].defaulterEntry;
                temp.pHArray = [transactions[i]];
                resArray[count] = temp;
                countMap.set(defaulterEntryId, count);
                count++;
            }
        }

        return res.status(200).send({ message: "", success: true, response: resArray });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};


exports.getAllDisputedTransactions = async (req, res) => {
    try {
        let transactions = await PaymentHistory.find({
            status: constants.PAYMENT_HISTORY_STATUS.PENDING, isDispute: true,
            $or: [{ userSuspended: false }, { userSuspended: { $exists: false } }]
        }).populate(
            [
                { path: 'defaulterEntry' },
                {
                    path: 'defaulterEntry', populate: {
                        path: 'invoices', populate: [
                            'purchaseOrderDocument',
                            'challanDocument',
                            'invoiceDocument',
                            'transportationDocument',
                            'otherDocuments'
                        ]
                    }
                },
                {
                    path: 'disputedInvoiceSupportingDocuments', populate: [
                        'invoice',
                        'documents'
                    ]
                },
                {
                    path: 'defaulterEntry', populate: {
                        path: 'debtor', populate: {
                            path: 'ratings', populate: "question"
                        }
                    }
                },
                { path: 'defaulterEntry', populate: { path: 'creditorCompanyId', model: 'company' } },
                { path: 'creditorcacertificate' },
                { path: 'creditoradditionaldocuments' },
                { path: 'attachments' },
                { path: 'debtorcacertificate' },
                { path: 'debtoradditionaldocuments' },
                { path: 'supportingDocuments' }
                // { path: 'defaulterEntry.creditorCompanyId', model: 'company' } // Populate the creditorCompanyId field
            ]
        );

        transactions = transactions.map(transaction => {
            transaction = transaction.toJSON();
            if (transaction.defaulterEntry && transaction.defaulterEntry.creditorCompanyId) {
                transaction.defaulterEntry.creditor = transaction.defaulterEntry.creditorCompanyId;
                delete transaction.defaulterEntry.creditorCompanyId;
            }
            return transaction;
        });

        let transBackup = [];
        transBackup = transactions;

        let resArray = [];
        let countMap = new Map();
        let count = 0;

        for (let i = 0; i < transactions.length; i++) {
            if (transactions[i].userSuspended) {
                continue;
            }
            if (countMap.has(transactions[i].defaulterEntryId)) {
                delete transactions[i].defaulterEntry;
                resArray[countMap.get(transactions[i].defaulterEntryId)].pHArray.push(transactions[i]);
            } else {
                let temp = { "defaulterEntry": transactions[i].defaulterEntry }
                delete transactions[i].defaulterEntry;
                temp["pHArray"] = [transactions[i]];

                resArray[count] = temp;
                countMap.set(transactions[i].defaulterEntryId, count);
                count++;
            }
        }


        return res.status(200).send({ message: "", success: true, response: resArray });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};

exports.downloadAllDisputedTransactions = async (req, res) => {
    try {
        let disputedTransactions = await PaymentHistory.find({
            status: constants.PAYMENT_HISTORY_STATUS.REJECTED,
        });

        const buffer = await createExcel(disputedTransactions);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=disputed_transactions.xlsx');

        res.send(buffer);
        // local testing
        // const fileStream = fs.createReadStream(buffer);
        // fileStream.pipe(res);

    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Something went wrong", success: false });
    }
};


exports.downloadAllTransactions = async (req, res) => {
    try {
        let filters = { dateSelection: req.body.dateSelection, startDate: req.body.startDate, endDate: req.body.endDate, roleBasedFilter: req.body.roleBasedFilter }
        let transactions = await paymentHistoryService.getAllTrasaction(req.token.adminDetails.adminRole, req.token.adminDetails.emailId, filters);
        // return all transactions
        const buffer = await createAllTransactionsExcel(transactions);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=disputed_transactions.xlsx');

        res.send(buffer);
        // local testing
        // const fileStream = fs.createReadStream(buffer);
        // fileStream.pipe(res);

    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Something went wrong", success: false });
    }
};

function mapStatus(status) {
    const statusMap = {
        "APPROVED": "Complaint approved",
        "REJECTED": "Inconclusive",
        "Esclate": "Complaint escalated",
        "Requesttoadditionaldocumnet": "Awaiting additional documentation",
        "BuyerMayBeaDefaulter": "Buyer may be a defaulter",
        "fraudulentComplaintSeller": "Fraudulent complaint lodged by seller",
        "Complaintsfiledwithoutevidence": "Complaints filed without sufficient evidence",
        "FULLY_RESOLVED_PAYMENT_RECIEVED": "Complaint resolved",
        "PARTIALLY_RESOLVED_PARTIAL_PAYMENT_RECEIVED": "Partial payment received",
        "PAYMENT_PENDING_AGREEMENT_REACHED": "Payment pending - Agreement reached"
    };

    // if status exists in the map
    if (statusMap.hasOwnProperty(status)) {
        return statusMap[status];
    } else {
        return "Status not found";
    }
}

function mapMalTemplateBuyer(status) {
    const statusMap = {
        // "COMPLAINT_APPROVED": "COMPLAINT_APPROVED_BUYER",
        "REJECTED": "PAYMENT_STATUS_INCOCLUSIVE_BUYER",
        "BuyerMayBeaDefaulter": "BUYER_MAY_BE_A_DEFAULTER_BUYER",
        "fraudulentComplaintSeller": "PAYMENT_STATUS_FRAUDULENT_COMPLAINT_BUYER",
        "Complaintsfiledwithoutevidence": "PAYMENT_STATUS_COMPLAINTS_FILED_WITHOUT_EVIDENCE_BUYER",
        "FULLY_RESOLVED_PAYMENT_RECIEVED": "PAYMENT_STATUS_CHANGED_BUYER",
        "PARTIALLY_RESOLVED_PARTIAL_PAYMENT_RECEIVED": "PAYMENT_STATUS_PARTIAL_PAYMENT_RECEIVED_BUYER",
        "PAYMENT_PENDING_AGREEMENT_REACHED": "PAYMENT_STATUS_AGREEMENT_REACHED_BUYER"
    };

    if (statusMap.hasOwnProperty(status)) {
        return statusMap[status];
    } else {
        return "Status not found";
    }
}

function mapMalTemplateSeller(status) {
    const statusMap = {
        // "COMPLAINT_APPROVED": "COMPLAINT_APPROVED_SELLER",
        "REJECTED": "PAYMENT_STATUS_INCOCLUSIVE_SELLER",
        "BuyerMayBeaDefaulter": "BUYER_MAY_BE_A_DEFAULTER_SELLER",
        "fraudulentComplaintSeller": "PAYMENT_STATUS_FRAUDULENT_COMPLAINT_SELLER",
        "Complaintsfiledwithoutevidence": "PAYMENT_STATUS_COMPLAINTS_FILED_WITHOUT_EVIDENCE_SELLER",
        "FULLY_RESOLVED_PAYMENT_RECIEVED": "PAYMENT_STATUS_CHANGED_SELLER",
        "PARTIALLY_RESOLVED_PARTIAL_PAYMENT_RECEIVED": "PAYMENT_STATUS_PARTIAL_PAYMENT_RECEIVED_SELLER",
        "PAYMENT_PENDING_AGREEMENT_REACHED": "PAYMENT_STATUS_AGREEMENT_REACHED_SELLER"
    };

    if (statusMap.hasOwnProperty(status)) {
        return statusMap[status];
    } else {
        return "Status not found";
    }
}

exports.approveOrRejectPayment = async (req, res) => {
    try {
        let status = null;
        let pmtAmtTotal = 0;
        let message = "";
        let result = null;
        let paymentHistoriesChanged = [];
        if (req.body.payments && req.body.payments.length !== 0) {
            let deftEntry = await DefaulterEntry.findById(req.body.defaulterEntryId);

            if (req.body.status == "APPROVED") {
                for (let i = 0; i < req.body.payments.length; i++) {
                    let payment = req.body.payments[i]
                    let paymentId = payment.paymentId;
                    let existingLog = await Logs.findOne({ pmtHistoryId: paymentId });
                    let currAdmin = await Admin.findOne({ "emailId": req.token.adminDetails.emailId });
                    status = constants.PAYMENT_HISTORY_STATUS.APPROVED;
                    result = await paymentHistoryService.updatePaymentHistoryStatus({ status, paymentId, pendingWithAdminEmailId: req.token.adminDetails.emailId });
                    //let paymentHistoryAndInvoice =  await result.populate("invoice");
                    if (req.body.disputeType == "DISPUTE_TYPE1") {
                        deftEntry.totalAmount = result.totalAmtAsPerDebtor;
                    } else {
                        deftEntry.totalAmount = deftEntry.totalAmount - Number(result.amtPaid);
                    }

                    pmtAmtTotal += Number(result.amtPaid);

                    if (deftEntry.totalAmount <= 0) {
                        deftEntry.totalAmount = 0
                        deftEntry.status = constants.INVOICE_STATUS.PAID
                    }
                    // deftEntry.save()

                    currAdmin.transactionsProcessed++;
                    currAdmin.save();

                    // let logMsg = " [ "+new Date().toISOString()+" ] "+"Payment approved for amount "+result.amtPaid+".";
                    let logMsg = { timeStamp: new Date().toISOString(), message: "Payment approved for amount " + result.amtPaid + ".", remarks: req.body.remarks };
                    if (existingLog) {
                        // If the document exists, update the logs array
                        existingLog.logs.push(logMsg);
                        await existingLog.save();
                    } else {
                        // create log
                        let log = await Logs.create({
                            pmtHistoryId: paymentId,  // pmtHistory id
                            logs: [logMsg]
                        });
                    }
                    paymentHistoriesChanged.push(result);
                }

                const pHistory = await PaymentHistory.findOne({ _id: req.body.payments[0].paymentId }).populate(
                    [
                        { path: 'defaulterEntry', populate: ['invoices'] },
                        { path: "defaulterEntry", populate: { path: "debtor", select: "customerEmail gstin" } }
                    ]);
                let credMail = await userService.getCompanyOwner(pHistory.defaulterEntry.creditorCompanyId).select("emailId");
                credMail = credMail?.emailId ? credMail.emailId : "";

                let replacements = [];
                replacements.push({ target: "TOTAL_AMOUNT_PAID", value: pmtAmtTotal })
                mailObj = await mailController.getMailTemplate("PAYMENT_APPROVED", replacements)

                mailObj.to = "" + pHistory.defaulterEntry.debtor.customerEmail + "," + credMail + "";
                let ccEmails = await debtorService.getDebtorAndCompanyOwnerEmails(pHistory.defaulterEntry.debtor.gstin);
                mailObj.cc = ccEmails;
                mailUtility.sendMail(mailObj)
                message = "Payment Approved!";
                // return res.status(200).send({ message: "Payment Approved!", success: true, response: {result, deftE} });

            } else if (req.body.status == "COMPLAINT_APPROVED") {
                for (let i = 0; i < req.body.payments.length; i++) {
                    let payment = req.body.payments[i]
                    let paymentId = payment.paymentId;
                    let existingLog = await Logs.findOne({ pmtHistoryId: paymentId });
                    let currAdmin = await Admin.findOne({ "emailId": req.token.adminDetails.emailId });
                    status = req.body.status;
                    result = await paymentHistoryService.updatePaymentHistoryStatus({ status, paymentId, pendingWithAdminEmailId: req.token.adminDetails.emailId });

                    currAdmin.transactionsProcessed++;
                    currAdmin.save();

                    // let logMsg = " [ "+new Date().toISOString()+" ] "+"Payment status changed to "+(req.body.status)+" by "+req.token.adminDetails.adminRole;
                    let logMsg = { timeStamp: new Date().toISOString(), message: "Payment status / opinion changed to COMPLAINT APPROVED by " + req.token.adminDetails.adminRole, remarks: req.body.remarks };

                    if (i == 0) {
                        if (existingLog) {
                            // If the document exists, update the logs array
                            existingLog.logs.push(logMsg);
                            await existingLog.save();
                        } else {
                            // create log
                            let log = await Logs.create({
                                pmtHistoryId: paymentId,  // pmtHistory id
                                logs: [logMsg]
                            });
                        }
                    }


                    paymentHistoriesChanged.push(result);
                }

                const pHistory = await PaymentHistory.findOne({ _id: req.body.payments[0].paymentId }).populate(
                    [
                        { path: 'defaulterEntry', populate: ['invoices'] },
                        { path: "defaulterEntry", populate: { path: "debtor", select: "customerEmail gstin companyName" } },
                        { path: 'defaulterEntry', populate: { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" } },
                    ]);
                let replacementsBuyer = [];
                console.log(mapStatus(req.body.status));

                replacementsBuyer.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                replacementsBuyer.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                let mailObjBuyer = await mailController.getMailTemplate("COMPLAINT_APPROVED_BUYER", replacementsBuyer)

                mailObjBuyer.to = pHistory.defaulterEntry.debtor.customerEmail;
                let ccEmailsBuyer = await debtorService.getDebtorAndCompanyOwnerEmails(pHistory.defaulterEntry.debtor.gstin);
                mailObjBuyer.cc = ccEmailsBuyer;

                //  seller 

                let replacementsSeller = [];
                replacementsSeller.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                replacementsSeller.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                let mailObjSeller = await mailController.getMailTemplate("COMPLAINT_APPROVED_SELLER", replacementsSeller)

                mailObjSeller.to = pHistory.defaulterEntry.creditorCompanyId.emailId;
                let ccEmailsSeller = await debtorService.getCompanyOwnerEmail(pHistory.defaulterEntry.creditorCompanyId.gstin);
                mailObjSeller.cc = ccEmailsSeller;

                mailUtility.sendMail(mailObjBuyer)
                mailUtility.sendMail(mailObjSeller)

                message = "Payment Status changed";
                // return res.status(200).send({ message: "Payment Status changed", success: true, response: result });

            } else {
                for (let i = 0; i < req.body.payments.length; i++) {
                    let payment = req.body.payments[i]
                    let paymentId = payment.paymentId;
                    let existingLog = await Logs.findOne({ pmtHistoryId: paymentId });
                    let currAdmin = await Admin.findOne({ "emailId": req.token.adminDetails.emailId });
                    status = req.body.status;
                    result = await paymentHistoryService.updatePaymentHistoryStatus({ status, paymentId, pendingWithAdminEmailId: req.token.adminDetails.emailId });

                    currAdmin.transactionsProcessed++;
                    currAdmin.save();

                    let currentStatus = StatusAndOpinionObj[req.body.status];

                    if (currentStatus == undefined || currentStatus == null) {
                        currentStatus = ''
                    }


                    // let logMsg = " [ "+new Date().toISOString()+" ] "+"Payment status changed to "+(req.body.status)+" by "+req.token.adminDetails.adminRole;
                    let logMsg = { timeStamp: new Date().toISOString(), message: "Payment status / opinion changed to " + (currentStatus) + " by " + req.token.adminDetails.adminRole, remarks: req.body.remarks };

                    if (i == 0) {
                        if (existingLog) {
                            // If the document exists, update the logs array
                            existingLog.logs.push(logMsg);
                            await existingLog.save();
                        } else {
                            // create log
                            let log = await Logs.create({
                                pmtHistoryId: paymentId,  // pmtHistory id
                                logs: [logMsg]
                            });
                        }

                    }

                    paymentHistoriesChanged.push(result);
                }

                const pHistory = await PaymentHistory.findOne({ _id: req.body.payments[0].paymentId }).populate(
                    [
                        { path: 'defaulterEntry', populate: ['invoices'] },
                        { path: "defaulterEntry", populate: { path: "debtor", select: "customerEmail gstin companyName" } },
                        { path: 'defaulterEntry', populate: { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" } },
                    ]);
                console.log(mapStatus(req.body.status));

                if (req.body.status == 'FULLY_RESOLVED_PAYMENT_RECIEVED') {
                    let replacementsBuyer = [];
                    replacementsBuyer.push({ target: "PAYMENT_STATUS", value: mapStatus(req.body.status) })
                    replacementsBuyer.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                    replacementsBuyer.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                    let mailObjBuyer = await mailController.getMailTemplate("PAYMENT_STATUS_CHANGED_BUYER", replacementsBuyer)

                    mailObjBuyer.to = pHistory.defaulterEntry.debtor.customerEmail;
                    let ccEmails = await debtorService.getDebtorAndCompanyOwnerEmails(pHistory.defaulterEntry.debtor.gstin);
                    mailObjBuyer.cc = ccEmails;
                    console.log(mailObjBuyer.to);

                    // seller

                    let replacementsSeller = [];
                    replacementsSeller.push({ target: "PAYMENT_STATUS", value: mapStatus(req.body.status) })
                    replacementsSeller.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                    replacementsSeller.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                    let mailObjSeller = await mailController.getMailTemplate("PAYMENT_STATUS_CHANGED_SELLER", replacementsSeller)

                    mailObjSeller.to = pHistory.defaulterEntry.creditorCompanyId.emailId;
                    let ccEmailsSeller = await debtorService.getCompanyOwnerEmail(pHistory.defaulterEntry.creditorCompanyId.gstin);
                    mailObjSeller.cc = ccEmailsSeller;


                    mailUtility.sendMail(mailObjBuyer)
                    mailUtility.sendMail(mailObjSeller)
                } else {

                    let replacementsBuyer = [];
                    replacementsBuyer.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                    replacementsBuyer.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                    let mailObjBuyer = await mailController.getMailTemplate(mapMalTemplateBuyer(req.body.status), replacementsBuyer)

                    mailObjBuyer.to = pHistory.defaulterEntry.debtor.customerEmail;
                    let ccEmailsBuyer = await debtorService.getDebtorAndCompanyOwnerEmails(pHistory.defaulterEntry.debtor.gstin);
                    mailObjBuyer.cc = ccEmailsBuyer;

                    //  seller 

                    let replacementsSeller = [];
                    replacementsSeller.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                    replacementsSeller.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                    let mailObjSeller = await mailController.getMailTemplate(mapMalTemplateSeller(req.body.status), replacementsSeller)
                    mailObjSeller.subject = await mailController.getMailSubjectTemplate(mapMalTemplateSeller(req.body.status), replacementsSeller)

                    mailObjSeller.to = pHistory.defaulterEntry.creditorCompanyId.emailId;
                    //  mailObjSeller.subject = `Status of Your Complaint Against ${pHistory.defaulterEntry.debtor.companyName} - Buyer May Be Defaulter`
                    let ccEmailsSeller = await debtorService.getCompanyOwnerEmail(pHistory.defaulterEntry.creditorCompanyId.gstin);
                    mailObjSeller.cc = ccEmailsSeller;

                    mailUtility.sendMail(mailObjBuyer)
                    mailUtility.sendMail(mailObjSeller)
                }



                message = "Payment Status changed";
                // return res.status(200).send({ message: "Payment Status changed", success: true, response: result });
            }
            deftEntry.latestStatus = req.body.status
            deftEntry.save()
            return res.status(200).send({ message: message, success: true, response: { paymentHistoriesChanged, deftEntry } });
        }
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};


exports.askForSupportingDocument = async (req, res) => {
    try {
        if (req.body.payments && req.body.payments.length !== 0) {
            let transactions = [];
            let isDocumentsRequiredByCreditor = req.body.documentsRequiredFromCreditor.length === 0 ? false : true;
            let isDocumentsRequiredByDebtor = req.body.documentsRequiredFromDebtor.length === 0 ? false : true;
            for (let i = 0; i < req.body.payments.length; i++) {
                let paymentId = req.body.payments[i].paymentId
                let existingLog = await Logs.findOne({ pmtHistoryId: paymentId });
                let oldTransaction = await PaymentHistory.findById(paymentId);

                let transaction = await paymentHistoryService.moveToDocumentsNeededQueue({
                    status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
                    paymentId: paymentId,
                    pendingWith: "USER",
                    previousPendingWith: oldTransaction.pendingWith,
                    pendingWithAdminEmailId: req.token.adminDetails.emailId,
                    documentsRequiredFromCreditor: req.body.documentsRequiredFromCreditor,
                    documentsRequiredFromDebtor: req.body.documentsRequiredFromDebtor,
                    isDocumentsRequiredByCreditor: isDocumentsRequiredByCreditor,
                    isDocumentsRequiredByDebtor: isDocumentsRequiredByDebtor,
                    adminRemarksForDebtor: req.body.adminRemarksForDebtor,
                    adminRemarksForCreditor: req.body.adminRemarksForCreditor
                }).populate([
                    { path: "defaulterEntry" },
                    { path: 'defaulterEntry', populate: ['invoices'] },
                    { path: "defaulterEntry.debtor" },
                    { path: "defaulterEntry", populate: { path: "debtor", select: "customerEmail gstin" } }
                ]);
                transaction.defaulterEntry.latestStatus = constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED
                transaction.defaulterEntry.save()
                transactions.push(transaction)

                // let logStamp = " [ "+new Date().toISOString()+" ] "+"Payment record/history moved to documents needed queue";
                let logStamp = { timeStamp: new Date().toISOString(), message: "Admin has requested supporting documents", remarks: req.body.remarks };
                let logMsg = [logStamp];

                if (i == 0) {
                    if (isDocumentsRequiredByDebtor) {
                        // mail for debtor
                        let replacements = [];
                        let userDetailsId = await Users.findOne({ "emailId": transaction.defaulterEntry.debtor.customerEmail })._id;
                        linkToken = jwtUtil.generateCustomToken({ "paymentId": transaction.id, "userId": userDetailsId, "type": "DEBTOR" }, "CUSTOM");
                        commonService.tokenService.saveTokenToDb({ "paymentId": paymentId, "userType": "DEBTOR", "linkToken": linkToken });
                        const link = `${process.env.USER_FRONTEND_BASE_URL}/upload-supporting-document-direct?token=${linkToken}&userType=DEBTOR`;
                        replacements.push({ target: "COMPLAINT_NUMBER", value: transaction.defaulterEntry.complaintNumber })
                        replacements.push({ target: "UPLOAD_SUPPORTING_DOCUMENTS_LINK", value: link })
                        replacements.push({ target: "ADMIN_REMARKS", value: req.body.adminRemarksForDebtor })

                        //TODO Bug: amount will be zero in case of DISPUTE_TYPE1
                        replacements.push({ target: "PAYMENT_AMOUNT", value: transaction.amtPaid })
                        let transactionType = ""
                        if (transaction.isDispute) {
                            transactionType = transaction.disputeType
                        } else {
                            transactionType = "Record Payment"
                        }
                        replacements.push({ target: "PAYMENT_TYPE", value: transactionType })
                        replacements.push({ target: "PAYMENT_DATE", value: transaction.paymentDate })
                        replacements.push({ target: "PAYMENT_MODE", value: transaction.paymentMode })

                        let companyOwnerEmail = await debtorService.getCompanyOwnerEmail(transaction.defaulterEntry.debtor.gstin);

                        //sending mail with upload link
                        let mailObj = await mailController.getMailTemplate(constants.MAIL_TEMPLATES.SUPPORTING_DOCUMENTS_NEEDED_DEBTOR, replacements)

                        let ccEmails = await debtorService.getDebtorAndCompanyOwnerEmails(transaction.defaulterEntry.debtor.gstin);
                        mailObj.cc = ccEmails;
                        let debtorDocumentIds = []
                        debtorDocumentIds.push(transaction.debtorcacertificate);
                        debtorDocumentIds.push(...transaction.debtoradditionaldocuments);

                        if (companyOwnerEmail && companyOwnerEmail != "") {
                            mailObj.to = companyOwnerEmail;
                            mailObj.cc = [];
                            let mailObj2 = await mailController.getMailTemplate(constants.MAIL_TEMPLATES.SUPPORTING_DOCUMENTS_NEEDED_DEBTOR_WITHOUT_LINK, replacements)
                            mailObj2.cc = ccEmails;
                            mailObj2.to = transaction.defaulterEntry.debtor.customerEmail

                            //  mailUtility.sendEmailWithAttachments(mailObj2, debtorDocumentIds);
                        } else {
                            mailObj.to = transaction.defaulterEntry.debtor.customerEmail
                        }



                        //  mailUtility.sendEmailWithAttachments(mailObj, debtorDocumentIds);sendMail

                        mailUtility.sendMail(mailObj);


                        //log mail for debtor
                        // logMsg.push(" [ "+new Date().toISOString()+" ] "+"Mail sent to Buyer requesting for additional documents");
                        logMsg.push({ timeStamp: new Date().toISOString(), message: "Mail sent to Buyer requesting for additional documents", remarks: req.body.remarks });
                    }

                    if (isDocumentsRequiredByCreditor) {
                        let credMail = await userService.getCompanyOwner(transaction.defaulterEntry.creditorCompanyId).select("emailId");

                        // mail for creditor
                        let creditorReplacements = [];
                        let credUserDetailsId = await Users.findOne({ "emailId": credMail })._id;
                        linkToken = jwtUtil.generateCustomToken({ "paymentId": transaction.id, "userId": credUserDetailsId, "type": "CREDITOR" }, "CUSTOM");
                        commonService.tokenService.saveTokenToDb({ "paymentId": paymentId, "userType": "CREDITOR", "linkToken": linkToken });
                        const link = `${process.env.USER_FRONTEND_BASE_URL}/upload-supporting-document-direct?token=${linkToken}&userType=CREDITOR`;
                        creditorReplacements.push({ target: "COMPLAINT_NUMBER", value: transaction.defaulterEntry.complaintNumber })
                        creditorReplacements.push({ target: "UPLOAD_SUPPORTING_DOCUMENTS_LINK", value: link })
                        creditorReplacements.push({ target: "ADMIN_REMARKS", value: req.body.adminRemarksForCreditor })
                        //TODO Bug: amount will be zero in case of DISPUTE_TYPE1
                        creditorReplacements.push({ target: "PAYMENT_AMOUNT", value: transaction.amtPaid })
                        let transactionType = ""
                        if (transaction.isDispute) {
                            transactionType = transaction.disputeType
                        } else {
                            transactionType = "Record Payment"
                        }
                        creditorReplacements.push({ target: "PAYMENT_TYPE", value: transactionType })
                        creditorReplacements.push({ target: "PAYMENT_DATE", value: transaction.paymentDate })
                        creditorReplacements.push({ target: "PAYMENT_MODE", value: transaction.paymentMode })


                        let mailObj2 = await mailController.getMailTemplate(constants.MAIL_TEMPLATES.SUPPORTING_DOCUMENTS_NEEDED_CREDITOR, creditorReplacements)
                        mailObj2.to = credMail

                        let credDocumentIds = []
                        if (transaction.creditorcacertificate) {
                            credDocumentIds.push(transaction.creditorcacertificate);
                        }
                        if (transaction.creditoradditionaldocuments) {
                            credDocumentIds.push(...transaction.creditoradditionaldocuments);
                        }

                        if (transaction.attachments) {
                            credDocumentIds.push(...transaction.attachments);
                        }

                        let invoices = transaction.defaulterEntry.invoices;

                        for (let i = 0; i < invoices.length; i++) {
                            let invoice = invoices[i];
                            let invoiceDocuments = [];

                            if (invoice.purchaseOrderDocument) {
                                invoiceDocuments.push(invoice.purchaseOrderDocument);
                            }
                            if (invoice.challanDocument) {
                                invoiceDocuments.push(invoice.challanDocument);
                            }
                            if (invoice.invoiceDocument) {
                                invoiceDocuments.push(invoice.invoiceDocument);
                            }
                            if (invoice.transportationDocument) {
                                invoiceDocuments.push(invoice.transportationDocument);
                            }

                            credDocumentIds.push(...invoiceDocuments);
                        }

                        // mailUtility.sendEmailWithAttachments(mailObj2, credDocumentIds);

                        mailUtility.sendMail(mailObj2);

                        //log mail for Creditor
                        // logMsg.push(" [ "+new Date().toISOString()+" ] "+"Mail sent to Seller requesting for additional documents");
                        logMsg.push({ timeStamp: new Date().toISOString(), message: "Mail sent to Seller requesting for additional documents", remarks: req.body.remarks });
                    }
                }



                // logging
                if (i == 0) {
                    if (existingLog) {
                        // If the document exists, update the logs array
                        existingLog.logs.push(...logMsg);
                        await existingLog.save();
                    }
                    else {
                        // create log
                        let log = await Logs.create({
                            pmtHistoryId: paymentId,  // pmtHistory id
                            logs: logMsg
                        });
                    }
                }


            }
            return res.status(200).send({ message: "Transaction has now been moved to Document Needed Queue and mail is sent to Creditor and Debtor", success: true, response: transactions });
        }
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};



exports.getDocumentsRequiredFromPaymentId = async (req, res) => {
    try {
        const token = jwtUtil.verifyCustomToken(req.body.token);
        console.log(token);
        if (req.body.token) {
            let dbToken = await commonService.tokenService.getTokenByPaymentIdAndUser({ "paymentId": token.tokenDetails.paymentId, "userType": token.tokenDetails.type });
            if (!dbToken) {
                return res.status(403).json({ message: 'Token is not valid or has expired.', success: false, response: "" });
            }
        }
        if (token) {
            const _paymentId = token.tokenDetails.paymentId;
            const _userType = token.tokenDetails.type;
            const result = await service.paymentHistoryService.getDocumentsRequiredFromPaymentId(_paymentId, _userType);
            return res.status(200).send({ message: "Records returned", success: true, response: result });
        } else {
            return res.status(401).send({ success: false, message: 'Failed to authenticate token.' });
        }
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
}

exports.takeUpRequest = async (req, res) => {
    try {
        const paymentIds = req.body.paymentIds;
        const paymentHistories = await PaymentHistory.find({ _id: { $in: paymentIds } });

        if (!paymentHistories || paymentHistories.length === 0) {
            return res.status(403).json({ message: 'No payment histories found for the provided IDs.', success: false, response: "" });
        }

        const adminEmailId = req.token.adminDetails.emailId;
        for (const pmtHistory of paymentHistories) {
            pmtHistory.pendingWithAdminEmailId = adminEmailId;

            if (!pmtHistory.creditorcacertificate || pmtHistory.creditorcacertificate.length === 0) {
                pmtHistory.creditorcacertificate = null;
            }
            if (!pmtHistory.debtorcacertificate || pmtHistory.debtorcacertificate.length === 0) {
                pmtHistory.debtorcacertificate = null;
            }

            await pmtHistory.save();
        }

        res.status(200).json({ success: true, message: "Payment History assigned successfully", response: paymentHistories });

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.getAllDocumentsNeededTransactionsForLoggedInUser = async (req, res) => {
    try {

        // let transactions = await PaymentHistory.find({pendingWithAdminEmailId: req.token.adminDetails.emailId, status: userConstants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED});

        let filters = {
            pendingWithAdminEmailId: req.token.adminDetails.emailId,
            status: {
                $nin: [constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW]
            }
        }

        let transactions = await paymentHistoryService.getTransactionsWithFilters(filters);

        let transBackup = [];
        transBackup = transactions;

        let resArray = [];
        let countMap = new Map();
        let count = 0;

        for (let i = 0; i < transactions.length; i++) {
            if (countMap.has(transactions[i].defaulterEntryId)) {
                delete transactions[i].defaulterEntry;
                resArray[countMap.get(transactions[i].defaulterEntryId)].pHArray.push(transactions[i]);
            } else {
                // finding lowest duefrom date
                if (transactions[i].defaulterEntry?.invoices) {
                    for (let invoice of transactions[i].defaulterEntry?.invoices) {
                        if (transactions[i].defaulterEntry.dueFrom) {
                            if (transactions[i].defaulterEntry.dueFrom > invoice.dueDate) {
                                transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                            }
                        } else {
                            transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                        }
                    }
                    transactions[i].defaulterEntry.dueFrom = commonUtil.getDateInGeneralFormat(transactions[i].defaulterEntry.dueFrom)
                }
                let temp = { "defaulterEntry": transactions[i].defaulterEntry }
                delete transactions[i].defaulterEntry;
                temp["pHArray"] = [transactions[i]];

                resArray[count] = temp;
                countMap.set(transactions[i].defaulterEntryId, count);
                count++;
            }
        }

        // return all transactions
        res.status(200).json({ message: "Transaction list fetched successfully.", success: true, response: resArray });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.getTransactionByPaymentId = async (req, res) => {
    try {

        let transaction = await PaymentHistory.findOne({ _id: req.body.paymentId });

        if (transaction) {
            res.status(200).json({ message: "Transaction fetched successfully.", success: true, response: transaction });
        } else {
            res.status(403).json({ message: "Transaction not found.", success: true, response: transaction });
        }

    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.getAllComplaintApproved = async (req, res) => {
    try {
        let transactions = await PaymentHistory.find({
            status: constants.PAYMENT_HISTORY_STATUS.COMPLAINT_APPROVED,
        }).populate(
            [
                { path: 'defaulterEntry' },
                {
                    path: 'defaulterEntry', populate: {
                        path: 'invoices', populate: [
                            'purchaseOrderDocument',
                            'challanDocument',
                            'invoiceDocument',
                            'transportationDocument',
                            'otherDocuments'
                        ]
                    }
                },
                {
                    path: 'disputedInvoiceSupportingDocuments', populate: [
                        'invoice',
                        'documents'
                    ]
                },
                {
                    path: 'defaulterEntry', populate: {
                        path: 'debtor', populate: {
                            path: 'ratings', populate: "question"
                        }
                    }
                },
                { path: 'defaulterEntry', populate: { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" } },
                { path: 'creditorcacertificate' },
                { path: 'creditoradditionaldocuments' },
                { path: 'attachments' },
                { path: 'debtorcacertificate' },
                { path: 'debtoradditionaldocuments' },
                { path: 'supportingDocuments' }
                // { path: 'defaulterEntry.creditorCompanyId', model: 'company' } // Populate the creditorCompanyId field
            ]
        );

        transactions = transactions.map(transaction => {
            transaction = transaction.toJSON();
            if (transaction.defaulterEntry && transaction.defaulterEntry.creditorCompanyId) {
                transaction.defaulterEntry.creditor = transaction.defaulterEntry.creditorCompanyId;
                delete transaction.defaulterEntry.creditorCompanyId;
            }
            return transaction;
        });

        let transBackup = [];
        transBackup = transactions;

        let resArray = [];
        let countMap = new Map();
        let count = 0;

        for (let i = 0; i < transactions.length; i++) {
            const defaulterEntryId = transactions[i].defaulterEntryId;
            if (countMap.has(defaulterEntryId)) {
                resArray[countMap.get(defaulterEntryId)].totalAmountPaid += Number(transactions[i].amtPaid);

                delete transactions[i].defaulterEntry;
                resArray[countMap.get(defaulterEntryId)].pHArray.push(transactions[i]);
            } else {
                // finding lowest duefrom date
                if (transactions[i].defaulterEntry?.invoices) {
                    for (let invoice of transactions[i].defaulterEntry?.invoices) {
                        if (transactions[i].defaulterEntry.dueFrom) {
                            if (transactions[i].defaulterEntry.dueFrom > invoice.dueDate) {
                                transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                            }
                        } else {
                            transactions[i].defaulterEntry.dueFrom = invoice.dueDate
                        }
                    }
                    transactions[i].defaulterEntry.dueFrom = commonUtil.getDateInGeneralFormat(transactions[i].defaulterEntry.dueFrom)
                }
                let temp = { defaulterEntry: transactions[i].defaulterEntry, totalAmountPaid: 0 };

                // below code will filter ratings only for current defaulter Entry Id by removing deleted null values
                for (let j = 0; j < temp.defaulterEntry.debtor.ratings.length; j++) {
                    if (!(temp.defaulterEntry._id == temp.defaulterEntry.debtor.ratings[j].defaulterEntryId)) {
                        delete temp.defaulterEntry.debtor.ratings[j];
                    }
                }
                temp.defaulterEntry.debtor.ratings = temp.defaulterEntry.debtor.ratings.filter(item => item !== null);

                temp.totalAmountPaid += Number(transactions[i].amtPaid);

                delete transactions[i].defaulterEntry;
                temp.pHArray = [transactions[i]];
                resArray[count] = temp;
                countMap.set(defaulterEntryId, count);
                count++;
            }
        }

        return res.status(200).send({ message: "", success: true, response: resArray });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};

const StatusAndOpinionObj = {
    APPROVED: 'COMPLAINT APPROVED',
    COMPLAINT_APPROVED: 'COMPLAINT APPROVED',
    REJECTED: 'INCONCLUSIVE',
    Esclate: 'COMPLAINT ESCALATED',
    PENDING: 'PENDING',
    RE_OPENED: 'RE-OPENED',
    Requesttoadditionaldocumnet: 'AWAITING ADDITIONAL DOCUMENTATION',
    DOCUMENTS_NEEDED: 'AWAITING ADDITIONAL DOCUMENTATION',
    BuyerMayBeaDefaulter: 'BUYER MAY BE A DEFAULTER',
    fraudulentComplaintSeller: 'FRAUDULENT COMPLAINT LODGED BY SELLER',
    Complaintsfiledwithoutevidence: 'COMPLAINTS FILED WITHOUT SUFFICIENT EVIDENCE',
    FULLY_RESOLVED_PAYMENT_RECIEVED: 'COMPLAINT RESOLVED',
    PARTIALLY_RESOLVED_PARTIAL_PAYMENT_RECEIVED: 'PARTIAL PAYMENT RECEIVED',
    PAYMENT_PENDING_AGREEMENT_REACHED: 'PAYMENT PENDING - AGREEMENT REACHED',
}



/* if (req.body.status == "REJECTED") {
                for (let i = 0; i < req.body.payments.length; i++) {
                    let payment = req.body.payments[i]
                    let paymentId = payment.paymentId;
                    let existingLog = await Logs.findOne({ pmtHistoryId: paymentId });
                    let currAdmin = await Admin.findOne({ "emailId": req.token.adminDetails.emailId });
                    status = constants.PAYMENT_HISTORY_STATUS.REJECTED;
                    result = await paymentHistoryService.updatePaymentHistoryStatus({ status, paymentId, pendingWithAdminEmailId: req.token.adminDetails.emailId });

                    currAdmin.transactionsProcessed++;
                    currAdmin.save();

                    // let logMsg = " [ "+new Date().toISOString()+" ] "+"Payment Rejected";
                    let logMsg = { timeStamp: new Date().toISOString(), message: "Payment status / opinion changed to INCONCLUSIVE by " + req.token.adminDetails.adminRole, remarks: req.body.remarks };

                    if (existingLog) {
                        // If the document exists, update the logs array
                        existingLog.logs.push(logMsg);
                        await existingLog.save();
                    } else {
                        // create log
                        let log = await Logs.create({
                            pmtHistoryId: paymentId,  // pmtHistory id
                            logs: [logMsg]
                        });
                    }
                    paymentHistoriesChanged.push(result);
                }

                const pHistory = await PaymentHistory.findOne({ _id: req.body.payments[0].paymentId }).populate(
                    [
                        { path: 'defaulterEntry', populate: ['invoices'] },
                        { path: "defaulterEntry", populate: { path: "debtor", select: "customerEmail gstin companyName" } },
                        { path: 'defaulterEntry', populate: { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" } },
                    ]);
                let replacementsBuyer = [];
                console.log(mapStatus(req.body.status));

                replacementsBuyer.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                replacementsBuyer.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                let mailObjBuyer = await mailController.getMailTemplate("PAYMENT_STATUS_INCOCLUSIVE_BUYER", replacementsBuyer)

                mailObjBuyer.to = pHistory.defaulterEntry.debtor.customerEmail;
                let ccEmailsBuyer = await debtorService.getDebtorAndCompanyOwnerEmails(pHistory.defaulterEntry.debtor.gstin);
                mailObjBuyer.cc = ccEmailsBuyer;

                //  seller 

                let replacementsSeller = [];
                replacementsSeller.push({ target: "BUYER_NAME", value: pHistory.defaulterEntry.debtor.companyName })
                replacementsSeller.push({ target: "SELLER_NAME", value: pHistory.defaulterEntry.creditorCompanyId.companyName })
                let mailObjSeller = await mailController.getMailTemplate("PAYMENT_STATUS_INCOCLUSIVE_SELLER", replacementsSeller)
                mailObjSeller.subject = await mailController.getMailSubjectTemplate("PAYMENT_STATUS_INCOCLUSIVE_SELLER", replacementsSeller)

                mailObjSeller.to = pHistory.defaulterEntry.creditorCompanyId.emailId;
                let ccEmailsSeller = await debtorService.getCompanyOwnerEmail(pHistory.defaulterEntry.creditorCompanyId.gstin);
                mailObjSeller.cc = ccEmailsSeller;

                mailUtility.sendMail(mailObjBuyer)
                mailUtility.sendMail(mailObjSeller)

                message = "Payment Rejected";
                // return res.status(200).send({ message: "Payment Rejected", success: true, response: result });

            } else */