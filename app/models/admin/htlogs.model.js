module.exports = mongoose => {
    var schema = mongoose.Schema({
        keyword: String,
        reqbody: Object
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const User = mongoose.model("htlogs", schema);
    return User;
};