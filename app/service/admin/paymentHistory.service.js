const db = require("../../models/admin");
const user_db = require("../../models/user");
const commondb = require("../../models/common");
const ComplainDb = require("../../models/user");
const Logs = commondb.logs;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const { ObjectId } = require('mongodb');
const Admin = db.admin;
const PaymentHistory = db.paymentHistory;
const User = user_db.user;
const config = process.env;
const constants = require('../../constants/userConstants');
const defaulterEntry = ComplainDb.defaulterEntry;
const moment = require('moment');

exports.updatePaymentHistoryForEscalate = function (escObj) {
    console.log(escObj);
    return PaymentHistory.findByIdAndUpdate({ _id: escObj.paymentId }, { pendingWith: escObj.pendingWith, pendingWithAdminEmailId: "" });
};

exports.updatePaymentHistoryStatus = function (escObj) {
    let additionalUpdates = {}
    if (escObj.reopenReason) {
        additionalUpdates.reopenReason = reopenReason;
    }
    if (escObj.pendingWithAdminEmailId && escObj.pendingWithAdminEmailId != "") {
        additionalUpdates.pendingWithAdminEmailId = escObj.pendingWithAdminEmailId;
    }

    console.log(escObj);
    return PaymentHistory.findByIdAndUpdate({ _id: escObj.paymentId }, { status: escObj.status, ...additionalUpdates });
};

exports.moveToDocumentsNeededQueue = function (escObj) {
    // This arrangement can be altered based on how we want the date's format to appear.
    escObj.documentsPendingSince = new Date().toJSON().slice(0, 10);

    return PaymentHistory.findByIdAndUpdate(
        escObj.paymentId,
        {
            status: escObj.status,
            pendingWith: escObj.pendingWith,
            previousPendingWith: escObj.previousPendingWith,
            pendingWithAdminEmailId: escObj.pendingWithAdminEmailId,
            documentsPendingSince: escObj.documentsPendingSince,
            documentsRequiredFromCreditor: escObj.documentsRequiredFromCreditor,
            documentsRequiredFromDebtor: escObj.documentsRequiredFromDebtor,
            isDocumentsRequiredByCreditor: escObj.isDocumentsRequiredByCreditor,
            isDocumentsRequiredByDebtor: escObj.isDocumentsRequiredByDebtor,
            adminRemarksForDebtor: escObj.adminRemarksForDebtor,
            adminRemarksForCreditor: escObj.adminRemarksForCreditor
        }
    );
};

exports.moveDocumentsWithPendingDocBackToAdminQueue = function () {
    const previousday = new Date();
    previousday.setDate(previousday.getDate() - 1);
    console.log('PaymentHistory status updated for documents older than 7 days.');

    let result = PaymentHistory.updateMany(
        {
            documentsPendingSince: { $lte: previousday },
            status: { $ne: constants.PAYMENT_HISTORY_STATUS.PENDING }
        },
        {
            $set: {
                status: constants.PAYMENT_HISTORY_STATUS.PENDING,
                //TODO check if this is working or not
                pendingWith: "$previousPendingWith"
            }
        }
    )
    // update many logs using many payment histories
    // Logs.updateMany(
    //     {

    //     },{

    //     }
    // );

    return result;
}



exports.complainMovetoAdminTable = async () => {
    try {

        const tenMinutesAgo = moment().subtract(10, 'minutes').toDate();

        const fourDaysAgo = moment().subtract(4, 'days').toDate();

        const query = {
            createdAt: { $lt: tenMinutesAgo },
            adminShow: { $ne: true } // Only update if adminShow is not already true
        };

        const update = { $set: { adminShow: true } };

        const result = await defaulterEntry.updateMany(query, update);

        console.log(`${result.modifiedCount} documents were updated.`);
    } catch (err) {
        console.error('Error updating documents:', err);
    }
}

exports.complainDocumentNotUpload = async () => {
    try {
        const tenMinutesAgo = moment().subtract(10, 'minutes').toDate();
        const fourDaysAgo = moment().subtract(4, 'days').toDate();
        const query = {
            updatedAt: { $lt: tenMinutesAgo },
            latestStatus: 'DOCUMENTS_NEEDED'
        };

        const update = { $set: { latestStatus: 'DOCUMENTS_NOT_UPLOADED' } };

        const result = await defaulterEntry.updateMany(query, update);

        console.log(`${result.modifiedCount} documents were updated.`);
    } catch (err) {
        console.error('Error updating documents:', err);
    }
}

const _ = require('lodash');
const { populate } = require("dotenv");
const { de } = require("date-fns/locale");

exports.assignPendingPaymentHistories = async function () {
    try {
        let admins = await Admin.find().select('emailId');
        let adminStats = await Promise.all(admins.map(async (admin) => {
            let count = await PaymentHistory.countDocuments({ pendingWithAdminEmailId: admin.emailId, status: "PENDING" });
            return { emailId: admin.emailId, count: count };
        }));

        console.log(adminStats);

        let paymentHistories = await PaymentHistory.find({
            status: "PENDING",
            $or: [
                { pendingWithAdminEmailId: { $exists: false } },
                { pendingWithAdminEmailId: "" }
            ]
        });

        console.log("Running for assignment");

        for (let paymentHistory of paymentHistories) {
            let adminWithMinCount = _.minBy(adminStats, 'count');
            paymentHistory.pendingWithAdminEmailId = adminWithMinCount.emailId;
            adminWithMinCount.count++;

            if (!paymentHistory.creditorcacertificate || paymentHistory.creditorcacertificate.length === 0) {
                paymentHistory.creditorcacertificate = null;
            }
            if (!paymentHistory.debtorcacertificate || paymentHistory.debtorcacertificate.length === 0) {
                paymentHistory.debtorcacertificate = null;
            }

            await paymentHistory.save();
        }

        console.log("Assignment complete");
    } catch (err) {
        console.error("Error:", err);
    }
}

//testing , delete later
// exports.findByPendingWithAdminEmailIdAndUpdate = async function(req, res) {
//     try{
//         let result = await PaymentHistory.updateMany({pendingWithAdminEmailId: 'vaibhavsharma9869@gmail.com'}, 
//                                                         {pendingWithAdminEmailId: ''});
//         res.status(200).send({ message: "Done", success: true, response: result });
//     } catch (err) {
//         console.log(err);
//         res.status(500).send({ message: "Something went wrong", success: false });
//     }
// }

exports.addPaymentHistory = function (details, amount) {

    return PaymentHistory.create({
        defaulterEntryId: details.defaulterEntryId,
        amtPaid: amount,
        proofFiles: "",
        status: "PENDING",
        pendingWith: "L1",
        approvedByCreditor: "false"
    });
};


exports.createPaymentHistory = function (details, newStatus, newPendingWith, newApprovedByCreditor) {
    return PaymentHistory.create({
        defaulterEntryId: details.defaulterEntryId,
        amtPaid: details.amtPaid,
        requestor: details.requestor,
        attachment: details.attachmentId,
        status: newStatus,
        pendingWith: newPendingWith,
        approvedByCreditor: newApprovedByCreditor
    });
}

exports.getDocumentsRequiredFromPaymentId = async function (paymentId, userType) {
    let pH = await PaymentHistory.findOne({ _id: paymentId }).populate(
        [
            { path: 'defaulterEntry', populate: [{ path: 'invoices', populate: ['purchaseOrderDocument', 'challanDocument', 'invoiceDocument', 'transportationDocument'] }] }
        ]);
    // console.log(pH)
    console.log(pH);
    return pH;
}

// exports.getAllTrasaction = async function (adminRole, emailId, filters, reqStatus) {

//     let dateFilter = {};

//     // Determine the date range based on req.body.dateSelection
//     if (filters.dateSelection === "1m") {
//         dateFilter = {
//             $expr: {
//                 $and: [
//                     { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
//                     {
//                         $gte: [
//                             {
//                                 $dateFromString: {
//                                     dateString: "$paymentDate",
//                                     format: "%d-%m-%Y"
//                                 }
//                             },
//                             { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30] }] } }
//                         ]
//                     }
//                 ]
//             }
//         };
//     } else if (filters.dateSelection === "2m") {
//         dateFilter = {
//             $expr: {
//                 $and: [
//                     { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
//                     {
//                         $gte: [
//                             {
//                                 $dateFromString: {
//                                     dateString: "$paymentDate",
//                                     format: "%d-%m-%Y"
//                                 }
//                             },
//                             { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 2] }] } }
//                         ]
//                     }
//                 ]
//             }
//         };
//     } else if (filters.dateSelection === "3m") {
//         dateFilter = {
//             $expr: {
//                 $and: [
//                     { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
//                     {
//                         $gte: [
//                             {
//                                 $dateFromString: {
//                                     dateString: "$paymentDate",
//                                     format: "%d-%m-%Y"
//                                 }
//                             },
//                             { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 3] }] } }
//                         ]
//                     }
//                 ]
//             }
//         };
//     } else if (filters.dateSelection === "6m") {
//         dateFilter = {
//             $expr: {
//                 $and: [
//                     { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
//                     {
//                         $gte: [
//                             {
//                                 $dateFromString: {
//                                     dateString: "$paymentDate",
//                                     format: "%d-%m-%Y"
//                                 }
//                             },
//                             { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 6] }] } }
//                         ]
//                     }
//                 ]
//             }
//         };
//     } else if (filters.dateSelection === "1y") {
//         dateFilter = {
//             $expr: {
//                 $and: [
//                     { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
//                     {
//                         $gte: [
//                             {
//                                 $dateFromString: {
//                                     dateString: "$paymentDate",
//                                     format: "%d-%m-%Y"
//                                 }
//                             },
//                             { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 365] }] } }
//                         ]
//                     }
//                 ]
//             }
//         };
//     } else if (filters.dateSelection === "CUSTOM") {
//         const startDate = new Date(filters.startDate);
//         const endDate = new Date(filters.endDate);
//         dateFilter = {
//             $expr: {
//                 $and: [
//                     { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
//                     {
//                         $gte: [{
//                             $dateFromString: {
//                                 dateString: "$paymentDate",
//                                 format: "%d-%m-%Y"
//                             }
//                         }, startDate]
//                     },
//                     {
//                         $lte: [{
//                             $dateFromString: {
//                                 dateString: "$paymentDate",
//                                 format: "%d-%m-%Y"
//                             }
//                         }, endDate]
//                     }
//                 ]
//             }
//         };
//     }

//     let additionalFilters = {};

//     if (filters.roleBasedFilter) {
//         additionalFilters = {
//             pendingWith: adminRole,
//             $or: [
//                 { pendingWithAdminEmailId: { $exists: false } },
//                 { pendingWithAdminEmailId: "" },
//                 { pendingWithAdminEmailId: emailId }
//             ],
//             $or: [
//                 {
//                     requestor: 'CREDITOR',
//                     status: { $in: [constants.PAYMENT_HISTORY_STATUS.APPROVED] }
//                 },
//                 {
//                     status: { $in: [constants.PAYMENT_HISTORY_STATUS.PENDING, constants.PAYMENT_HISTORY_STATUS.RE_OPENED, constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW] }
//                 },
//             ]
//         };
//     } else {
//         additionalFilters = {
//             $or: [
//                 {
//                     requestor: 'CREDITOR',
//                     status: { $in: [constants.PAYMENT_HISTORY_STATUS.APPROVED] }
//                 },
//                 {
//                     status: { $in: [constants.PAYMENT_HISTORY_STATUS.PENDING, constants.PAYMENT_HISTORY_STATUS.RE_OPENED, constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW] }
//                 },
//                 { userSuspended: false }, { userSuspended: { $exists: false } }
//             ],
//         };
//     }
//     console.log(additionalFilters);
//     // let statusPass = [constants.PAYMENT_HISTORY_STATUS.PENDING, constants.PAYMENT_HISTORY_STATUS.RE_OPENED];

//     let transactions = await PaymentHistory.find({
//         ...additionalFilters,
//         // status: { $in: statusPass },
//         ...dateFilter // Include the date filter

//     }).populate(
//         [
//             {
//                 path: 'defaulterEntry',
//                 populate: [
//                     {
//                         path: 'invoices', populate: [
//                             'purchaseOrderDocument',
//                             'challanDocument',
//                             'invoiceDocument',
//                             'transportationDocument',
//                             'otherDocuments'
//                         ]
//                     },
//                     {
//                         path: 'debtor', populate: [{ path: 'ratings', populate: 'question' }]
//                     },
//                     { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" }
//                 ]
//             },
//             {
//                 path: 'disputedInvoiceSupportingDocuments', populate: [
//                     'invoice',
//                     'documents'
//                 ]
//             },

//             { path: 'creditorcacertificate' },
//             { path: 'creditoradditionaldocuments' },
//             { path: 'attachments' },
//             { path: 'debtorcacertificate' },
//             { path: 'debtoradditionaldocuments' },
//             { path: 'supportingDocuments' }
//         ]
//     );

//     transactions = transactions.filter(transaction => transaction.defaulterEntry);

//     transactions = transactions.map(transaction => {
//         transaction = transaction.toJSON();
//         if (transaction.defaulterEntry && transaction.defaulterEntry.creditorCompanyId) {
//             transaction.defaulterEntry.creditor = transaction.defaulterEntry.creditorCompanyId;
//             delete transaction.defaulterEntry.creditorCompanyId;
//         }
//         return transaction;
//     });

//     return transactions;
// }

exports.getAllTrasaction = async function (adminRole, emailId, filters, reqStatus) {

    let dateFilter = {};

    // Determine the date range based on req.body.dateSelection
    if (filters.dateSelection === "1m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "2m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 2] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "3m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 3] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "6m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 6] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "1y") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 365] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "CUSTOM") {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [{
                            $dateFromString: {
                                dateString: "$paymentDate",
                                format: "%d-%m-%Y"
                            }
                        }, startDate]
                    },
                    {
                        $lte: [{
                            $dateFromString: {
                                dateString: "$paymentDate",
                                format: "%d-%m-%Y"
                            }
                        }, endDate]
                    }
                ]
            }
        };
    }

    let additionalFilters = {};

    console.log(additionalFilters);
    // let statusPass = [constants.PAYMENT_HISTORY_STATUS.PENDING, constants.PAYMENT_HISTORY_STATUS.RE_OPENED];

    let transactions = await PaymentHistory.find({
        ...additionalFilters,
        // status: { $in: statusPass },
        ...dateFilter // Include the date filter

    }).populate(
        [
            {
                path: 'disputedInvoiceSupportingDocuments', populate: [
                    'invoice',
                    'documents'
                ]
            },

            { path: 'creditorcacertificate' },
            { path: 'creditoradditionaldocuments' },
            { path: 'attachments' },
            { path: 'debtorcacertificate' },
            { path: 'debtoradditionaldocuments' },
            { path: 'supportingDocuments' }
        ]
    );

    /*   transactions = transactions.filter(transaction => transaction.defaulterEntry); */

    transactions = transactions.map(transaction => {
        transaction = transaction.toJSON();
        /*   if (transaction.defaulterEntry && transaction.defaulterEntry.creditorCompanyId) {
              transaction.defaulterEntry.creditor = transaction.defaulterEntry.creditorCompanyId;
              delete transaction.defaulterEntry.creditorCompanyId;
          } */
        return transaction;
    });

    return transactions;
}

exports.getAllComplainList = async function (adminRole, emailId, filters, reqStatus) {

    let dateFilter = {};

    // Determine the date range based on req.body.dateSelection
    if (filters.dateSelection === "1m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "2m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 2] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "3m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 3] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "6m") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 30 * 6] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "1y") {
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [
                            {
                                $dateFromString: {
                                    dateString: "$paymentDate",
                                    format: "%d-%m-%Y"
                                }
                            },
                            { $toDate: { $subtract: [new Date(), { $multiply: [1000, 60, 60, 24, 365] }] } }
                        ]
                    }
                ]
            }
        };
    } else if (filters.dateSelection === "CUSTOM") {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        dateFilter = {
            $expr: {
                $and: [
                    { $ne: ["$paymentDate", ""] }, // Check if paymentDate is not empty
                    {
                        $gte: [{
                            $dateFromString: {
                                dateString: "$paymentDate",
                                format: "%d-%m-%Y"
                            }
                        }, startDate]
                    },
                    {
                        $lte: [{
                            $dateFromString: {
                                dateString: "$paymentDate",
                                format: "%d-%m-%Y"
                            }
                        }, endDate]
                    }
                ]
            }
        };
    }

    let additionalFilters = {};

    if (filters.roleBasedFilter) {
        additionalFilters = {
            pendingWith: adminRole,
            $or: [
                { pendingWithAdminEmailId: { $exists: false } },
                { pendingWithAdminEmailId: "" },
                { pendingWithAdminEmailId: emailId }
            ],
            $or: [
                {
                    latestStatus: { $in: [constants.PAYMENT_HISTORY_STATUS.PENDING, constants.PAYMENT_HISTORY_STATUS.RE_OPENED, constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW] }
                },
            ]
        };
    } else {
        additionalFilters = {
            $or: [
                {
                    latestStatus: { $in: [constants.PAYMENT_HISTORY_STATUS.PENDING, constants.PAYMENT_HISTORY_STATUS.RE_OPENED, constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW] }
                },
                { userSuspended: false }, { userSuspended: { $exists: false } }
            ],
        };
    }
    console.log(additionalFilters);
    // let statusPass = [constants.PAYMENT_HISTORY_STATUS.PENDING, constants.PAYMENT_HISTORY_STATUS.RE_OPENED];

    let transactions = await defaulterEntry.find({
        ...additionalFilters,
        // status: { $in: statusPass },
        ...dateFilter // Include the date filter

    }).populate(
        [
            { path: 'invoices' },
            {
                path: 'invoices', populate: [
                    { path: 'purchaseOrderDocument' },
                    { path: 'challanDocument' },
                    { path: 'invoiceDocument' },
                    { path: 'transportationDocument' },
                    { path: 'otherDocuments' },
                ]
            },
            // { path: 'debtor' },
            // { path: 'debtor', populate: 'ratings' },
            {
                path: 'debtor', populate: { path: 'ratings', populate: ['question'] }
            },
            { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" }
        ]
    );

    transactions = transactions.filter(transaction => transaction.adminShow == true);

    transactions = transactions.map(transaction => {
        transaction = transaction.toJSON();
        if (transaction && transaction.creditorCompanyId) {
            transaction.creditor = transaction.creditorCompanyId;
            delete transaction.creditorCompanyId;
        }
        return transaction;
    });

    return transactions;
}

exports.getTransactionsWithFilters = async function (filters) {


    let transactions = await PaymentHistory.find({
        ...filters,
    }).sort({ updatedAt: 1 }).populate(
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
                    path: 'debtor', populate: [
                        'ratings']
                }
            },
            {
                path: 'defaulterEntry', populate: {
                    path: 'debtor', populate: [{ path: 'ratings', populate: 'question' }]
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

    return transactions;
}


exports.getTransactionsWithDefaulterFilters = async function (filters) {

    let transactions = await defaulterEntry.find({
        ...filters,
    }).sort({ updatedAt: 1 }).populate(
        [
            { path: 'invoices' },
            {
                path: 'invoices', populate: [
                    { path: 'purchaseOrderDocument' },
                    { path: 'challanDocument' },
                    { path: 'invoiceDocument' },
                    { path: 'transportationDocument' },
                    { path: 'otherDocuments' },
                ]
            },
            // { path: 'debtor' },
            // { path: 'debtor', populate: 'ratings' },
            {
                path: 'debtor', populate: { path: 'ratings', populate: ['question'] }
            },
            { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" }
        ]
    );

    transactions = transactions.filter(transaction => transaction.adminShow == true);

    transactions = transactions.map(transaction => {
        transaction = transaction.toJSON();
        if (transaction && transaction.creditorCompanyId) {
            transaction.creditor = transaction.creditorCompanyId;
            delete transaction.creditorCompanyId;
        }
        return transaction;
    });

    return transactions;
}

exports.getTransactionsWithPaymentFilter = async function (filters) {

    let transactions = await PaymentHistory.find({
        ...filters,
    }).sort({ updatedAt: 1 }).populate(
        [
            {
                path: 'disputedInvoiceSupportingDocuments', populate: [
                    'invoice',
                    'documents'
                ]
            },

            { path: 'creditorcacertificate' },
            { path: 'creditoradditionaldocuments' },
            { path: 'attachments' },
            { path: 'debtorcacertificate' },
            { path: 'debtoradditionaldocuments' },
            { path: 'supportingDocuments' }
        ]
    );

    /*   transactions = transactions.filter(transaction => transaction.defaulterEntry); */

    transactions = transactions.map(transaction => {
        transaction = transaction.toJSON();
        /*   if (transaction.defaulterEntry && transaction.defaulterEntry.creditorCompanyId) {
              transaction.defaulterEntry.creditor = transaction.defaulterEntry.creditorCompanyId;
              delete transaction.defaulterEntry.creditorCompanyId;
          } */
        return transaction;
    });

    return transactions;
}



exports.deleteTransactionBasedOnFilter = async function (filters) {


    let transactions = await PaymentHistory.deleteMany({
        ...filters,
    });

    return transactions;
}
