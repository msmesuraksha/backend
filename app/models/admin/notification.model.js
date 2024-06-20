module.exports = mongoose => {
    var schema = mongoose.Schema({
        notificationId: String,
        title: String,
        category: String,
        description: String,
        status: String
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const User = mongoose.model("notification", schema);
    return User;
};