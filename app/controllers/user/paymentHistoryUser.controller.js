const db = require("../../models/admin/");
const user_db = require("../../models/user");
const commondb = require("../../models/common");
const Logs = commondb.logs;
const mongoose = require("mongoose");
const uService = require("../../service/user/");
const service = require("../../service/admin/");
const userService = uService.user;
const debtorService = uService.debtor;
const paymentHistoryService = service.paymentHistoryService;
const DefaulterEntry = user_db.defaulterEntry;
const commonService = require("../../service/common");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const jwtUtil = require("../../util/jwtUtil");
const PaymentHistory = db.paymentHistory;
const SendBillTrans = user_db.sendBillTransactions;
const Debtors = user_db.debtors;
const constants = require("../../constants/userConstants");
const mailController = require("../../controllers/common/mailTemplates.controller");
const mailUtility = require("../../util/mailUtility");
const commonUtil = require("../../util/commonUtil");

exports.confirmPaymentByCreditor = async (req, res) => {
  try {
    const pHistory = await PaymentHistory.findOne({
      invoiceId: req.body.invoiceId,
      status: "PENDING",
    });
    if (pHistory) {
      const pmtHistory = await PaymentHistory.findByIdAndUpdate(
        pHistory._id,
        {
          invoiceId: req.body.invoiceId,
          amtPaid: req.body.amtPaid,
          proofFiles: "",
          status: "APPROVED",
          pendingWith: "",
          approvedByCreditor: "true",
        },
        { new: true }
      );

      //logging
      let paymentId = pHistory._id.toString();
      let existingLog = await Logs.findOne({ pmtHistoryId: paymentId });
      // let logMsg = " [ "+new Date().toISOString()+" ] "+"Payment recorded by Buyer approved by Seller";
      let logMsg = {
        timeStamp: new Date().toISOString(),
        message: "Payment recorded by Buyer, approved by Seller",
      };
      if (existingLog) {
        // If the document exists, update the logs array
        existingLog.logs.push(logMsg);
        await existingLog.save();
      } else {
        // create log
        let log = await Logs.create({
          pmtHistoryId: paymentId, // pmtHistory id
          logs: [logMsg],
        });
      }
    } else {
      const pmtHistory = await PaymentHistory.create({
        invoiceId: req.body.invoiceId,
        amtPaid: req.body.amtPaid,
        proofFiles: "",
        status: "APPROVED",
        pendingWith: "",
        approvedByCreditor: "true",
      });
      // create log
      const log = await Logs.create({
        pmtHistoryId: pmtHistory._id, // pmtHistory id
        // logs: [" [ "+new Date().toISOString()+" ] "+"Payment recorded by Buyer approved by Seller"]
        logs: [
          {
            timeStamp: new Date().toISOString(),
            message: "Payment recorded by Buyer, approved by Seller",
          },
        ],
      });
    }

    let invoice = await SendBillTrans.findOne({ _id: req.body.invoiceId });
    let newRemainingAmount = invoice.remainingAmount - amtPaid;
    let updatedSendBill = await SendBillTrans.findByIdAndUpdate(
      { _id: result.invoiceId },
      { remainingAmount: newRemainingAmount }
    );

    return res
      .status(200)
      .send({
        message: "Payment verification Done directly from creditor side",
        success: true,
        response: this.pmtHistory,
      });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ message: "Something went wrong", reponse: "", success: false });
  }
};

// exports.getTransactionsPendingForDocs = async (req, res) => {
//   try {
//     let debtorIds = await Debtors.find({ gstin: req.token.companyDetails.gstin }).select('_id').lean();
//     debtorIds = debtorIds.map(id => id._id)
//     // let pHistoryCreditor = await PaymentHistory.find({
//     //     status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
//     // }).populate({
//     //     path: 'defaulterEntry',
//     //     match: { creditorCompanyId: req.token.companyDetails.id }
//     //   }).exec();
//     //   pHistoryCreditor = pHistoryCreditor.filter(ph => ph.defaulterEntry);

//     let pHistoryCreditor = await PaymentHistory.aggregate([
//       {
//         $match: {
//           status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
//           isDocumentsRequiredByCreditor: true
//         }
//       },
//       {
//         $lookup: {
//           from: "defaulterentries", // This should be the name of the collection, in plural and lowercase
//           localField: "defaulterEntry",
//           foreignField: "_id",
//           as: "defaulterEntry"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry", // Deconstructs the array field from the previous $lookup stage
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $match: {
//           "defaulterEntry.creditorCompanyId": req.token.companyDetails.id
//         }
//       },
//       {
//         $lookup: {
//           from: "debtors",
//           localField: "defaulterEntry.debtor",
//           foreignField: "_id",
//           as: "defaulterEntry.debtor"
//         }
//       },
//       // Unwind debtor for further population
//       {
//         $unwind: {
//           path: "$defaulterEntry.debtor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "companies",
//           let: { companyId: "$defaulterEntry.creditorCompanyId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$_id", { $toObjectId: "$$companyId" }]
//                 }
//               }
//             }
//           ],
//           as: "defaulterEntry.creditor"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry.creditor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       //   {
//       //     $lookup: {
//       //         from: "sendbilltransactions", // Replace with your actual invoices collection name
//       //         localField: "defaulterEntry.invoices",
//       //         foreignField: "_id",
//       //         as: "defaulterEntry.invoices"
//       //     }
//       // },
//       {
//         $lookup: {
//           from: "sendbilltransactions", // Replace with your actual invoices collection name
//           localField: "defaulterEntry.invoices",
//           foreignField: "_id",
//           as: "defaulterEntry.invoices",
//           pipeline: [
//             // Additional $lookup stages to populate fields within each invoice
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "purchaseOrderDocument",
//                 foreignField: "_id",
//                 as: "purchaseOrderDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "challanDocument",
//                 foreignField: "_id",
//                 as: "challanDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "invoiceDocument",
//                 foreignField: "_id",
//                 as: "invoiceDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "transportationDocument",
//                 foreignField: "_id",
//                 as: "transportationDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "otherDocuments",
//                 foreignField: "_id",
//                 as: "otherDocuments"
//               }
//             },
//           ]
//         }

//       }

//       // {
//       //     $project: {
//       //         defaulterEntry: 0 // Optionally remove the temporary field
//       //     }
//       // }
//     ]);

//     console.log(pHistoryCreditor);

//     let pHistoryDebtor = await PaymentHistory.aggregate([
//       {
//         $match: {
//           status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
//           isDocumentsRequiredByDebtor: true
//         }
//       },
//       {
//         $lookup: {
//           from: "defaulterentries", // This should be the name of the collection, in plural and lowercase
//           localField: "defaulterEntry",
//           foreignField: "_id",
//           as: "defaulterEntry"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry", // Deconstructs the array field from the previous $lookup stage
//           preserveNullAndEmptyArrays: true
//         }
//       },

//       {
//         $lookup: {
//           from: "debtors",
//           localField: "defaulterEntry.debtor",
//           foreignField: "_id",
//           as: "defaulterEntry.debtor"
//         }
//       },
//       // Unwind debtor for further population
//       {
//         $unwind: {
//           path: "$defaulterEntry.debtor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $match: {
//           "defaulterEntry.debtor._id": { $in: debtorIds } // Assuming debtorIds is an array of ObjectId values
//         }
//       },
//       {
//         $lookup: {
//           from: "companies",
//           let: { companyId: "$defaulterEntry.creditorCompanyId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$_id", { $toObjectId: "$$companyId" }]
//                 }
//               }
//             }
//           ],
//           as: "defaulterEntry.creditor"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry.creditor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "sendbilltransactions", // Replace with your actual invoices collection name
//           localField: "defaulterEntry.invoices",
//           foreignField: "_id",
//           as: "defaulterEntry.invoices",
//           pipeline: [
//             // Additional $lookup stages to populate fields within each invoice
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "purchaseOrderDocument",
//                 foreignField: "_id",
//                 as: "purchaseOrderDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "challanDocument",
//                 foreignField: "_id",
//                 as: "challanDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "invoiceDocument",
//                 foreignField: "_id",
//                 as: "invoiceDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "transportationDocument",
//                 foreignField: "_id",
//                 as: "transportationDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "otherDocuments",
//                 foreignField: "_id",
//                 as: "otherDocuments"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "disputeSupportingDocumentsForInvoice",
//                 foreignField: "_id",
//                 as: "disputeSupportingDocumentsForInvoice"
//               }
//             }
//           ]
//         }

//       }
//     ]);

//     //   pHistoryCreditor = pHistoryCreditor.filter(ph => ph.defaulterEntry);

//     return res.status(200).send({ message: "List fethed", success: true, response: { transactionsRaisedByMe: pHistoryCreditor, transactionsSentToMe: pHistoryDebtor } });

//   } catch (err) {
//     console.log(err)
//     res
//       .status(500)
//       .send({ message: "Something went wrong", reponse: "", success: false });
//   }
// };

// exports.getTransactionsPendingForDocs = async (req, res) => {
//   try {
//     let debtorIds = await Debtors.find({ gstin: req.token.companyDetails.gstin }).select('_id').lean();
//     debtorIds = debtorIds.map(id => id._id)
//     // let pHistoryCreditor = await PaymentHistory.find({
//     //     status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
//     // }).populate({
//     //     path: 'defaulterEntry',
//     //     match: { creditorCompanyId: req.token.companyDetails.id }
//     //   }).exec();
//     //   pHistoryCreditor = pHistoryCreditor.filter(ph => ph.defaulterEntry);

//     let pHistoryCreditor = await PaymentHistory.aggregate([
//       {
//         $match: {
//           status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
//           isDocumentsRequiredByCreditor: true
//         }
//       },
//       {
//         $lookup: {
//           from: "defaulterentries", // This should be the name of the collection, in plural and lowercase
//           localField: "defaulterEntry",
//           foreignField: "_id",
//           as: "defaulterEntry"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry", // Deconstructs the array field from the previous $lookup stage
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $match: {
//           "defaulterEntry.creditorCompanyId": req.token.companyDetails.id
//         }
//       },
//       {
//         $lookup: {
//           from: "debtors",
//           localField: "defaulterEntry.debtor",
//           foreignField: "_id",
//           as: "defaulterEntry.debtor"
//         }
//       },
//       // Unwind debtor for further population
//       {
//         $unwind: {
//           path: "$defaulterEntry.debtor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "companies",
//           let: { companyId: "$defaulterEntry.creditorCompanyId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$_id", { $toObjectId: "$$companyId" }]
//                 }
//               }
//             }
//           ],
//           as: "defaulterEntry.creditor"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry.creditor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       //   {
//       //     $lookup: {
//       //         from: "sendbilltransactions", // Replace with your actual invoices collection name
//       //         localField: "defaulterEntry.invoices",
//       //         foreignField: "_id",
//       //         as: "defaulterEntry.invoices"
//       //     }
//       // },
//       {
//         $lookup: {
//           from: "sendbilltransactions", // Replace with your actual invoices collection name
//           localField: "defaulterEntry.invoices",
//           foreignField: "_id",
//           as: "defaulterEntry.invoices",
//           pipeline: [
//             // Additional $lookup stages to populate fields within each invoice
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "purchaseOrderDocument",
//                 foreignField: "_id",
//                 as: "purchaseOrderDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "challanDocument",
//                 foreignField: "_id",
//                 as: "challanDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "invoiceDocument",
//                 foreignField: "_id",
//                 as: "invoiceDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "transportationDocument",
//                 foreignField: "_id",
//                 as: "transportationDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "otherDocuments",
//                 foreignField: "_id",
//                 as: "otherDocuments"
//               }
//             },
//           ]
//         }

//       }

//       // {
//       //     $project: {
//       //         defaulterEntry: 0 // Optionally remove the temporary field
//       //     }
//       // }
//     ]);

//     console.log(pHistoryCreditor);

//     let pHistoryDebtor = await PaymentHistory.aggregate([
//       {
//         $match: {
//           status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
//           isDocumentsRequiredByDebtor: true
//         }
//       },
//       {
//         $lookup: {
//           from: "defaulterentries", // This should be the name of the collection, in plural and lowercase
//           localField: "defaulterEntry",
//           foreignField: "_id",
//           as: "defaulterEntry"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry", // Deconstructs the array field from the previous $lookup stage
//           preserveNullAndEmptyArrays: true
//         }
//       },

//       {
//         $lookup: {
//           from: "debtors",
//           localField: "defaulterEntry.debtor",
//           foreignField: "_id",
//           as: "defaulterEntry.debtor"
//         }
//       },
//       // Unwind debtor for further population
//       {
//         $unwind: {
//           path: "$defaulterEntry.debtor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $match: {
//           "defaulterEntry.debtor._id": { $in: debtorIds } // Assuming debtorIds is an array of ObjectId values
//         }
//       },
//       {
//         $lookup: {
//           from: "companies",
//           let: { companyId: "$defaulterEntry.creditorCompanyId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ["$_id", { $toObjectId: "$$companyId" }]
//                 }
//               }
//             }
//           ],
//           as: "defaulterEntry.creditor"
//         }
//       },
//       {
//         $unwind: {
//           path: "$defaulterEntry.creditor",
//           preserveNullAndEmptyArrays: true
//         }
//       },
//       {
//         $lookup: {
//           from: "sendbilltransactions", // Replace with your actual invoices collection name
//           localField: "defaulterEntry.invoices",
//           foreignField: "_id",
//           as: "defaulterEntry.invoices",
//           pipeline: [
//             // Additional $lookup stages to populate fields within each invoice
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "purchaseOrderDocument",
//                 foreignField: "_id",
//                 as: "purchaseOrderDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "challanDocument",
//                 foreignField: "_id",
//                 as: "challanDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "invoiceDocument",
//                 foreignField: "_id",
//                 as: "invoiceDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "transportationDocument",
//                 foreignField: "_id",
//                 as: "transportationDocument"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "otherDocuments",
//                 foreignField: "_id",
//                 as: "otherDocuments"
//               }
//             },
//             {
//               $lookup: {
//                 from: "documents", // Replace with the actual collection name
//                 localField: "disputeSupportingDocumentsForInvoice",
//                 foreignField: "_id",
//                 as: "disputeSupportingDocumentsForInvoice"
//               }
//             }
//           ]
//         }

//       }
//     ]);

//     //   pHistoryCreditor = pHistoryCreditor.filter(ph => ph.defaulterEntry);

//     return res.status(200).send({ message: "List fethed", success: true, response: { transactionsRaisedByMe: pHistoryCreditor, transactionsSentToMe: pHistoryDebtor } });

//   } catch (err) {
//     console.log(err)
//     res
//       .status(500)
//       .send({ message: "Something went wrong", reponse: "", success: false });
//   }
// };

exports.getTransactionsPendingForDocs = async (req, res) => {
  try {
    let debtorIds = await Debtors.find({
      gstin: req.token.companyDetails.gstin,
    })
      .select("_id")
      .lean();
    debtorIds = debtorIds.map((id) => id._id);
    // let pHistoryCreditor = await PaymentHistory.find({
    //     status: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
    // }).populate({
    //     path: 'defaulterEntry',
    //     match: { creditorCompanyId: req.token.companyDetails.id }
    //   }).exec();
    //   pHistoryCreditor = pHistoryCreditor.filter(ph => ph.defaulterEntry);

    let pHistoryCreditor = await DefaulterEntry.aggregate([
      {
        $match: {
          latestStatus: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
          isDocumentsRequiredByCreditor: true,
        },
      },
      {
        $match: {
          creditorCompanyId: req.token.companyDetails.id,
        },
      },
      {
        $lookup: {
          from: "debtors",
          localField: "debtor",
          foreignField: "_id",
          as: "debtor",
        },
      },
      // Unwind debtor for further population
      {
        $unwind: {
          path: "$debtor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "companies",
          let: { companyId: "$creditorCompanyId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $toObjectId: "$$companyId" }],
                },
              },
            },
          ],
          as: "creditor",
        },
      },
      {
        $unwind: {
          path: "$creditor",
          preserveNullAndEmptyArrays: true,
        },
      },
      //   {
      //     $lookup: {
      //         from: "sendbilltransactions", // Replace with your actual invoices collection name
      //         localField: "defaulterEntry.invoices",
      //         foreignField: "_id",
      //         as: "defaulterEntry.invoices"
      //     }
      // },
      {
        $lookup: {
          from: "sendbilltransactions", // Replace with your actual invoices collection name
          localField: "invoices",
          foreignField: "_id",
          as: "invoices",
          pipeline: [
            // Additional $lookup stages to populate fields within each invoice
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "purchaseOrderDocument",
                foreignField: "_id",
                as: "purchaseOrderDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "challanDocument",
                foreignField: "_id",
                as: "challanDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "invoiceDocument",
                foreignField: "_id",
                as: "invoiceDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "transportationDocument",
                foreignField: "_id",
                as: "transportationDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "otherDocuments",
                foreignField: "_id",
                as: "otherDocuments",
              },
            },
          ],
        },
      },

      // {
      //     $project: {
      //         defaulterEntry: 0 // Optionally remove the temporary field
      //     }
      // }
    ]);

    console.log(pHistoryCreditor);

    let pHistoryDebtor = await DefaulterEntry.aggregate([
      {
        $match: {
          latestStatus: constants.PAYMENT_HISTORY_STATUS.DOCUMENTS_NEEDED,
          isDocumentsRequiredByDebtor: true,
        },
      },

      {
        $lookup: {
          from: "debtors",
          localField: "debtor",
          foreignField: "_id",
          as: "debtor",
        },
      },
      // Unwind debtor for further population
      {
        $unwind: {
          path: "$debtor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "debtor._id": { $in: debtorIds }, // Assuming debtorIds is an array of ObjectId values
        },
      },
      {
        $lookup: {
          from: "companies",
          let: { companyId: "$creditorCompanyId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $toObjectId: "$$companyId" }],
                },
              },
            },
          ],
          as: "creditor",
        },
      },
      {
        $unwind: {
          path: "$creditor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sendbilltransactions", // Replace with your actual invoices collection name
          localField: "invoices",
          foreignField: "_id",
          as: "invoices",
          pipeline: [
            // Additional $lookup stages to populate fields within each invoice
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "purchaseOrderDocument",
                foreignField: "_id",
                as: "purchaseOrderDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "challanDocument",
                foreignField: "_id",
                as: "challanDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "invoiceDocument",
                foreignField: "_id",
                as: "invoiceDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "transportationDocument",
                foreignField: "_id",
                as: "transportationDocument",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "otherDocuments",
                foreignField: "_id",
                as: "otherDocuments",
              },
            },
            {
              $lookup: {
                from: "documents", // Replace with the actual collection name
                localField: "disputeSupportingDocumentsForInvoice",
                foreignField: "_id",
                as: "disputeSupportingDocumentsForInvoice",
              },
            },
          ],
        },
      },
    ]);

    //   pHistoryCreditor = pHistoryCreditor.filter(ph => ph.defaulterEntry);

    return res
      .status(200)
      .send({
        message: "List fethed",
        success: true,
        response: {
          transactionsRaisedByMe: pHistoryCreditor,
          transactionsSentToMe: pHistoryDebtor,
        },
      });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ message: "Something went wrong", reponse: "", success: false });
  }
};

// exports.getAllApprovedTransactionsUser = async (req, res) => {
//   try {

//     let currentGSTIN = req.token.companyDetails.gstin;

//     // as creditor
//     let credTransactions = await PaymentHistory.find({
//       status: constants.PAYMENT_HISTORY_STATUS.COMPLAINT_APPROVED,
//     }).populate(
//       [
//         { path: 'defaulterEntry' },
//         {
//           path: 'defaulterEntry', populate: {
//             path: 'invoices', populate: [
//               'purchaseOrderDocument',
//               'challanDocument',
//               'invoiceDocument',
//               'transportationDocument',
//               'otherDocuments'
//             ]
//           }
//         },
//         {
//           path: 'disputedInvoiceSupportingDocuments', populate: [
//             'invoice',
//             'documents'
//           ]
//         },
//         {
//           path: 'defaulterEntry', populate: {
//             path: 'debtor',
//             populate: {
//               path: 'ratings', populate: "question"
//             },

//           }
//         },
//         {
//           path: 'defaulterEntry', populate: {
//             path: 'creditorCompanyId',
//             match: {
//               'gstin': currentGSTIN
//             },
//             model: 'company'
//           }
//         },
//         { path: 'creditorcacertificate' },
//         { path: 'creditoradditionaldocuments' },
//         { path: 'attachments' },
//         { path: 'debtorcacertificate' },
//         { path: 'debtoradditionaldocuments' },
//         { path: 'supportingDocuments' }
//       ]
//     );
//     credTransactions = credTransactions.filter(credTransaction => credTransaction.defaulterEntry && credTransaction.defaulterEntry.creditorCompanyId !== null);

//     // as debtor
//     let transactions = await PaymentHistory.find({
//       status: constants.PAYMENT_HISTORY_STATUS.COMPLAINT_APPROVED,
//     }).populate(
//       [
//         { path: 'defaulterEntry' },
//         {
//           path: 'defaulterEntry', populate: {
//             path: 'invoices', populate: [
//               'purchaseOrderDocument',
//               'challanDocument',
//               'invoiceDocument',
//               'transportationDocument',
//               'otherDocuments'
//             ]
//           }
//         },
//         {
//           path: 'disputedInvoiceSupportingDocuments', populate: [
//             'invoice',
//             'documents'
//           ]
//         },
//         {
//           path: 'defaulterEntry', populate: {
//             path: 'debtor',
//             match: {
//               'gstin': currentGSTIN
//             },
//             populate: {
//               path: 'ratings', populate: "question"
//             },

//           }
//         },
//         { path: 'defaulterEntry', populate: { path: 'creditorCompanyId', model: 'company' } },
//         { path: 'creditorcacertificate' },
//         { path: 'creditoradditionaldocuments' },
//         { path: 'attachments' },
//         { path: 'debtorcacertificate' },
//         { path: 'debtoradditionaldocuments' },
//         { path: 'supportingDocuments' }
//       ]
//     );
//     //debtor.GSTIN not matching currentGSTIN, filterout
//     transactions = transactions.filter(transaction => transaction.defaulterEntry && transaction.defaulterEntry.debtor !== null);

//     transactions = transactions.map(transaction => {
//       transaction = transaction.toJSON();
//       if (transaction.defaulterEntry && transaction.defaulterEntry.creditorCompanyId) {
//         transaction.defaulterEntry.creditor = transaction.defaulterEntry.creditorCompanyId;
//         delete transaction.defaulterEntry.creditorCompanyId;
//       }
//       return transaction;
//     });

//     let resArray1 = [];
//     let countMap1 = new Map();
//     let resArray2 = [];
//     let countMap2 = new Map();

//     for (let i = 0; i < transactions.length; i++) {
//       for (let invoice of transactions[i].defaulterEntry.invoices) {
//         if (transactions[i].defaulterEntry.dueFrom) {
//           if (transactions[i].defaulterEntry.dueFrom > invoice.dueDate) {
//             transactions[i].defaulterEntry.dueFrom = invoice.dueDate
//           }
//         } else {
//           transactions[i].defaulterEntry.dueFrom = invoice.dueDate
//         }
//       }
//       transactions[i].defaulterEntry.dueFrom = commonUtil.getDateInGeneralFormat(transactions[i].defaulterEntry.dueFrom)

//       const defaulterEntryId = transactions[i].defaulterEntryId;
//       if (countMap1.has(defaulterEntryId)) {
//         resArray1[countMap1.get(defaulterEntryId)].totalAmountPaid += parseFloat(transactions[i].amtPaid);
//         resArray1[countMap1.get(defaulterEntryId)].dueFrom = transactions[i].defaulterEntry.dueFrom;
//         delete transactions[i].defaulterEntry;
//         resArray1[countMap1.get(defaulterEntryId)].pHArray.push(transactions[i]);
//       } else {
//         let temp = { defaulterEntry: transactions[i].defaulterEntry, totalAmountPaid: 0, dueFrom: null };
//         temp.totalAmountPaid += parseFloat(transactions[i].amtPaid);
//         temp.dueFrom = transactions[i].defaulterEntry.dueFrom;
//         delete transactions[i].defaulterEntry;
//         temp.pHArray = [transactions[i]];
//         resArray1.push(temp);
//         countMap1.set(defaulterEntryId, resArray1.length - 1);
//       }
//     }

//     // for creditor
//     for (let i = 0; i < credTransactions.length; i++) {
//       for (let invoice of credTransactions[i].defaulterEntry.invoices) {
//         if (credTransactions[i].defaulterEntry.dueFrom) {
//           if (credTransactions[i].defaulterEntry.dueFrom > invoice.dueDate) {
//             credTransactions[i].defaulterEntry.dueFrom = invoice.dueDate
//           }
//         } else {
//           credTransactions[i].defaulterEntry.dueFrom = invoice.dueDate
//         }
//       }
//       credTransactions[i].defaulterEntry.dueFrom = commonUtil.getDateInGeneralFormat(credTransactions[i].defaulterEntry.dueFrom)

//       const defaulterEntryId = credTransactions[i].defaulterEntryId;
//       if (countMap2.has(defaulterEntryId)) {
//         resArray2[countMap2.get(defaulterEntryId)].totalAmountPaid += parseFloat(credTransactions[i].amtPaid);
//         resArray2[countMap2.get(defaulterEntryId)].dueFrom = credTransactions[i].defaulterEntry.dueFrom;
//         delete credTransactions[i].defaulterEntry;
//         resArray2[countMap2.get(defaulterEntryId)].pHArray.push(credTransactions[i]);
//       } else {
//         let temp = { defaulterEntry: credTransactions[i].defaulterEntry, totalAmountPaid: 0, dueFrom: null };
//         temp.totalAmountPaid += parseFloat(credTransactions[i].amtPaid);
//         temp.dueFrom = credTransactions[i].defaulterEntry.dueFrom;
//         delete credTransactions[i].defaulterEntry;
//         temp.pHArray = [credTransactions[i]];
//         resArray2.push(temp);
//         countMap2.set(defaulterEntryId, resArray2.length - 1);
//       }
//     }

//     return res.status(200).send({ message: "", success: true, response: { "compaintsForMe": resArray1, "complaintsByMe": resArray2 } });
//   } catch (err) {
//     console.log(err)
//     res
//       .status(500)
//       .send({ message: "Something went wrong", reponse: "", success: false });
//   }
// };

exports.getAllApprovedTransactionsUser = async (req, res) => {
  try {
    let currentGSTIN = req.token.companyDetails.gstin;

    // as creditor
    let credTransactions = await DefaulterEntry.find({
      latestStatus: constants.PAYMENT_HISTORY_STATUS.COMPLAINT_APPROVED,
    }).populate([
      { path: "invoices" },
      {
        path: "invoices",
        populate: [
          { path: "purchaseOrderDocument" },
          { path: "challanDocument" },
          { path: "invoiceDocument" },
          { path: "transportationDocument" },
          { path: "otherDocuments" },
        ],
      },
      // { path: 'debtor' },
      // { path: 'debtor', populate: 'ratings' },
      {
        path: "debtor",
        populate: { path: "ratings", populate: ["question"] },
      },
      /* {
        path: "creditorCompanyId",
        match: {
          gstin: currentGSTIN,
        },
        model: "company",
        populate: "companyOwner",
      }, */
      { path: "creditorCompanyId", model: "company", populate: "companyOwner" },
      {
        path: "disputedInvoiceSupportingDocuments",
        populate: ["invoice", "documents"],
      },

      { path: "creditorcacertificate" },
      { path: "creditoradditionaldocuments" },
      { path: "attachments" },
      { path: "debtorcacertificate" },
      { path: "debtoradditionaldocuments" },
      { path: "supportingDocuments" },
    ]);
    credTransactions = credTransactions.filter(
      (credTransaction) =>
        credTransaction && credTransaction.creditorCompanyId !== null
    );

    // as debtor
    let transactions = await DefaulterEntry.find({
      latestStatus: constants.PAYMENT_HISTORY_STATUS.COMPLAINT_APPROVED,
    }).populate([
      { path: "invoices" },
      {
        path: "invoices",
        populate: [
          { path: "purchaseOrderDocument" },
          { path: "challanDocument" },
          { path: "invoiceDocument" },
          { path: "transportationDocument" },
          { path: "otherDocuments" },
        ],
      },
      // { path: 'debtor' },
      // { path: 'debtor', populate: 'ratings' },
      {
        path: "debtor",
        populate: { path: "ratings", populate: ["question"] },
      },
     /*  {
        path: "creditorCompanyId",
        match: {
          gstin: currentGSTIN,
        },
        model: "company",
        populate: "companyOwner",
      }, */
      { path: "creditorCompanyId", model: "company", populate: "companyOwner" },
      {
        path: "disputedInvoiceSupportingDocuments",
        populate: ["invoice", "documents"],
      },

      { path: "creditorcacertificate" },
      { path: "creditoradditionaldocuments" },
      { path: "attachments" },
      { path: "debtorcacertificate" },
      { path: "debtoradditionaldocuments" },
      { path: "supportingDocuments" },
    ]);
    //debtor.GSTIN not matching currentGSTIN, filterout
    transactions = transactions.filter(
      (transaction) => transaction && transaction.debtor !== null
    );

    transactions = transactions.map((transaction) => {
      transaction = transaction.toJSON();
      if (transaction && transaction.creditorCompanyId) {
        transaction.creditor = transaction.creditorCompanyId;
        delete transaction.creditorCompanyId;
      }
      return transaction;
    });

    let pHArrayList =
      await paymentHistoryService.getTransactionsWithPaymentFilter();

    let resArray1 = [];
    let countMap1 = new Map();
    let resArray2 = [];
    let countMap2 = new Map();

    for (let i = 0; i < transactions.length; i++) {
      for (let invoice of transactions[i].invoices) {
        if (transactions[i].dueFrom) {
          if (transactions[i].dueFrom > invoice.dueDate) {
            transactions[i].dueFrom = invoice.dueDate;
          }
        } else {
          transactions[i].dueFrom = invoice.dueDate;
        }
      }
      transactions[i].dueFrom = commonUtil.getDateInGeneralFormat(
        transactions[i].dueFrom
      );

      const defaulterEntryId = transactions[i];

      let temp = {
        defaulterEntry: transactions[i],
        totalAmountPaid: 0,
        dueFrom: null,
      };

      const defulterEntryRecord = pHArrayList.filter(
        (value) => value.defaulterEntryId == temp.defaulterEntry.id
      );

      for (let i = 0; i < defulterEntryRecord.length; i++) {
        temp.totalAmountPaid += parseFloat(defulterEntryRecord[i].amtPaid);
      }

      temp.dueFrom = transactions[i].dueFrom;

      temp.pHArray = defulterEntryRecord;
      resArray1.push(temp);
      countMap1.set(defaulterEntryId, resArray1.length - 1);
    }

    // for creditor
    for (let i = 0; i < credTransactions.length; i++) {
      for (let invoice of credTransactions[i].invoices) {
        if (credTransactions[i].dueFrom) {
          if (credTransactions[i].dueFrom > invoice.dueDate) {
            credTransactions[i].dueFrom = invoice.dueDate;
          }
        } else {
          credTransactions[i].dueFrom = invoice.dueDate;
        }
      }
      credTransactions[i].dueFrom = commonUtil.getDateInGeneralFormat(
        credTransactions[i].dueFrom
      );

      const defaulterEntryId = credTransactions[i];

      let temp = {
        defaulterEntry: credTransactions[i],
        totalAmountPaid: 0,
        dueFrom: null,
      };

      const defulterEntryRecord = pHArrayList.filter(
        (value) => value.defaulterEntryId == temp.defaulterEntry.id
      );

      for (let i = 0; i < defulterEntryRecord.length; i++) {
        temp.totalAmountPaid += parseFloat(defulterEntryRecord[i].amtPaid);
      }

      temp.dueFrom = credTransactions[i].dueFrom;
      //  delete credTransactions[i].defaulterEntry;
      temp.pHArray = defulterEntryRecord;
      resArray2.push(temp);
      countMap2.set(defaulterEntryId, resArray2.length - 1);
    }

    return res
      .status(200)
      .send({
        message: "",
        success: true,
        response: { compaintsForMe: resArray1, complaintsByMe: resArray2 },
      });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ message: "Something went wrong", reponse: "", success: false });
  }
};

exports.updatePaymentHistoryStatus = async (req, res) => {
  try {
    result = [];
    if (req.body.defaulterEntryId && req.body.defaulterEntryId !== "") {
      if (req.body.status == "RE_OPENED") {
        let pendingWith = "L2";

        let status = null;
        let defaulterId = req.body.defaulterEntryId;
        let existingLog = await Logs.findOne({ defaultId: defaulterId });

        status = req.body.status;
        reopenReason = req.body.reopenReason;
        reopenType = req.body.requester;

        //assign to L2
        let complaint = await DefaulterEntry.findByIdAndUpdate(
          { _id: defaulterId },
          {
            pendingWith: pendingWith,
            latestStatus: status,
            reopenReason: reopenReason,
            reopenRequester: reopenType,
            pendingWithAdminEmailId: "",
          }
        );

        result.push(complaint);

        // let logMsg = " [ "+new Date().toISOString()+" ] "+"Payment has been reopened by user "+paymentId+" and Case has been assigned to L2";
        let logMsg = {
          timeStamp: new Date().toISOString(),
          message:
            "Payment has been reopened by user " +
            req.token.userDetails.name +
            " and Case has been assigned to L2",
        };

        if (existingLog) {
          // If the document exists, update the logs array
          existingLog.logs.push(logMsg);
          await existingLog.save();
        } else {
          // create log
          let log = await Logs.create({
            defaultId: defaulterId, // pmtHistory id
            logs: [logMsg],
          });
        }

        let replacements = [];
        // replacements.push({ target: "password", value: password })
        mailObj = await mailController.getMailTemplate(
          "STATUS_REOPENED",
          replacements
        );

        mailObj.to = req.token.userDetails.emailId;
        mailUtility.sendMail(mailObj);

        return res
          .status(200)
          .send({
            message: "Payment Reopened",
            success: true,
            response: result,
          });
      }
    }
    return res
      .status(401)
      .send({
        message: "Problem with input / something went wrong",
        success: true,
        response: "",
      });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ message: "Something went wrong", reponse: "", success: false });
  }
};

exports.uploadSupportingDocuments = async (req, res) => {
  try {
    if (req.body.token) {
      let token = jwtUtil.verifyCustomToken(req.body.token);
      let tokenType = token.tokenType;
      req.body.defaulterEntryId = token.tokenDetails.defaulterEntryId;
      req.body.type = token.tokenDetails.type;
    }

    const defaulter = await DefaulterEntry.findOne({
      _id: req.body.defaulterEntryId,
    }).populate([
      // { path: 'defaulterEntry.debtor' },
      { path: "invoices" },
      {
        path: "invoices",
        populate: [
          { path: "purchaseOrderDocument" },
          { path: "challanDocument" },
          { path: "invoiceDocument" },
          { path: "transportationDocument" },
          { path: "otherDocuments" },
        ],
      },
      { path: "debtor", select: "customerEmail gstin" },
    ]);
    if (!defaulter) {
      return res
        .status(200)
        .json({
          message: "defaulter id is not valid.",
          success: false,
          response: "",
        });
    }
    let defaulterId = defaulter._id.toString();
    if (req.body.type == "DEBTOR") {
      if (req.body.token) {
        let token = jwtUtil.verifyCustomToken(req.body.token);
        let dbToken =
          await commonService.tokenService.getTokenByPaymentIdAndUser({
            defaulterEntryId: token.tokenDetails.defaulterEntryId,
            userType: "DEBTOR",
          });
        if (!dbToken) {
          return res
            .status(403)
            .json({
              message: "Token is not valid or has expired.",
              success: false,
              response: "",
            });
        }
      }

      if (req.body.debtorcacertificate) {
        defaulter.debtorcacertificate = mongoose.Types.ObjectId(
          req.body.debtorcacertificate
        );
      }

      if (req.body.debtoradditionaldocuments) {
        defaulter.debtoradditionaldocuments =
          req.body.debtoradditionaldocuments.map((doc) =>
            mongoose.Types.ObjectId(doc)
          );
      }

      defaulter.isDocumentsRequiredByDebtor = false;

      let replacements = [];
      let mailObj = await mailController.getMailTemplate(
        constants.MAIL_TEMPLATES.SUPPORTING_DOCUMENTS_UPLOADED_DEBTOR,
        replacements
      );
      mailObj.to = defaulter.debtor.customerEmail;
      let ccEmails = await debtorService.getDebtorAndCompanyOwnerEmails(
        defaulter.debtor.gstin
      );
      mailObj.cc = ccEmails;
      mailUtility.sendMail(mailObj);

      let existingLog = await Logs.findOne({ defaultId: defaulterId });
      // let logMsg = " [ "+new Date().toISOString()+" ] "+"Additional documents uploaded by Buyer";
      let logMsg = {
        timeStamp: new Date().toISOString(),
        message: "Additional documents uploaded by Buyer",
      };
      if (existingLog) {
        // If the document exists, update the logs array
        existingLog.logs.push(logMsg);
        await existingLog.save();
      } else {
        // create log
        let log = await Logs.create({
          defaultId: defaulterId, // pmtHistory id
          logs: [logMsg],
        });
      }
      if (req.body.token) {
        let token = jwtUtil.verifyCustomToken(req.body.token);
        await commonService.tokenService.deleteTokenFromDb({
          defaulterEntryId: token.tokenDetails.defaulterEntryId,
          userType: "DEBTOR",
        });
      }
    } else if (req.body.type == "CREDITOR") {
      if (req.body.token) {
        let token = jwtUtil.verifyCustomToken(req.body.token);
        let dbToken =
          await commonService.tokenService.getTokenByPaymentIdAndUser({
            defaulterEntryId: token.tokenDetails.defaulterEntryId,
            userType: "CREDITOR",
          });
        if (!dbToken) {
          return res
            .status(403)
            .json({
              message: "Token is not valid or has expired.",
              success: false,
              response: "",
            });
        }
      }

      if (req.body.creditorcacertificate) {
        defaulter.creditorcacertificate = mongoose.Types.ObjectId(
          req.body.creditorcacertificate
        );
      }

      if (req.body.creditoradditionaldocuments) {
        defaulter.creditoradditionaldocuments =
          req.body.creditoradditionaldocuments.map((doc) =>
            mongoose.Types.ObjectId(doc)
          );
      }

      for (let item of req.body.attachment) {
        let invoices = defaulter.invoices;
        let invoice = invoices.find(
          (obj) => obj._id.toString() == item.invoiceId
        );
        if (invoice) {
          if (item.purchaseOrderDocument)
            invoice.purchaseOrderDocument = mongoose.Types.ObjectId(
              item.purchaseOrderDocument
            );
          if (item.challanDocument)
            invoice.challanDocument = mongoose.Types.ObjectId(
              item.challanDocument
            );
          if (item.invoiceDocument)
            invoice.invoiceDocument = mongoose.Types.ObjectId(
              item.invoiceDocument
            );
          if (item.transportationDocument)
            invoice.transportationDocument = mongoose.Types.ObjectId(
              item.transportationDocument
            );
          await invoice.save();
        }
      }
      defaulter.isDocumentsRequiredByCreditor = false;

      let credMail = await userService
        .getCompanyOwner(defaulter.creditorCompanyId)
        .select("emailId");

      let replacements = [];
      let mailObj = await mailController.getMailTemplate(
        constants.MAIL_TEMPLATES.SUPPORTING_DOCUMENTS_UPLOADED_CREDITOR,
        replacements
      );
      mailObj.to = credMail;
      mailUtility.sendMail(mailObj);

      let existingLog = await Logs.findOne({ defaultId: defaulterId });
      // let logMsg = " [ "+new Date().toISOString()+" ] "+"Additional documents uploaded by Seller";
      let logMsg = {
        timeStamp: new Date().toISOString(),
        message: "Additional documents uploaded by Seller",
      };
      if (existingLog) {
        // If the document exists, update the logs array
        existingLog.logs.push(logMsg);
        await existingLog.save();
      } else {
        // create log
        let log = await Logs.create({
          defaultId: defaulterId, // pmtHistory id
          logs: [logMsg],
        });
      }
      if (req.body.token) {
        let token = jwtUtil.verifyCustomToken(req.body.token);
        await commonService.tokenService.deleteTokenFromDb({
          defaulterEntryId: token.tokenDetails.defaulterEntryId,
          userType: "CREDITOR",
        });
      }
    }
    if (
      defaulter.isDocumentsRequiredByCreditor == false &&
      defaulter.isDocumentsRequiredByDebtor == false
    ) {
      defaulter.latestStatus = constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW;
      defaulter.pendingWith = defaulter.previousPendingWith;

      const deftEnt = await DefaulterEntry.findByIdAndUpdate(defaulterId, {
        latestStatus: constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW,
      }).populate("invoices");

      // const pHistories = await PaymentHistory.find({ defaulterEntryId: defaulter.defaulterEntryId })

      /*    if (pHistories) {
           for (let defaulter of pHistories) {
             defaulter.status = constants.PAYMENT_HISTORY_STATUS.AWAITING_REVIEW
             defaulter.isDocumentsRequiredByCreditor == false
             defaulter.isDocumentsRequiredByDebtor == false
             defaulter.pendingWith = defaulter.previousPendingWith
             await defaulter.save();
           }
         } */

      let existingLog = await Logs.findOne({ defaultId: defaulterId });
      // let logMsg = " [ "+new Date().toISOString()+" ] "+"Case Pending with L1";
      let logMsg = {
        timeStamp: new Date().toISOString(),
        message: `Case Pending with ${defaulter.pendingWith}`,
      };
      if (existingLog) {
        // If the document exists, update the logs array
        existingLog.logs.push(logMsg);
        await existingLog.save();
      } else {
        // create log
        let log = await Logs.create({
          defaultId: defaulterId, // pmtHistory id
          logs: [logMsg],
        });
      }
    }
    await defaulter.save();

    return res
      .status(200)
      .send({
        message: "Successful upload",
        success: true,
        response: defaulter,
      });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .send({ message: "Something went wrong", reponse: "", success: false });
  }
};

exports.getTransactionByPaymentId = async (req, res) => {
  try {
    let transaction = await PaymentHistory.findOne({ _id: req.body.paymentId });

    if (transaction) {
      res
        .status(200)
        .json({
          message: "Transaction fetched successfully.",
          success: true,
          response: transaction,
        });
    } else {
      res
        .status(403)
        .json({
          message: "Transaction not found.",
          success: true,
          response: transaction,
        });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Something went wrong", success: false });
  }
};
