module.exports = mongoose => {
    var schema = mongoose.Schema({
        mailType: String,
        subject: String,
        description: String
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const User = mongoose.model("mailTemplates", schema);
    return User;
};