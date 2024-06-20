module.exports = mongoose => {
  var schema = mongoose.Schema(
    {
      paymentId: String,
      userType: String,
      token: String,
      createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600,
    },
    },
    { timestamps: true }
  );

  schema.method("toJSON", function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Token = mongoose.model("token", schema);
  return Token;
};
