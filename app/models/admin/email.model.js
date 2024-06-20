module.exports = mongoose => {
    var schema = mongoose.Schema({
        subject: String,
        senderEmailId: String,
        receiverEmailId: String,
        dateOfEmail: String,
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const User = mongoose.model("email", schema);
    return User;
};