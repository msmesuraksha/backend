const admindb = require("../../models/admin/");
const db = require("../../models/common/");
const Logs = db.logs;
const paymentHistory = admindb.paymentHistory;

exports.getLogsByPaymentId = async(req, res) => {
    try {
        let ress = await Logs.findOne({ pmtHistoryId: req.body.paymentId });
        res
            .status(200)
            .send({ message: "fetched log", success: true, response: ress });
    } catch (err) {
            res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.getAllLogs = async(req, res) => {
    try {
        let ress = await Logs.find();
        res
            .status(200)
            .send({ message: "fetched all logs", success: true, response: ress });
    } catch (err) {
            res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.getAllLogsByDefaulterEntry = async(req, res) => {
    try {

        let result = await paymentHistory.find({ defaulterEntryId: req.body.defaulterEntryId }).select("_id");

        let allPaymentHistoryIdsByDefaulterEntry = result.map(doc => doc._id.toString());
        console.log(allPaymentHistoryIdsByDefaulterEntry)

        let logs = await Logs.find({ pmtHistoryId: { $in: allPaymentHistoryIdsByDefaulterEntry } });

         let allLogs = logs.reduce((acc, logEntry) => {
            return acc.concat(logEntry.logs);
        }, []);

        allLogs.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));

        res
            .status(200)
            .send({ message: "fetched all logs by defaulterEntryId", success: true, response: allLogs });
    } catch (err) {
            res
            .status(500)
            .send({ message: "Something went wrong", success: false, response: err});
    }
};

exports.createLog = async(req, res) => {
    try {
        let log = await Logs.create({
            pmtHistoryId: req.body.pmtHistoryId,  // pmtHistory id
            logs: req.body.logs 
        });
        res
            .status(200)
            .send({ message: "Log created", success: true, response: log });
    } catch (err) {
            res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};






// exports.addMailTemplate = async(req, res) => {
//     try {

//         const template = await MailTemplates.create({
//             mailType: req.body.mailType,
//             subject: req.body.subject,
//             description: req.body.description,
//         }); 

//         // return new user
//         res.status(200).json({message: 'template created successfully.', success: true, response: template});
//     } catch (err) {
//         console.log(err)
//         res
//             .status(500)
//             .send({ message: "Something went wrong", success: false });
//     }
// };
