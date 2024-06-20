const service = require("../service/user");
const userService = service.user;
const constants = require('../constants/userConstants');

// Authorization Middleware
module.exports.AuthorizeOwner = (req, res, next) => {
  // Check if the user has the required role or permission
    if (req.token && req.token.userDetails.role =='OWNER') {
      next(); // Allow access to the protected route
    } else {
      res.status(403).json({ message: 'You are not Authorised to perform the operation.', success: false});
    }
}

// Authorization Middleware
module.exports.companyLoginValidation = (req, res, next) => {
  // Check if the user has the required role or permission
    if (req.token && req.token.companyDetails?.id) {
      next(); // Allow access to the protected route
    } else {
      res.status(403).json({ message: 'Company Login is mandatory for accessing this route.', success: false});
    }
}

module.exports.CheckAccessForEmployee = async (req, res, next) => {
  // Check if the user has the required role or permission
    if (req.token && req.token.userDetails.role =='OWNER') {
      next(); // Allow access to the protected route
    } else {
      /*
      COMPANYSEARCH'
1:
'INVOICINGLEDGER'
2:
'RECORDPAYMENT
      */
      const currentURL = req.originalUrl; // Get the current URL
      let user =  (await userService.getUserById( req.token.userDetails.id ));
      if (user.permissions.includes(constants.API_NAME_URL_MAPPING[currentURL])) {
        next(); // Allow access to the protected route
      } else {
        res.status(403).json({ message: 'You are not Authorised to perform the operation.', success: false});
      }
    }
}


  