
// // Authorization Middleware
// module.exports.AuthorizeOwner = (req, res, next) => {
//   // Check if the user has the required role or permission
//     if (req.token && req.token.userDetails.role =='OWNER') {
//       next(); // Allow access to the protected route
//     } else {
//       res.status(403).json({ message: 'Access forbidden', success: false});
//     }
// }
  