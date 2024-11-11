const { string } = require('joi');
const commonUtil = require('../../util/commonUtil')

module.exports = mongoose => {
    var schema = mongoose.Schema({
        debtor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'debtor'
        },
        creditorCompanyId: String,
        orders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'orderList'
        }],
        status: String,
        totalAmount: Number,
        userSuspended: Boolean,
        orderNumber: String,
        adminShow: Boolean,
        pendingWith: String,
        pendingWithAdminEmailId: String,
        orderPaymentTerms: String,
        orderRemarks: String,
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

    const PurchaseOrders = mongoose.model("purchaseOrders", schema);
    return PurchaseOrders;
};