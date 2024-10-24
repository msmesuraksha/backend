module.exports = Object.freeze({
    MY_CONSTANT: 'some value',
    ANOTHER_CONSTANT: 'another value',
    FREE_PLAN_SUBSCRIPTION_PKG_ID: '65c274d7844c7f01a3a5f7af',
    API_NAME_URL_MAPPING: {
        "/api/debtors/search": "companySearch",
        "/api/transactions/create": "invoicingLedger",
        // "/api/companies/search": "recordPayment"
    },
    API_NAME_URL_MAPPING_FOR_SUBSCRIPTION: {
        "/api/debtors/search": "Defaulter Search",
        "/api/transactions/create": "Invoicing",
        // "/api/transactions/create": "Calls"
        // "/api/companies/search": "recordPayment"
    },
    INVOICE_STATUS: {
        PAID: 'PAID',
        PARTIALLY_PAID: 'PARTIALLY_PAID',
        DEFAULTED: 'DEFAULTED',
        PENDING: "PENDING",
        DRAFT: "DRAFT"
    },
    UPLOAD_FILE_TYPE: {
        GENERAL: 'GENERAL',
        INVOICE: 'INVOICE'
    },
    PAYMENT_HISTORY_STATUS: {
        APPROVED: "APPROVED",
        REJECTED: "REJECTED",
        PENDING: "PENDING",
        RE_OPENED: "RE_OPENED",
        DOCUMENTS_NEEDED: "DOCUMENTS_NEEDED",
        COMPLAINT_APPROVED: "COMPLAINT_APPROVED",
        AWAITING_REVIEW: "AWAITING_REVIEW",
        COMPLAINT_DELETED: 'COMPLAINT_DELETED',
        DOCUMENTS_NOT_UPLOADED: 'DOCUMENTS_NOT_UPLOADED',
        DRAFT: 'DRAFT'
    },
    MAIL_TEMPLATES: {
        SUPPORTING_DOCUMENTS_NEEDED_DEBTOR: "SUPPORTING_DOCUMENTS_NEEDED_DEBTOR",
        SUPPORTING_DOCUMENTS_NEEDED_DEBTOR_WITHOUT_LINK: "SUPPORTING_DOCUMENTS_NEEDED_DEBTOR_WITHOUT_LINK",
        SUPPORTING_DOCUMENTS_NEEDED_CREDITOR: "SUPPORTING_DOCUMENTS_NEEDED_CREDITOR",
        SUPPORTING_DOCUMENTS_UPLOADED_DEBTOR: "SUPPORTING_DOCUMENTS_UPLOADED_DEBTOR",
        SUPPORTING_DOCUMENTS_UPLOADED_CREDITOR: "SUPPORTING_DOCUMENTS_UPLOADED_CREDITOR"
    },
    DOCUMENT_TYPES: {
        PURCHASE_ORDER_DOCUMENT: ""
    }

});
