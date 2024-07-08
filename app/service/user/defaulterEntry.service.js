const db = require("../../models/user");
const admin_db = require("../../models/admin");
const commondb = require("../../models/common/");
const sendBillTransactionsService = require("../../service/user/sendBillTransactions.service");
const Documents = commondb.documents;

const SendBillTransactions = db.sendBillTransactions;
const defaulterEntry = db.defaulterEntry;
const PaymentHistory = admin_db.paymentHistory;
const Debtor = db.debtors;
const debtorService = require("../../service/user/debtor.service");

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


exports.defaultInvoiceById = function (defaulterEntryId) {
  return defaulterEntry.findByIdAndUpdate(
    defaulterEntryId
    ,
    { status: constants.INVOICE_STATUS.DEFAULTED },
    { new: true }
  );
};


exports.createEntry = async function (defaulterEntryList, debtor, status, totalAmount, complaintNumber, companyDetails,) {
  const result = defaulterEntry.create({
    debtor: debtor,
    creditorCompanyId: companyDetails.id,
    invoices: defaulterEntryList,
    status: status,
    latestStatus: status,
    totalAmount: totalAmount,
    complaintNumber: complaintNumber
  });

  let replacements = [];
  replacements.push({ target: "alertMessage", value: "Invoices have been marked default, kindly check." })
  replacements.push({ target: "BUYER_NAME", value: debtor.companyName })
  replacements.push({ target: "SELLER_NAME", value: companyDetails.companyName })
  mailObj = await mailController.getMailTemplate("DEFAULTER_ENTRY_CREATE_BUYER", replacements)

  mailObj.to = debtor.customerEmail
  let ccEmails = await debtorService.getDebtorAndCompanyOwnerEmails(debtor.gstin);
  mailObj.cc = ccEmails;

  // Seller Email send

  let replacements2 = [];
  replacements2.push({ target: "alertMessage", value: "Invoices have been marked default, kindly check." })
  replacements2.push({ target: "BUYER_NAME", value: debtor.companyName })
  replacements2.push({ target: "SELLER_NAME", value: companyDetails.companyName })
  mailObj2 = await mailController.getMailTemplate("DEFAULTER_ENTRY_CREATE_SELLER", replacements)

  mailObj2.to = companyDetails.emailId
  let ccEmails2 = await debtorService.getCompanyOwnerEmail(companyDetails.gstin);
  mailObj2.cc = ccEmails2;


  if (status != "DRAFT") {
    mailUtility.sendMail(mailObj)
    mailUtility.sendMail(mailObj2)
  }

  return result;

};

exports.updateDefaulterEntry = async function (reqBody, creditorCompanyDetails) {
  let tempArray = [];
  const deftEnt = await defaulterEntry.findByIdAndUpdate(reqBody.defaulterEntryId, {
    // creditorCompanyId: reqBody.creditorCompanyId,
    status: reqBody.status,
  }).populate("invoices");
  deftEnt.totalAmount = 0;
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

exports.findInvoicesForCreditorPendingByDebtor = function (creditorId, debtorId, condition) {
  return defaulterEntry.find(
    {
      creditorCompanyId: creditorId, debtor: debtorId,
      ...condition
    }
  );
};

exports.findInvoicesPendingByDebtorIds = function (debtorIds, condition) {
  return defaulterEntry.find(
    {
      debtor: { $in: debtorIds },
      ...condition
    }
  );
};


exports.getCompleteDefaultEntryData = function (condition, additionalFilters) {

  if (!additionalFilters) {
    additionalFilters = {}
  }
  return defaulterEntry.find({ ...condition, ...additionalFilters }).populate([
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
  ])
};

exports.createPaymentHistory = function (reqbody, defaulterEntry, newStatus, newPendingWith, isApprovedByCreditor) {
  let transactionId = "", bankAccNumber = "";
  if (reqbody.transactionId && reqbody.bankAccNumber) {
    transactionId = reqbody.transactionId;
    bankAccNumber = reqbody.bankAccNumber;
  }
  let modifedDisputedInvoiceSupportingDocuments = []
  if (reqbody.disputedInvoiceSupportingDocuments) {
    for (let row of reqbody.disputedInvoiceSupportingDocuments) {
      if (row.isCheckedForSupportingDocs) {
        modifedDisputedInvoiceSupportingDocuments.push({
          invoice: row.invoiceId,
          isCheckedForSupportingDocs: row.isCheckedForSupportingDocs,
          documents: row.documents
        })
      }
    }
  }
  return PaymentHistory.create({
    defaulterEntryId: reqbody.defaulterEntryId,
    defaulterEntry: defaulterEntry,
    amtPaid: reqbody.amtPaid,
    requestor: reqbody.requestor,
    paymentDate: reqbody.paymentDate,
    paymentMode: reqbody.paymentMode,
    transactionId: transactionId,
    chequeNumber: reqbody.chequeNumber,
    bankAccNumber: bankAccNumber,
    ifsc: reqbody.ifsc,
    bankName: reqbody.bankName,
    attachments: reqbody.attachments,
    status: newStatus,
    pendingWith: newPendingWith,
    approvedByCreditor: isApprovedByCreditor,
    debtorcacertificate: (reqbody.debtorcacertificate && reqbody.debtorcacertificate != "") ? reqbody.debtorcacertificate : null,

    isDispute: (reqbody.isDispute && reqbody.isDispute != null) ? reqbody.isDispute : false,
    debtorRemarks: reqbody.debtorRemarks ? reqbody.debtorRemarks : null,
    creditorRemarks: reqbody.creditorRemarks ? reqbody.creditorRemarks : null,
    totalAmtAsPerDebtor: reqbody.totalAmtAsPerDebtor ? reqbody.totalAmtAsPerDebtor : null,
    disputeType: reqbody.disputeType,
    supportingDocuments: (reqbody.supportingDocuments && reqbody.supportingDocuments != "") ? reqbody.supportingDocuments : [],
    otherDisputeReasons: reqbody.otherDisputeReasons,
    disputedInvoiceSupportingDocuments: modifedDisputedInvoiceSupportingDocuments
  });
}

exports.getDefaulterCountForSelectedCompany = async function (companyGstin) {
  let debtrs = await Debtor.find({ gstin: companyGstin }).select('_id');

  // let arrayOfDebtorIds = debtrs.map(debtor => debtor._id);
  let arrayOfDebtorIds = debtrs;


  // const reslt = [];
  let ct = 0
  for (let i = 0; i < arrayOfDebtorIds.length; i++) {
    console.log(arrayOfDebtorIds[i])
    const temp = await defaulterEntry.find({ debtor: arrayOfDebtorIds[i]._id })
    if (temp) { ct += temp.length }
  }

  return ct;

};