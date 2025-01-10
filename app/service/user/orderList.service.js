const db = require("../../models/user");
const commondb = require("../../models/common");

const orderList = db.orderList;
const DefaulterEntry = db.defaulterEntry;
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


exports.defaultInvoiceById = function (invoiceId) {
  return DefaulterEntry.findByIdAndUpdate(
    invoiceId
    ,
    { status: constants.INVOICE_STATUS.DEFAULTED },
    { new: true }
  );
};



exports.createOrderList = async function (invoice, companyDetails) {
  let createdOrderLists = await orderList.create({
    debtorId: invoice.debtorId,
    orderDate: invoice.orderDate,
    orderItemName: invoice.orderItemName,
    orderQuantity: invoice.orderQuantity,
    orderRate: invoice.orderRate,
    orderUnit: invoice.orderUnit,
    orderDescription: invoice.orderDescription,
    orderTaxes: invoice.orderTaxes,
    creditorCompanyId: companyDetails.id,
    type: invoice.type,
    orderDocuments: invoice.orderDocuments,
  });

  return await createdOrderLists.populate({
    path: 'orderDocuments'
  });
};

