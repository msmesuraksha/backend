module.exports = mongoose => {
    var schema = mongoose.Schema({
        userId: String,
        name: String,
        url: String,
        uniqueName: String,
        type: String
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Documents = mongoose.model("documents", schema);
    return Documents;
};