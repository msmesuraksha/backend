const db = require("../../models/admin");
const user_db = require("../../models/user");
const { ObjectId } = require('mongodb');
const constants = require('../../constants/userConstants');
const SubscriptionPkg = db.subscriptionPkg;
const SubscriptionPkgAPIQuotaMapping = db.subscriptionPkgAPIQuotaMapping;

exports.addSubscriptionPkgAPIQuotaMapping = function(packageDetails)  {

    return SubscriptionPkgAPIQuotaMapping.create({
            subscriptionPkgId: packageDetails.subscriptionPkgId,
            apiName: packageDetails.apiName,
            monthlyQuotaLimit: packageDetails.monthlyQuotaLimit,
            yearlyQuotaLimit: packageDetails.yearlyQuotaLimit
        })
}

  

exports.createPaymentHistory = function(details, newStatus, newPendingWith, newApprovedByCreditor) {
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
