const db = require("../../models/common/");
const commonService = require("../../service/common");
const TokenService = commonService.tokenService;

exports.saveTokenToDb = async(req, res) => {
    try {

        let tokenDetails = {
            paymentId: req.body.paymentId,
            userType: tokenDetails.userType,
            token: req.body.linkToken
        }
        const token = await TokenService.saveTokenToDb(tokenDetails);

        res.status(200).json({message: 'Token Saved successfully.', success: true, response: token});
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.deleteTokenFromDb = async(req, res) => {
    try {

        let obj= {
            paymentId: req.body.paymentId,
            userType: tokenDetails.userType
        };
         
        let deletedTok = await TokenService.deleteTokenFromDb(obj);
        if(deletedTok){
            res.status(200).json({message: 'Token deleted from db.', success: true, response: deletedTok});
        }
        res.status(403).json({message: 'Token not Found.', success: false, response: deletedTok});
        
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};
