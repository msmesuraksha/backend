const { string } = require('joi');
const commonUtil = require('../../util/commonUtil')

module.exports = mongoose => {
    var schema = mongoose.Schema({
        debtor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'debtor'
        },
        creditorCompanyId: String,
        invoices: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'sendBillTransactions'
        }],
        status: String,
        latestStatus: String,
        totalAmount: Number,
        userSuspended: Boolean,
        complaintNumber: String,
        adminShow: Boolean,
        pendingWith: String,
        previousPendingWith: String,
        pendingWithAdminEmailId: String,
        documentsPendingSince: Date,
        isDocumentsRequiredByCreditor: Boolean,
        isDocumentsRequiredByDebtor: Boolean,
        attachments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        }],

        documentsRequiredFromCreditor: [String],
        documentsRequiredFromDebtor: [String],
        creditorcacertificate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        },
        creditoradditionaldocuments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        }],
        debtorcacertificate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        },
        debtoradditionaldocuments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        }],
        supportingDocuments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        }],

        disputedInvoiceSupportingDocuments: [{
            invoice: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'sendBillTransactions',
            },
            isCheckedForSupportingDocs: Boolean,
            documents: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'documents',
            }]
        }],

    },
        {
            timestamps: true
        }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        if (object.debtor?.ratings && Array.isArray(object.debtor?.ratings) && object.debtor?.ratings.length > 0 && object.debtor?.ratings[0].rating) {
            object.debtor.avgrating = commonUtil.calculateAverageRating(object.debtor?.ratings)
        }
        return object;
    });

    const DefaulterEntry = mongoose.model("defaulterEntry", schema);
    return DefaulterEntry;
};