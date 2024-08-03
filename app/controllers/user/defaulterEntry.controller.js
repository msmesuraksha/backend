const db = require("../../models/user");
const commondb = require("../../models/common");
const Documents = commondb.documents;
const Logs = commondb.logs;
const admin_db = require("../../models/admin");
const SendBillTransactions = db.sendBillTransactions;
const DefaulterEntry = db.defaulterEntry;
const Debtors = db.debtors;
const DebtorRating = db.debtorRating;
const PaymentHistory = admin_db.paymentHistory;
const fs = require('fs');
const PDFDocument = require('pdfkit');
const constants = require('../../constants/userConstants');
const service = require("../../service/user");
const sendBillTransactionsService = service.sendBillTransactions;
const defaulterEntryService = service.defaulterEntry;
const paymentHistoryService = require("../../service/admin").paymentHistoryService;
const path = require('path');
const commonUtil = require('../../util/commonUtil')

var a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
var b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function inWords(num) {
    if ((num = num.toString()).length > 9) return 'overflow';
    n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only ' : '';
    return str;
}

function createInvoicePDF(pdfInvObj, debtor, outputPath) {
    let doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Add metadata and styles here, like fonts or images
    generateInformation(doc, debtor, pdfInvObj);
    // Add other sections like items, totals, etc.
    const outputDir = path.dirname(outputPath);

    // Ensure the directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    doc.end();
    doc.pipe(fs.createWriteStream(outputPath));
}

function generateInformation(doc, debtor, pdfInvObj) {
    doc
        .fontSize(15)
        .text('INVOICE', { align: 'right' })
        .fontSize(10)
        .text(`Invoice Number: ${pdfInvObj.invoiceNumber}`, { align: 'right' })
        .text(`Invoice Date: ${new Date(pdfInvObj.billDate).toLocaleDateString()}`, { align: 'right' })
        .text(`Due Date: ${new Date(pdfInvObj.dueDate).toLocaleDateString()}`, { align: 'right' })
        .moveDown();

    // Debtor Information
    doc
        .fontSize(12)
        .text('Bill To:')
        .fontSize(10)
        .text(debtor.ownerName)
        .text(debtor.ownerMobile)
        .text(debtor.companyName)
        .text(`GSTIN: ${debtor.gstin}`)
        .text(`Company PAN: ${debtor.companyPan}`)
        .moveDown();

    // Invoice Details Table
    doc
        .moveDown()
        .fontSize(10)
        .text('Items & Description', { continued: true, width: 250 })
        .text('Qty', { continued: true, width: 50 })
        .text('Cost', { width: 70 })
        .moveDown();

    for (let i = 0; i < pdfInvObj.items.length; i++) {
        // Example Item
        doc
            .fontSize(10)
            .text(`${pdfInvObj.items[i].name}`, { continued: true, width: 250 })
            .text(`${pdfInvObj.items[i].quantity}`, { continued: true, width: 50 }) // Quantity
            .text(`${pdfInvObj.items[i].cost}`, { width: 70 }) // Amount
            .moveDown();
    }

    // Total
    doc
        .fontSize(10)
        .text('Sub Total', { continued: true })
        .text(`${pdfInvObj.subTotal}`, { align: 'right' })
        .text('Tax', { continued: true })
        .text(`${pdfInvObj.tax}`, { align: 'right' })
        .text('Total', { continued: true })
        .text(`${pdfInvObj.creditAmount + pdfInvObj.remainingAmount}`, { align: 'right' })
        .text('Payment Made', { continued: true })
        .text(`(${pdfInvObj.creditAmount})`, { align: 'right' })
        .text('Balance Due', { continued: true })
        .text(`(${pdfInvObj.remainingAmount})`, { align: 'right' })
        .text(`Total: ${inWords(pdfInvObj.creditAmount)}`, { align: 'right' })
        .moveDown();

    // Footer
    doc
        .fontSize(10)
        .text('Notes:')
        .fontSize(9)
        .text('Thank you for your business.')
        .text('Authorized Signature: ______________________', { align: 'right' })
        .moveDown();
}

exports.create = async (req, res) => {
    try {
        let invoicesList = req.body.invoicesList;
        let newStatus = req.body.status;
        // Validate request
        const debtor = await Debtors.findOne({ _id: invoicesList[0].debtorId });
        if (!debtor) {
            console.log("debtor not found", invoicesList[0].debtorId)
            return res.status(409).send({ message: "debtor not found", success: false, response: "" });
        };

        let defaulterEntryList = [];
        let totalAmount = 0;

        let debtorGstNumber = debtor.gstin

        const complaintNumber = generateUniqueID(debtorGstNumber)

        for (const element of invoicesList) {

            if (element.purchaseOrderDocument) {
                element.purchaseOrderDocument = await Documents.findById(element.purchaseOrderDocument);
            } else element.purchaseOrderDocument = null

            if (element.challanDocument) element.challanDocument = await Documents.findById(element.challanDocument);
            else element.challanDocument = null

            if (element.invoiceDocument) element.invoiceDocument = await Documents.findById(element.invoiceDocument);
            else element.invoiceDocument = null

            if (element.transportationDocument) {
                element.transportationDocument = await Documents.findById(element.transportationDocument);
            }
            else element.transportationDocument = null

            if (element.otherDocuments) element.otherDocuments = await Documents.find({ _id: { $in: element.otherDocuments } });
            else element.otherDocuments = null

            element.type = "EXTERNAL"
            // Create a SendBillTransactions
            const bill = await sendBillTransactionsService.createInvoice(element, req.token.companyDetails);

            //append to store in defaultEntry and calculate totalAmount of invoices
            defaulterEntryList.push(bill);
            totalAmount += Number(element.remainingAmount);

            //create pdf here
            // createInvoicePDF(bill, debtor, './temp/invoices/'+bill._id+'.pdf');

        }
        const defEnt = await defaulterEntryService.createEntry(defaulterEntryList, debtor, newStatus, totalAmount, complaintNumber, req.token.companyDetails);

        res.status(201).json({ message: "Defaulter has been added successfully.", success: true, response: defEnt });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }

};


exports.getAllInvoicesSentToMe = async (req, res) => {
    try {
        const dbtrs = await Debtors.find({ gstin: req.token.companyDetails.gstin });
        //console.log(dbtrs);
        let defaulterEntries = [];
        for (const element of dbtrs) {

            /*   let statusFilter = { status: { $ne: constants.INVOICE_STATUS.DRAFT } } */
            const statusFilter = {
                $or: [
                    {
                        latestStatus: { $nin: [constants.PAYMENT_HISTORY_STATUS.COMPLAINT_DELETED, constants.INVOICE_STATUS.DRAFT] }
                    },
                ],
            };
            let entry = await defaulterEntryService.getCompleteDefaultEntryData({ debtor: element }, statusFilter);

            entry = entry.map(item => {
                // Assuming you want to rename 'creditorCompanyId' to 'creditorCompanyDetails'
                item._doc.creditor = item._doc.creditorCompanyId;
                delete item._doc.creditorCompanyId;
                return item;
            });


            for (let i = 0; i < entry.length; i++) {
                elem = entry[i]
                elem = elem.toJSON()
                // finding lowest duefrom date
                for (let invoice of elem.invoices) {
                    if (elem.dueFrom) {
                        if (elem.dueFrom > invoice.dueDate) {
                            elem.dueFrom = invoice.dueDate
                        }
                    } else {
                        elem.dueFrom = invoice.dueDate
                    }
                }
                elem.dueFrom = commonUtil.getDateInGeneralFormat(elem.dueFrom)

                //finding totalAmount
                // elem.totalAmount += Number(elem.totalAmount)
                entry[i] = elem;
            }

            // Use transformedResults
            defaulterEntries.push(...(entry));
        }


        res.status(200).json({ message: 'Invoices sent for you are fetched', success: true, response: defaulterEntries });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.getAllInvoicesRaisedByMe = async (req, res) => {
    try {
        if (req.token.userDetails.isActiveAccount == "INACTIVE") {
            return res.status(200).json({ message: 'Not Authorised to raise any complaint', success: true, response: "" });
        }

        const additionalFilters = {
            $or: [
                {
                    latestStatus: { $nin: [constants.PAYMENT_HISTORY_STATUS.COMPLAINT_DELETED] }
                },
            ],
        };
        // const invoices = await defaulterEntryService.getCompleteDefaultEntryData({creditorCompanyId:req.token.companyDetails.id}).populate("debtor debtor.ratings purchaseOrderDocument challanDocument invoiceDocument transportationDocument");
        let allEntries = await defaulterEntryService.getCompleteDefaultEntryData({ creditorCompanyId: req.token.companyDetails.id }, additionalFilters)
        console.log(req.token.companyDetails.id)

        allEntries = allEntries.map(item => {
            // Assuming you want to rename 'creditorCompanyId' to 'creditorCompanyDetails'
            item._doc.creditor = item._doc.creditorCompanyId;
            delete item._doc.creditorCompanyId;
            return item;
        });

        for (let i = 0; i < allEntries.length; i++) {
            elem = allEntries[i]
            elem = elem.toJSON()
            // finding lowest duefrom date
            for (let invoice of elem.invoices) {
                if (elem.dueFrom) {
                    if (elem.dueFrom > invoice.dueDate) {
                        elem.dueFrom = invoice.dueDate
                    }
                } else {
                    elem.dueFrom = invoice.dueDate
                }
            }
            elem.dueFrom = commonUtil.getDateInGeneralFormat(elem.dueFrom)

            //finding totalAmount
            // elem.totalAmount += Number(elem.totalAmount)
            allEntries[i] = elem;
        }

        res.status(200).json({ message: 'Invoices raised by you are fetched', success: true, response: allEntries });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


//payment history

exports.initiatePaymentVerification = async (req, res) => {
    try {
        let pmtHistory;
        if (req.body.requestor == "DEBTOR") {
            pmtHistory = await defaulterEntryService.createPaymentHistory(req.body, await DefaulterEntry.findById(req.body.defaulterEntryId), "PENDING", "L1", "false");
            // if(req.body.isDispute){
            //     for(let obj of req.body.invoiceAndSupportingDocs){
            //         if(obj.isCheckedForSupportingDocs){
            //             await SendBillTransactions.findOneAndUpdate({_id: obj.invoiceId}, {disputeSupportingDocumentsForInvoice: obj.disputeSupportingDocumentsForInvoice, isCheckedForSupportingDocs: true});
            //         }
            //     }
            // }
            let logStamp = { timeStamp: new Date().toISOString(), message: "Complaint disputed", remarks: req.body.debtorRemarks };
            const log = await Logs.create({
                pmtHistoryId: pmtHistory._id,
                logs: [logStamp]
            });
        } else if (req.body.requestor == "CREDITOR") {
            pmtHistory = await defaulterEntryService.createPaymentHistory(req.body, await DefaulterEntry.findById(req.body.defaulterEntryId), "PENDING", "L1", "true");

            let logStamp = { timeStamp: new Date().toISOString(), message: "Payment recorded by Seller", remarks: req.body.debtorRemarks };
            const log = await Logs.create({
                pmtHistoryId: pmtHistory._id,  // pmtHistory id
                logs: [logStamp]
            });
            let deftEntry = await DefaulterEntry.findOne({ _id: req.body.defaulterEntryId });
            deftEntry.totalAmount = deftEntry.totalAmount - req.body.amtPaid;
            if (deftEntry.totalAmount <= 0) {
                deftEntry.status = constants.INVOICE_STATUS.PAID
            }

            deftEntry.save()
            // let updatedDefaulterEntry = await DefaulterEntry.findByIdAndUpdate({_id: req.body.defaulterEntryId}, {totalAmount: newtotalAmount});
        }

        return res.status(200).send({ message: "Payment verification started with payment history creation", success: true, response: pmtHistory });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};


exports.initiatePaymentVerificationGeneral = async (req, res) => {
    try {
        const dbtrs = await Debtors.findOne({ gstin: req.token.companyDetails.gstin, creditorCompanyId: req.body.creditorId });
        //console.log(dbtrs);
        let defaulterEntries = [];
        if (dbtrs) {
            let entry = await defaulterEntryService.getCompleteDefaultEntryData({ debtor: element }, {});
            if (!entry) {
                return res.status(200).send({ message: "You don't have any invoices in Pending state", success: false, response: "" });
            }
            defaulterEntries.push(...(entry));
        }
        let remAmount = Number(req.body.amtPaid)
        for (element of defaulterEntries) {
            if (remAmount > 0) {
                let amount = 0
                if (remAmount >= element.totalAmount) {
                    amount = element.totalAmount
                    element.status = constants.INVOICE_STATUS.PAID
                } else {
                    amount = remAmount
                }
                remAmount = remAmount - element.totalAmount
                // element.totalAmount = element.totalAmount - amount
                // element.save()

                const pmtHistory = await paymentHistoryService.addPaymentHistory(req.body, amount);
            } else {
                break
            }
        }
        // create log
        // let logStamp = " [ "+new Date().toISOString()+" ] "+"Payment recorded for General";
        let logStamp = { timeStamp: new Date().toISOString(), message: "Payment recorded for General" };
        const log = await Logs.create({
            pmtHistoryId: pmtHistory._id,  // pmtHistory id
            logs: [logStamp]
        });
        return res.status(200).send({ message: "Payment verification started with payment history creation", success: true, response: this.pmtHistory });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};

// currently not required
// exports.getAllInvoicesSentToDebtor = async(req, res) => {
//     try{
//         let crdtrs = [];
//         // for(const element of dbtrs){
//         let invoices = await SendBillTransactions.find({debtorId: req.body.debtorId}).populate("debtor purchaseOrderDocument challanDocument invoiceDocument transportationDocument");
//         crdtrs.push(...( invoices));

//         res.status(200).json({message: 'Invoices sent for debtor are fetched', success: true, response: crdtrs});
//     }catch(error){
//         console.log(error)
//         res
//             .status(500)
//             .send({ message: "Something went wrong", success: false });
//     }
// }

exports.defaultInvoicesById = async (req, res) => {
    try {
        for (let invoice of req.body.invoices) {
            await defaulterEntryService.defaultInvoiceById(invoice.invoiceId)
        }
        res.status(200).json({ message: 'Given invoices has been defaulted', success: true });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.removeDefultingByInvoiceId = async (req, res) => {
    try {
        let defaulterEntry = await defaulterEntryService.defaultInvoiceById(req.body.defaulterEntryId)
        res.status(200).json({ message: 'Given invoices has been defaulted', success: true, response: defaulterEntry });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.disputedTransactions = async (req, res) => {
    try {
        dEId = req.body.defaulterEntryId;

    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.deleteDefaulterEntryById = async (req, res) => {
    try {
        const deftEntry = await DefaulterEntry.findById(req.body.defaulterEntryId).populate({
            path: 'debtor', populate: 'ratings'
        });

        if (!deftEntry) {
            return res.status(404).json({ message: 'Defaulter entry not found', success: false });
        }

        // Get all rating ids matching the defaulterEntryId and convert them to string
        let ratingsIds = deftEntry.debtor.ratings
            .filter(rating => String(rating.defaulterEntryId) === String(deftEntry._id))
            .map(rating => String(rating._id));

        // Delete all ratings from debtors
        let updatedDebtors = await Debtors.updateOne(
            { _id: deftEntry.debtor._id },
            { $pull: { ratings: { $in: ratingsIds } } }
        );

        // Delete all ratings
        let deleteRatingByDefaulterEntryId = await DebtorRating.deleteMany({ defaulterEntryId: req.body.defaulterEntryId });

        // if (deftEntry?.invoices) {
        //     for (let invoice of deftEntry?.invoices) {
        //         await SendBillTransactions.findByIdAndDelete(invoice);
        //     }
        // }
        // let deletePaymentHistories = await paymentHistoryService.deleteTransactionBasedOnFilter({ defaulterEntryId: req.body.defaulterEntryId });

        // await deftEntry?.delete();


        const pHistories = await PaymentHistory.find({ defaulterEntryId: req.body.defaulterEntryId })

        if (pHistories) {
            for (let pHistory of pHistories) {
                pHistory.status = constants.PAYMENT_HISTORY_STATUS.COMPLAINT_DELETED
                await pHistory.save();
            }
        }



        const deftEnt = await DefaulterEntry.findByIdAndUpdate(req.body.defaulterEntryId, {
            // status: constants.PAYMENT_HISTORY_STATUS.COMPLAINT_DELETED,
            latestStatus: constants.PAYMENT_HISTORY_STATUS.COMPLAINT_DELETED,
        }).populate("invoices");



        res.status(200).json({ message: 'Defaulter Entry and associated payment histories have been deleted.', success: true, response: pHistories });
    } catch (error) {
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.updateDefaulterEntry = async (req, res) => {
    try {
        // Validate request
        const defEnt = await DefaulterEntry.findOne({ _id: req.body.defaulterEntryId });
        if (!defEnt) {
            console.log("Defaulter Entry not found ", req.body.defaulterEntryId)
            return res.status(409).send({ message: "Defaulter Entry not found", success: false, response: "" });
        };

        const defaulterEntry = await defaulterEntryService.updateDefaulterEntry(req.body, req.token.companyDetails);

        res.status(201).json({ message: "Defaulter Entry updated successfully.", success: true, response: defaulterEntry });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }

};


function generateUniqueID(gstNumber) {
    const gstPart = gstNumber.substring(0, 4);
    const random4Digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const currentTimeMS = new Date().getMilliseconds().toString().padStart(3, '0');
    const randomNumber = Math.random().toString(36).substring(2, 7);

    // Combine parts to form the unique ID
    const uniqueID = `BAF-${gstPart + random4Digits}-${currentTimeMS + randomNumber}`

    return uniqueID;
}