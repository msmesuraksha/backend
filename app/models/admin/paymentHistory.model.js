module.exports = mongoose => {
    var schema = mongoose.Schema({
        defaulterEntryId: String,
        defaulterEntry: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'defaulterEntry'
        },
        amtPaid: Number,
        requestor: String,
        paymentDate: String,
        paymentMode: String,
        transactionId: String,
        bankAccNumber: String,
        chequeNumber: String,
        ifsc: String,
        bankName: String,
        reopenReason: String,
        userSuspended: Boolean,

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

        status: String,
        pendingWith: String,
        previousPendingWith: String,
        pendingWithAdminEmailId: String,
        debtorRemarks: String,
        creditorRemarks: String,
        totalAmtAsPerDebtor: String,
        adminRemarksForDebtor: String,
        adminRemarksForCreditor: String,
        approvedByCreditor: String,
        documentsPendingSince: Date,
        isDocumentsRequiredByCreditor: Boolean,
        isDocumentsRequiredByDebtor: Boolean,
        isDispute: Boolean,
        disputeType: String,
        otherDisputeReasons: [String],

        // Add disputedInvoiceSupportingDocuments field
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
        }]
    },
        {
            timestamps: true
        }
    );

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const PaymentHistory = mongoose.model("paymentHistory", schema);
    return PaymentHistory;
};