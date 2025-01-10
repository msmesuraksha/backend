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
const purchaseOrder = db.purchaseOrder;
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

        const purchaseOrderNumber = req.body.orderNumber

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
                        status: { $nin: [constants.ORDER_HISTORY_STATUS.CANCELLED] }
                    },
                ],
            };
            let entry = await orderEntryService.getOrderEntryData({ debtor: element }, statusFilter);

            entry = entry.map(item => {
                // Assuming you want to rename 'creditorCompanyId' to 'creditorCompanyDetails'
                item._doc.creditor = item._doc.creditorCompanyId;
                delete item._doc.creditorCompanyId;
                return item;
            });

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

exports.orderStatusUpdate = async (req, res) => {
    try {
        const updatedOrder = await purchaseOrder.findByIdAndUpdate(
            req.body.orderEntryId,  // ID of the document to find
            { status: req.body.status }, // Update object with the new status
            { new: true } // Option to return the updated document
        );
        if (!updatedOrder) {
            console.log("order id not found ", req.body.orderEntryId)
            return res.status(409).send({ message: "Order not found", success: false, response: "" });
        };

        res.status(201).json({ message: "Order Entry updated successfully.", success: true, response: updatedOrder });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.updatePurchaseOrder = async (req, res) => {
    try {
        // Validate request
        const orderEnt = await purchaseOrder.findOne({ _id: req.body.orderEntryId });
        if (!orderEnt) {
            console.log("order not found ", req.body.orderEntryId)
            return res.status(409).send({ message: "order not found", success: false, response: "" });
        };

        const defaulterEntry = await orderEntryService.updateOrderEntry(req.body, req.token.companyDetails);

        res.status(201).json({ message: "Defaulter Entry updated successfully.", success: true, response: defaulterEntry });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }

};



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