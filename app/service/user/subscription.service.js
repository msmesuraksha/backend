const userConstants = require("../../constants/userConstants");
const db = require("../../models/user");
const Subscription = db.subscription;
const SubscriptionIdRemQuotaMapping = db.subscriptionIdRemQuotaMapping;
const User = db.user;
const config = process.env;

const admin_db = require("../../models/admin");
const SubscriptionPkgAPIQuotaMapping = admin_db.subscriptionPkgAPIQuotaMapping
exports.updateRemQuotaForAPI = async function(userDetails, apiURL) {
    // find in subscription by userId and isActive  => get subscription Id
    // find Rem Quota mapp . limit remaining using sId

    let apiName = userConstants.API_NAME_URL_MAPPING_FOR_SUBSCRIPTION[apiURL]
    const sub = await Subscription.findOne({ userId: userDetails.id, isActive: true});
    if(sub){
        const subRemMapp = await SubscriptionIdRemQuotaMapping.findOne({ subscriptionId : sub._id, apiName: apiName });
        if(subRemMapp){
            let limitRemaining = subRemMapp.limitRemaining;
            let updateData = {
                limitRemaining: (limitRemaining==-1)? limitRemaining: ((limitRemaining*1)-1).toString()
            }
            const filter = { subscriptionId: sub._id, apiName: apiName };
            const update = { $set: updateData };

            const result = await SubscriptionIdRemQuotaMapping.updateMany(filter, update);

            return result;
        }
    } 
    return null;
};
exports.createSubscription = async(token, req, startDate, endDate) =>{
    
    const RSubscription = await Subscription.create({
        userId: token.userDetails.id,
        subscriptionPkgId: req.body.subscriptionPkgId,
        startDate: startDate.toISOString(),
        endDate: endDate,
        tenure: req.body.tenure,
        isActive: true
    })

    let subscriptionIdRemQuota = []
    // bring subscription package api quota from pkg id and check with tenure, assign limit and apiName on that basis
    let tempObj = await SubscriptionPkgAPIQuotaMapping.find({subscriptionPkgId: req.body.subscriptionPkgId});
    for(let i = 0; i < tempObj.length; i++){
        let limit = null;
        let api = tempObj[i].apiName;

        if(req.body.tenure == "Monthly"){
            limit = tempObj[i].monthlyQuotaLimit;
        }else if(req.body.tenure == "Yearly"){
            limit = tempObj[i].yearlyQuotaLimit;
        } else{
            limit = tempObj[i].yearlyQuotaLimit;
        }

        // create new mapping for remaining quota
        subscriptionIdRemQuota.push(await SubscriptionIdRemQuotaMapping.create({
                subscriptionId: RSubscription._id,
                apiName: api,
                limitRemaining: limit
        }))
    }
    RSubscription.subscriptionIdRemQuotaMapping = subscriptionIdRemQuota
    RSubscription.save()

    return RSubscription
}