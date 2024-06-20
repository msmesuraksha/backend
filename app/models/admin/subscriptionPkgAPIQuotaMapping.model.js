module.exports = mongoose => {
    var schema = mongoose.Schema({
        subscriptionPkgId: String,
        apiName: String,
        monthlyQuotaLimit: Number,
        yearlyQuotaLimit: Number,
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const SubscriptionPkgAPIQuotaMapping = mongoose.model("subscriptionPkgAPIQuotaMapping", schema);
    return SubscriptionPkgAPIQuotaMapping;
};