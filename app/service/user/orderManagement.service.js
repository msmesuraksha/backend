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



exports.updateOrderEntry = async function (reqBody, creditorCompanyDetails) {
  let tempArray = [];
  const updatedMainSection = await purchaseOrder.findByIdAndUpdate(reqBody.orderEntryId, {
    // creditorCompanyId: reqBody.creditorCompanyId,
    status: reqBody.status,
    totalAmount: reqBody.totalAmount,
    orderPaymentTerms: reqBody.orderPaymentTerms,
    orderRemarks: reqBody.orderRemarks,
  },
    { new: true, runValidators: true }
  ).populate("orders");

  if (!updatedMainSection) {
    return res.status(404).json({ message: "Main order not found" });
  }

  let updatedInvoicesList = [];

  // const deftEntNew = await defaulterEntry.findById(reqBody.defaulterEntryId);
  // console.log(deftEntNew);
  let invoicesList = reqBody.invoices
  for (const invoiceRow of invoicesList) {
    let existingInvoice;

    // Find existing invoice if it exists
    if (invoiceRow._id) {
      existingInvoice = deftEnt.invoices.find(invoice => invoice._id.toString() === invoiceRow._id);
    }

    // If existing invoice found, update it
    if (existingInvoice) {
      // Update existing invoice
      // Assuming you have a method updateInvoice in your service

      let purchaseOrderDocument = null;
      let challanDocument = null;
      let invoiceDocument = null;
      let transportationDocument = null;
      let otherDocuments = null;
      if (invoiceRow.purchaseOrderDocument) purchaseOrderDocument = await Documents.findById(invoiceRow.purchaseOrderDocument);
      if (invoiceRow.challanDocument) challanDocument = await Documents.findById(invoiceRow.challanDocument);
      if (invoiceRow.invoiceDocument) invoiceDocument = await Documents.findById(invoiceRow.invoiceDocument);
      if (invoiceRow.transportationDocument) transportationDocument = await Documents.findById(invoiceRow.transportationDocument);
      if (invoiceRow.otherDocuments) otherDocuments = await Documents.find({ _id: { $in: invoiceRow.otherDocuments } });

      sendB = await SendBillTransactions.findByIdAndUpdate(invoiceRow._id, {
        billDate: invoiceRow.billDate,
        billDescription: invoiceRow.billDescription,
        billNumber: invoiceRow.billNumber,
        creditAmount: invoiceRow.creditAmount,
        remainingAmount: invoiceRow.creditAmount,

        interestRate: invoiceRow.interestRate,
        creditLimitDays: invoiceRow.creditLimitDays,
        remark: invoiceRow.remark,
        items: invoiceRow.items,
        subTotal: invoiceRow.subTotal,
        tax: invoiceRow.tax,

        referenceNumber: invoiceRow.referenceNumber,
        invoiceNumber: invoiceRow.invoiceNumber,
        dueDate: invoiceRow.dueDate,
        percentage: invoiceRow.percentage,

        purchaseOrderDocument: purchaseOrderDocument,
        challanDocument: challanDocument,
        invoiceDocument: invoiceDocument,
        transportationDocument: transportationDocument,
        otherDocuments: otherDocuments

      });
      deftEnt.totalAmount += Number(sendB.remainingAmount);
      updatedInvoicesList.push(sendB);
    } else {
      let purchaseOrderDocument = null;
      let challanDocument = null;
      let invoiceDocument = null;
      let transportationDocument = null;
      let otherDocuments = null;
      if (invoiceRow.purchaseOrderDocument) purchaseOrderDocument = await Documents.findById(invoiceRow.purchaseOrderDocument);
      if (invoiceRow.challanDocument) challanDocument = await Documents.findById(invoiceRow.challanDocument);
      if (invoiceRow.invoiceDocument) invoiceDocument = await Documents.findById(invoiceRow.invoiceDocument);
      if (invoiceRow.transportationDocument) transportationDocument = await Documents.findById(invoiceRow.transportationDocument);
      if (invoiceRow.otherDocuments) otherDocuments = await Documents.find({ _id: { $in: invoiceRow.otherDocuments } });

      invoiceRow.purchaseOrderDocument = purchaseOrderDocument;
      invoiceRow.challanDocument = challanDocument;
      invoiceRow.invoiceDocument = invoiceDocument;
      invoiceRow.transportationDocument = transportationDocument;
      invoiceRow.otherDocuments = otherDocuments;


      // If invoice does not exist, create new invoice
      const newInvoice = await sendBillTransactionsService.createInvoice(invoiceRow, creditorCompanyDetails);
      updatedInvoicesList.push(newInvoice);
      deftEnt.totalAmount += Number(invoiceRow.remainingAmount);
    }
  }
  // Remove deleted invoices from existing defaulter entry
  for (const invoice of deftEnt.invoices) {
    const existsInUpdatedList = invoicesList.some(element => element._id === invoice._id.toString());
    if (!existsInUpdatedList) {
      // Delete the invoice from sendBillTransactions model
      await SendBillTransactions.findByIdAndDelete(invoice._id);
    }
  }

  // Update deftEnt.invoices after removing deleted invoices
  deftEnt.invoices = updatedInvoicesList.map(invoice => invoice._id);

  await deftEnt.save();

  return await defaulterEntry.findById(reqBody.defaulterEntryId).populate({
    path: 'invoices', populate: [
      'purchaseOrderDocument',
      'challanDocument',
      'invoiceDocument',
      'transportationDocument',
      'otherDocuments'
    ]
  });

};
