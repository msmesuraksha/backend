module.exports = mongoose => {

    var schema = mongoose.Schema({
        invoiceId: String,
        debtorId: String,
        orderNumber: String,
        orderDate: String,
        orderItemName: String,
        orderQuantity: Number,
        orderUnit: String,
        orderRate: Number,
        remainingAmount: Number,
        orderDescription: String,
        orderTaxes: Number,
        creditorCompanyId: String,
        type: String,
        orderDocuments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
        }],
    }, { timestamps: true });

    schema.method("toJSON", function () {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const OrderList = mongoose.model("orderList", schema);
    return OrderList;
};