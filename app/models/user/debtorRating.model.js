module.exports = mongoose => {
    var schema = mongoose.Schema({
        debtorId: String,
        defaulterEntryId: String,
        ratingCompany: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'company',
        },
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'questions',
        },
        response: String
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Debtor = mongoose.model("debtorRating", schema);
    return Debtor;
};