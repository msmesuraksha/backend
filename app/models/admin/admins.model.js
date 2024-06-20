module.exports = mongoose => {
    var schema = mongoose.Schema({
        adminId: String,
        userName: { type: String, unique: true },
        name: String,
        emailId: { type: String, unique: true },
        phoneNumber: String,
        secPhoneNumber: String,
        joinedOn: Date,
        password: String,
        adminRole: String,
        transactionsProcessed: {
            type: Number,
            default: 0 
        },
        passwordChangeNeeded: Boolean,
        token: { type: String },
        refreshToken: { type: String }
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Admin = mongoose.model("admins", schema);
    return Admin;
};