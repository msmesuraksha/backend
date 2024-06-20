module.exports = mongoose => {
    var schema = mongoose.Schema({
        user: String,
        userName: String,
        name: String,
        aadharCardNo: String,
        emailId: { type: String, unique: true },
        phoneNumber: String,
        secPhoneNumber: String,
        joinedOn: Date,
        password: String,
        role: String,
        passwordChangeNeeded: Boolean,
        status: Boolean,
        city: String,
        state: String,
        isActiveAccount: String,
        //added for new suspension flow
        suspensionRemarkByL2: String,
        suspensionRemarkByL3: String,
        initiateSuspension: Boolean,
        token: { type: String },
        refreshToken: { type: String },
        permissions: [{ type: String}],
        companies: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'company',
        }]
    },{
        timestamps: true
    }

    );

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const User = mongoose.model("user", schema);
    return User;
};