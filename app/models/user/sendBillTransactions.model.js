module.exports = mongoose => {

    var schema = mongoose.Schema({
        invoiceId: String,
        // debtor: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: 'debtor'
        // },
        // debtorId: String,
        billDate: String,
        billDescription: String,
        billNumber: Number,
        creditAmount: Number,
        remainingAmount: Number, 
        // status: String,
        interestRate: Number,
        creditLimitDays: Number,
        creditorCompanyId: String,
        remark: String,
        items: [{ type: Object}],
        subTotal: Number,
        tax: Number,

        referenceNumber: String,
        invoiceNumber: String,
        dueDate: Date,
        percentage: String,
        type: String,

        purchaseOrderDocument: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        },
        challanDocument: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        },
        invoiceDocument: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        },
        transportationDocument: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        },
        otherDocuments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        }],
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const SendBillTransactions = mongoose.model("sendBillTransactions", schema);
    return SendBillTransactions;
};