const db = require("../../models/user");
const commondb = require("../../models/common/");
const Documents = commondb.documents;
const admin_db = require("../../models/admin");
const SendBillTransactions = db.sendBillTransactions;
const Debtors = db.debtors;
const PaymentHistory = admin_db.paymentHistory;
const fs = require('fs');
const PDFDocument = require('pdfkit');
const constants = require('../../constants/userConstants');
const service = require("../../service/user/");
const sendBillTransactionsService = service.sendBillTransactions;
const path = require('path');

var a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
var b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];

function inWords (num) {
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

function createInvoicePDF(pdfInvObj, outputPath) {
    let doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Add metadata and styles here, like fonts or images
    generateInformation(doc, pdfInvObj);
    // Add other sections like items, totals, etc.
    const outputDir = path.dirname(outputPath);

    // Ensure the directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    doc.end();
    doc.pipe(fs.createWriteStream(outputPath));
}

function generateInformation(doc, pdfInvObj) {
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
        .text(pdfInvObj.debtor._doc.ownerName)
        .text(pdfInvObj.debtor._doc.ownerMobile)
        .text(pdfInvObj.debtor._doc.companyName)
        .text(`GSTIN: ${pdfInvObj.debtor._doc.gstin}`)
        .text(`Company PAN: ${pdfInvObj.debtor._doc.companyPan}`)
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
        .text(`${pdfInvObj.creditAmount+pdfInvObj.remainingAmount}`, { align: 'right' })
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

exports.create = async(req, res) => {
    try{
        // Validate request
        const debtor = await Debtors.findOne({ _id: req.body.debtorId });
        if (!debtor) {
            console.log("debtor not found", req.body.debtorId)
            return res.status(409).send({ message: "debtor not found", success: false, response: "" });
        };
        req.body.purchaseOrderDocument = null
        req.body.challanDocument = null
        req.body.invoiceDocument = null
        req.body.transportationDocument = null
        req.body.otherDocuments = null
        if(req.body.purchaseOrderDocument) 
            req.body.purchaseOrderDocument = await Documents.findById(req.body.purchaseOrderDocument);
        if(req.body.challanDocument) req.body.challanDocument = await Documents.findById(req.body.challanDocument);
        if(req.body.invoiceDocument) req.body.invoiceDocument = await Documents.findById(req.body.invoiceDocument);
        if(req.body.transportationDocument) req.body.transportationDocument = await Documents.findById(req.body.transportationDocument);
        if(req.body.otherDocuments) req.body.otherDocuments = await Documents.findById(req.body.otherDocuments);

        req.body.status= constants.INVOICE_STATUS.PENDING
        req.body.type="EXTERNAL"
        // Create a SendBillTransactions
        const bill = await sendBillTransactionsService.createInvoice(req.body, req.token.companyDetails);

        //create pdf here
        createInvoicePDF(bill, './temp/invoices/'+bill._id+'.pdf');

        res.status(201).json({ message: "sendbill added successfully.", success: true, response: bill });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }

};


exports.updateInvoice = async(req, res) => {
    try{
        // Validate request
        const debtor = await Debtors.findOne({ _id: req.body.debtorId });
        if (!debtor) {
            console.log("debtor not found", req.body.debtorId)
            return res.status(409).send({ message: "debtor not found", success: false, response: "" });
        };

        let purchaseOrderDocument = null;
        let challanDocument= null;
        let invoiceDocument= null;
        let transportationDocument=null;
        let otherDocuments=null;
        if(req.body.purchaseOrderDocument) purchaseOrderDocument = await Documents.findById(req.body.purchaseOrderDocument);
        if(req.body.purchaseOrderDocument) challanDocument = await Documents.findById(req.body.challanDocument);
        if(req.body.purchaseOrderDocument) invoiceDocument = await Documents.findById(req.body.invoiceDocument);
        if(req.body.purchaseOrderDocument) transportationDocument = await Documents.findById(req.body.transportationDocument);
        if(req.body.purchaseOrderDocument) otherDocuments = await Documents.findById(req.body.otherDocuments);
        
        // Create a SendBillTransactions
        const bill = await SendBillTransactions.findByIdAndUpdate(req.body.invoiceId,{
            billDate: req.body.billDate,
            billDescription: req.body.billDescription,
            billNumber: req.body.billNumber,
            creditAmount: req.body.creditAmount,
            remainingAmount: req.body.creditAmount, 
            status: "PENDING",
            interestRate: req.body.interestRate,
            creditorCompanyId: req.token.companyDetails.id,
            creditLimitDays: req.body.creditLimitDays,
            remark: req.body.remark,
            items: req.body.items,
            subTotal: req.body.subTotal,
            tax: req.body.tax,

            referenceNumber: req.body.referenceNumber,
            invoiceNumber: req.body.invoiceNumber,
            dueDate: req.body.dueDate,
            percentage: req.body.percentage,

            purchaseOrderDocument: purchaseOrderDocument,
            challanDocument: challanDocument,
            invoiceDocument: invoiceDocument,
            transportationDocument: transportationDocument,
            otherDocuments: otherDocuments
        }, {new: true});

        resjson({ message: "sendbill added successfully.", success: true, response: bill });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }

};


exports.updateInvoiceDocuments = async(req, res) => {
    try{
        // Validate request
        let updates={};
        if(req.body.purchaseOrderDocument) updates.purchaseOrderDocument = await Documents.findById(req.body.purchaseOrderDocument);
        if(req.body.challanDocument) updates.challanDocument = await Documents.findById(req.body.challanDocument);
        if(req.body.invoiceDocument) updates.invoiceDocument = await Documents.findById(req.body.invoiceDocument);
        if(req.body.transportationDocument) updates.transportationDocument = await Documents.findById(req.body.transportationDocument);
        if(req.body.otherDocuments) updates.otherDocuments = await Documents.findById(req.body.otherDocuments);

        // Create a SendBillTransactions
        const bill = await SendBillTransactions.findByIdAndUpdate(req.body.invoiceId, updates, {new: true});

        res.json({ message: "Documents Updated Successfully.", success: true, response: bill });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};

exports.updateInvoiceDocumentsCACertificate = async(req, res)=> {
    try{

        let caCertificateDocument= req.body.caCertificateDocument;
        let defaulterEntryId = req.body.defaulterEntryId;
        let type = req.body.type;
        let updatedPH;

        if (type === "DEBTOR") {
            updatedPH = await PaymentHistory.updateMany(
                { defaulterEntryId: defaulterEntryId },
                { debtorcacertificate: caCertificateDocument },
                { new: true }
            );
        } else if (type === "CREDITOR") {
            updatedPH = await PaymentHistory.updateMany(
                { defaulterEntryId: defaulterEntryId },
                { creditorcacertificate: caCertificateDocument },
                { new: true }
            );
        } else {
            // Handle invalid type
            return res.status(400).json({ message: "Invalid type provided.", success: false });
        }

        res.json({ message: "Documents Updated Successfully for CA certificate.", success: true, response: updatedPH });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
};


exports.getAllInvoicesSentToMe = async(req, res) => {
    try{
        const dbtrs = await Debtors.find({gstin:req.token.companyDetails.gstin});
        //console.log(dbtrs);
        let crdtrs = [];
        for(const element of dbtrs){
            let invoices = await SendBillTransactions.find({creditorCompanyId:element.creditorCompanyId}).populate("debtor purchaseOrderDocument challanDocument invoiceDocument transportationDocument otherDocuments");
            crdtrs.push(...( invoices));
        }
        res.status(200).json({message: 'Invoices sent for you are fetched', success: true, response: crdtrs});
    }catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.getAllInvoicesRaisedByMe = async(req, res) => {
    try{
        const invoices = await SendBillTransactions.find({creditorCompanyId:req.token.companyDetails.id}).populate("purchaseOrderDocument challanDocument invoiceDocument transportationDocument otherDocuments");
        res.status(200).json({message: 'Invoices raised by you are fetched', success: true, response: invoices});
    }catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.getAllInvoicesForIds = async(req, res) => {
    try{
        let invoices = [];
        let invoiceIds = req.body;
        for(const element of invoiceIds){
            let inv = await SendBillTransactions.findById({_id:element.invoiceId}).populate("purchaseOrderDocument challanDocument invoiceDocument transportationDocument otherDocuments");
            invoices.push(inv);
        }
        res.status(200).json({message: 'Invoices raised by provided ids are fetched', success: true, response: invoices});
    }catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.getInvoicesForDefaulting = async(req, res) => {
    try{
        const currentDate = new Date();
        const invoices = await SendBillTransactions.find({status : { $ne: constants.INVOICE_STATUS.PAID}, dueDate: { $lt: currentDate }});
        res.status(200).json({message: '', success: true, response: invoices});
    } catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.proceedToDefault = async(req, res) => {
    try{
        const invoice = await sendBillTransactionsService.defaultInvoiceById(req.body.invoiceId)
        res.status(200).json({message: '', success: true, response: invoice});
    } catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.defaultInvoicesById = async(req, res) => {
    try{
        for(let invoice of req.body.invoices){
            await sendBillTransactionsService.defaultInvoiceById(invoice.invoiceId)
        }
        res.status(200).json({message: 'Given invoices has been defaulted', success: true});
    } catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.requestDefaultInvoiceEdit = async(req, res) => {
    try{
        let invoice=   await sendBillTransactionsService.defaultInvoiceById(invoice.invoiceId)
        res.status(200).json({message: 'Given invoices has been defaulted', success: true, response: invoice});
    } catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


exports.createDefaultedInvoice = async(req, res) => {
    try{
        // Validate request
        const debtor = await Debtors.findOne({ _id: req.body.debtorId });
        if (!debtor) {
            console.log("debtor not found", req.body.debtorId)
            return res.status(409).send({ message: "debtor not found", success: false, response: "" });
        };

        let purchaseOrderDocument = null;
        let challanDocument= null;
        let invoiceDocument= null;
        let transportationDocument=null;
        let otherDocuments = null;
        if(req.body.purchaseOrderDocument) purchaseOrderDocument = await Documents.findById(req.body.purchaseOrderDocument);
        if(req.body.purchaseOrderDocument) challanDocument = await Documents.findById(req.body.challanDocument);
        if(req.body.purchaseOrderDocument) invoiceDocument = await Documents.findById(req.body.invoiceDocument);
        if(req.body.purchaseOrderDocument) transportationDocument = await Documents.findById(req.body.transportationDocument);
        if(req.body.purchaseOrderDocument) otherDocuments = await Documents.findById(req.body.otherDocuments);
        
        // Create a SendBillTransactions
        
        const bill = await SendBillTransactions.create({
            debtor: debtor,
            debtorId: req.body.debtorId,
            billDate: req.body.billDate,
            billDescription: req.body.billDescription,
            billNumber: req.body.billNumber,
            creditAmount: req.body.creditAmount,
            remainingAmount: req.body.remainingAmount, 
            status: "PENDING",
            interestRate: req.body.interestRate,
            creditorCompanyId: req.token.companyDetails.id,
            creditLimitDays: req.body.creditLimitDays,
            remark: req.body.remark,
            items: req.body.items,
            subTotal: req.body.subTotal,
            tax: req.body.tax,

            referenceNumber: req.body.referenceNumber,
            invoiceNumber: req.body.invoiceNumber,
            dueDate: req.body.dueDate,
            percentage: req.body.percentage,

            purchaseOrderDocument: purchaseOrderDocument,
            challanDocument: challanDocument,
            invoiceDocument: invoiceDocument,
            transportationDocument: transportationDocument,
            otherDocuments: otherDocuments
        });

        //create pdf here
        createInvoicePDF(bill, './temp/invoices/'+bill._id+'.pdf');

        res.status(201).json({ message: "sendbill added successfully.", success: true, response: bill });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.removeDefultingByInvoiceId = async(req, res) => {
    try{
        let invoice=   await sendBillTransactionsService.defaultInvoiceById(req.body.invoiceId)
        res.status(200).json({message: 'Given invoices has been defaulted', success: true, response: invoice});
    } catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}

exports.getAllInvoicesSentToDebtor = async(req, res) => {
    try{
        let crdtrs = [];
        // for(const element of dbtrs){
        let invoices = await SendBillTransactions.find({debtorId: req.body.debtorId}).populate("debtor purchaseOrderDocument challanDocument invoiceDocument transportationDocument otherDocuments");
        crdtrs.push(...( invoices));
        
        res.status(200).json({message: 'Invoices sent for debtor are fetched', success: true, response: crdtrs});
    }catch(error){
        console.log(error)
        res
            .status(500)
            .send({ message: "Something went wrong", success: false });
    }
}


//payment history

exports.initiatePaymentVerification = async(req, res) => {
    try {
        const pmtHistory = await PaymentHistory.create({
            invoiceId: req.body.invoiceId,
            amtPaid: req.body.amtPaid,
            proofFiles: "",
            status: "PENDING",
            pendingWith: "L1",
            approvedByCreditor: "false"
        });

        return res.status(200).send({ message: "Payment verification started with payment history creation", success: true, response: this.pmtHistory });
    } catch (err) {
        console.log(err)
        res
            .status(500)
            .send({ message: "Something went wrong", reponse: "", success: false });
    }
};
