module.exports = mongoose => {
    var schema = mongoose.Schema({
        questionDesc: String,
        questionType: String,
        isActive: { type: Boolean, default: true },
        values: []
    }, { timestamps: true });

    schema.method("toJSON", function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    const Questions = mongoose.model("questions", schema);
    return Questions;
};