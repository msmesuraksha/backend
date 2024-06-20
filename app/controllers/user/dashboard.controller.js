const db = require("../../models/user");
const SendBillTransactions = db.sendBillTransactions;
const User = db.user;

// Create and Save a new Tutorial
exports.getData = (req, res) => {
    // Validate request
    const id = req.token.companyDetails.id;

    var condition = { creditorCompanyId: id };
    var result = {}
    SendBillTransactions.find(condition)
        .then(debtorData => {
            console.log("debtor in dashboard data", debtorData)
            console.log("debtor length", debtorData.length)
            result.debtorOverdueAmount = 0;
            debtorData.forEach(function(row) {
                if (!isNaN(row.creditAmount)) {
                    console.log(Number(row.creditAmount))
                    result.debtorOverdueAmount = result.debtorOverdueAmount + Number(row.creditAmount)
                }
            });
            console.log(id)
            condition = { debtorId: id };
            SendBillTransactions.find(condition)
                .then(creditorData => {
                    console.log("creditor dta", creditorData)
                    result.creditorOverdueAmount = 0;
                    creditorData.forEach(function(row) {

                        if (!isNaN(row.creditAmount)) {
                            console.log(Number(row.creditAmount))
                            result.creditorOverdueAmount = result.creditorOverdueAmount + Number(row.creditAmount)
                        }
                    });

                    res.send({message: 'Get Successful', success: true, response: result})
                });
        })
        .catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving tutorials.",
                success: false,
                response: null
            });
        });
};


