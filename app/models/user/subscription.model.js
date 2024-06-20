module.exports = mongoose => {
    var schema = mongoose.Schema({
        userId: String,
        subscriptionPkgId: String,
        startDate: String,
        endDate: String,
        tenure: String,
        isActive: Boolean,
        subscriptionIdRemQuotaMapping: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'subscriptionIdRemQuotaMapping'
            }
        ]

    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Subscription = mongoose.model("subscription", schema);
    return Subscription;
};