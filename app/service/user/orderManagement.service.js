const db = require("../../models/user");
const admin_db = require("../../models/admin");
const commondb = require("../../models/common");
const sendBillTransactionsService = require("./sendBillTransactions.service");
const Documents = commondb.documents;

const purchaseOrder = db.purchaseOrder;
const defaulterEntry = db.defaulterEntry;
const PaymentHistory = admin_db.paymentHistory;
const Debtor = db.debtors;
const debtorService = require("./debtor.service");

const Companies = db.companies;
const Token = commondb.token;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtUtil = require('../../util/jwtUtil')
const mailUtility = require('../../util/mailUtility')
const commonUtil = require('../../util/commonUtil')
const mailController = require('../../controllers/common/mailTemplates.controller')
const config = process.env;
const Joi = require("joi");
const crypto = require("crypto");
const constants = require('../../constants/userConstants');
const whatsappUtility = require('../../util/whatsappUtil')





exports.createOrderEntry = async function (OrderEntryList, debtor, status, purchaseOrderNumber, companyDetails, orderData) {
    const result = purchaseOrder.create({
        debtor: debtor,
        creditorCompanyId: companyDetails.id,
        orders: OrderEntryList,
        status: status,
        orderNumber: purchaseOrderNumber,
        orderPaymentTerms: orderData.orderPaymentTerms,
        orderRemarks: orderData.orderRemarks,
        adminShow: true,
    });

    let replacements = [];
    replacements.push({ target: "alertMessage", value: "Invoices have been marked default, kindly check." })
    replacements.push({ target: "BUYER_NAME", value: debtor.companyName })
    replacements.push({ target: "SELLER_NAME", value: companyDetails.companyName })
    mailObj = await mailController.getMailTemplate("DEFAULTER_ENTRY_CREATE_BUYER", replacements)

    mailObj.to = debtor.customerEmail
    let ccEmails = await debtorService.getDebtorAndCompanyOwnerEmails(debtor.gstin);
    mailObj.cc = ccEmails;

    let buyerWAPMessage = await mailController.getMailTemplate("DEFAULTER_ENTRY_CREATE_BUYER", replacements)

    // Seller Email send

    let replacements2 = [];
    replacements2.push({ target: "alertMessage", value: "Invoices have been marked default, kindly check." })
    replacements2.push({ target: "BUYER_NAME", value: debtor.companyName })
    replacements2.push({ target: "SELLER_NAME", value: companyDetails.companyName })
    mailObj2 = await mailController.getMailTemplate("DEFAULTER_ENTRY_CREATE_SELLER", replacements2)

    mailObj2.to = companyDetails.emailId
    mailObj2.subject = `Complaint against ${debtor.companyName} for non payment of dues`
    let ccEmails2 = await debtorService.getCompanyOwnerEmail(companyDetails.gstin);
    mailObj2.cc = ccEmails2;

    let sellerWAPMessage = await mailController.getMailTemplate("DEFAULTER_ENTRY_CREATE_SELLER", replacements2)


    let sellermobile = await debtorService.getCompanyOwnerMobNumber(companyDetails.gstin);


    if (status != "DRAFT") {
        /*     whatsappUtility.sendWhatsappMessage(debtor.customerMobile, buyerWAPMessage)
            whatsappUtility.sendWhatsappMessage(sellermobile, sellerWAPMessage) */
        mailUtility.sendMail(mailObj)
        mailUtility.sendMail(mailObj2)
    }

    return result;

};



exports.getOrderEntryData = function (condition, additionalFilters) {

    if (!additionalFilters) {
      additionalFilters = {}
    }
    return purchaseOrder.find({ ...condition, ...additionalFilters }).populate([
      { path: 'orders' },
      {
        path: 'orders', populate: [
          { path: 'orderDocuments' },
        ]
      },
      {
        path: 'debtor', populate: { path: 'ratings', populate: ['question'] }
      },
      { path: 'creditorCompanyId', model: 'company', populate: "companyOwner" }
    ])
  };