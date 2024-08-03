const userConstants = require("../../constants/userConstants");
const db = require("../../models/admin");
const DefaulterEntry = require("../../models/user").defaulterEntry;
const SendBillTransactions = require("../../models/user").sendBillTransactions;
const Admin = db.admin;
const PaymentHistory = db.paymentHistory;
const User = require("../../models/user").user

exports.getAdminData = async (req, res) => {
    var result = {}

    try {
        // Validate request
        let currAdmin = await Admin.findOne({ "emailId": req.token.adminDetails.emailId });

        let totalMemebers = await User.count();
        let amoundDue = await DefaulterEntry.aggregate([
            { $match: { status: { $ne: userConstants.INVOICE_STATUS.PAID }, latestStatus: { $ne: 'COMPLAINT_DELETED' }, $or: [{ userSuspended: false }, { userSuspended: { $exists: false } }] } },
            { $group: { _id: null, amount: { $sum: "$totalAmount" } } }
        ]);

        let amoundRecoveredPartiallyPaid = await SendBillTransactions.aggregate([
            { $match: { status: { $ne: userConstants.INVOICE_STATUS.PARTIALLY_PAID }, $or: [{ userSuspended: false }, { userSuspended: { $exists: false } }] } },
            {
                $group: {
                    _id: null, amount: {
                        $sum: {
                            $subtract: [
                                { $toDouble: "$creditAmount" },
                                { $toDouble: "$remainingAmount" }
                            ]
                        }
                    }
                }
            }
        ]);
        let amoundRecoveredFullyPaid = await PaymentHistory.aggregate([
            { $match: { status: { $eq: userConstants.INVOICE_STATUS.PAID }, $or: [{ userSuspended: false }, { userSuspended: { $exists: false } }] } },
            {
                $group: {
                    _id: null, amount: {
                        $sum: "$creditAmount"
                    }
                }
            }
        ]);
        amoundRecovered = amoundRecoveredFullyPaid[0] ? amoundRecoveredFullyPaid[0].amount : 0
            + amoundRecoveredPartiallyPaid[0] ? amoundRecoveredPartiallyPaid[0].amount : 0

        let response = {
            totalMemebers: totalMemebers,
            amoundDue: amoundDue[0].amount,
            amoundRecovered: amoundRecovered,
            totalReviews: currAdmin.transactionsProcessed
        }
        // Debtors.find(condition)
        //     .then(debtor => {
        //         debtor = debtor ? debtor[0] : null
        //         console.log("debtor in send bill transaction", debtor)
        //         const id = req.token.companyDetails.id;

        res.status(200).json({ message: "", success: true, response: response });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};
