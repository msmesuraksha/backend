const db = require("../../models/user");
const commondb = require("../../models/common");
const Documents = commondb.documents;
const Logs = commondb.logs;
const admin_db = require("../../models/admin");
const SendBillTransactions = db.sendBillTransactions;
const DefaulterEntry = db.defaulterEntry;
const Debtors = db.debtors;
const DebtorRating = db.debtorRating;
const PaymentHistory = admin_db.paymentHistory;
const fs = require('fs');
const PDFDocument = require('pdfkit');
const constants = require('../../constants/userConstants');
const service = require("../../service/user");
const sendBillTransactionsService = service.sendBillTransactions;
const orderEntryListService = service.orderEntryList;
const orderEntryService = service.orderEntry;
const paymentHistoryService = require("../../service/admin").paymentHistoryService;
const path = require('path');
const commonUtil = require('../../util/commonUtil')

const defaulterEntryService = service.defaulterEntry;


exports.createPurchaseOrder = async (req, res) => {
    try {
        let orders = req.body.orders;
        let newStatus = req.body.status;
        let orderData = req.body
        // Validate request
        const debtor = await Debtors.findOne({ _id: orders[0].debtorId });
        if (!debtor) {
            console.log("debtor not found", orders[0].debtorId)
            return res.status(409).send({ message: "debtor not found", success: false, response: "" });
        };

        let OrderEntryList = [];
        let totalAmount = 0;

        let debtorGstNumber = debtor.gstin

        const purchaseOrderNumber = generateUniqueID(debtorGstNumber)

        for (const element of orders) {
            if (element.orderDocuments) element.orderDocuments = await Documents.find({ _id: { $in: element.orderDocuments } });
            else element.orderDocuments = null
            element.type = "EXTERNAL"
            const bill = await orderEntryListService.createOrderList(element, req.token.companyDetails);
            OrderEntryList.push(bill);
        }
        const defEnt = await orderEntryService.createOrderEntry(OrderEntryList, debtor, newStatus, purchaseOrderNumber, req.token.companyDetails, orderData);

        res.status(201).json({ message: "Order has been added successfully.", success: true, response: defEnt });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }

};


exports.getAllOrderSentToMe = async (req, res) => {
    try {
        const dbtrs = await Debtors.find({ gstin: req.token.companyDetails.gstin });
        //console.log(dbtrs);
        let defaulterEntries = [];
        for (const element of dbtrs) {

            /*   let statusFilter = { status: { $ne: constants.INVOICE_STATUS.DRAFT } } */
            const statusFilter = {
                $or: [
                    {
                        latestStatus: { $nin: [constants.ORDER_HISTORY_STATUS.CANCELLED, constants.INVOICE_STATUS.DRAFT] }
                    },
                ],
            };
            let entry = await defaulterEntryService.getCompleteDefaultEntryData({ debtor: element }, statusFilter);

            entry = entry.map(item => {
                // Assuming you want to rename 'creditorCompanyId' to 'creditorCompanyDetails'
                item._doc.creditor = item._doc.creditorCompanyId;
                delete item._doc.creditorCompanyId;
                return item;
            });


            // for (let i = 0; i < entry.length; i++) {
            //     elem = entry[i]
            //     elem = elem.toJSON()
            //     // finding lowest duefrom date
            //     for (let invoice of elem.invoices) {
            //         if (elem.dueFrom) {
            //             if (elem.dueFrom > invoice.dueDate) {
            //                 elem.dueFrom = invoice.dueDate
            //             }
            //         } else {
            //             elem.dueFrom = invoice.dueDate
            //         }
            //     }
            //     elem.dueFrom = commonUtil.getDateInGeneralFormat(elem.dueFrom)

            //     //finding totalAmount
            //     // elem.totalAmount += Number(elem.totalAmount)
            //     entry[i] = elem;
            // }

            // Use transformedResults
            defaulterEntries.push(...(entry));
        }


        res.status(200).json({ message: 'Invoices sent for you are fetched', success: true, response: defaulterEntries });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.getAllOrderCreateByMe = async (req, res) => {
    try {
        if (req.token.userDetails.isActiveAccount == "INACTIVE") {
            return res.status(200).json({ message: 'Not Authorised to raise any complaint', success: true, response: "" });
        }

        const additionalFilters = {
            $or: [
                {
                    status: { $nin: [constants.ORDER_HISTORY_STATUS.CANCELLED] }
                },
            ],
        };
        // const invoices = await defaulterEntryService.getCompleteDefaultEntryData({creditorCompanyId:req.token.companyDetails.id}).populate("debtor debtor.ratings purchaseOrderDocument challanDocument invoiceDocument transportationDocument");
        let allEntries = await orderEntryService.getOrderEntryData({ creditorCompanyId: req.token.companyDetails.id }, additionalFilters)
        console.log(req.token.companyDetails.id)

        allEntries = allEntries.map(item => {
            // Assuming you want to rename 'creditorCompanyId' to 'creditorCompanyDetails'
            item._doc.creditor = item._doc.creditorCompanyId;
            delete item._doc.creditorCompanyId;
            return item;
        });

        res.status(200).json({ message: 'order raised by you are fetched', success: true, response: allEntries });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}



function generateUniqueID(gstNumber) {
    const gstPart = gstNumber.substring(0, 4);
    const random4Digits = Math.floor(Math.random() * 10000).toString().padStart(2, '0');
    const currentTimeMS = new Date().getMilliseconds().toString().padStart(3, '0');
    const randomNumber = Math.random().toString(36).substring(2, 7);

    // Combine parts to form the unique ID
    // const uniqueID = `BAF-${gstPart + random4Digits}-${currentTimeMS + randomNumber}`

    const uniqueID = `BAF-${gstPart + currentTimeMS + random4Digits}`


    return uniqueID;
}