module.exports = mongoose => {
    var schema = mongoose.Schema({
        invoiceId: String,
        documentId: String,
        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'documents',
            options: { toJSON: { transform: true } } // This option will invoke toJSON on the populated documents
        },
        documentType: String,
        companyPan: String,
    },
    {
        timestamps: true
    }
    );

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Company = mongoose.model("invoiceDocuments", schema);
    return Company;
};