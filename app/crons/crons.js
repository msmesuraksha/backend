const cron = require('node-cron');
const service = require("../service/admin/");
const paymentHistoryService = service.paymentHistoryService


cron.schedule('2 0 * * *', function () {

  function getPreviousDay(date = new Date()) {
    const previous = new Date(date.getTime());
    previous.setDate(date.getDate() - 1);

    return previous;
  }
  let COB = (getPreviousDay(new Date())).toISOString();

  const sub = Subscription.updateMany({ endDate: COB, isActive: true }, { isActive: false });

  console.log("This is cron running!");
})

//cron.schedule('0 0 * * *', paymentHistoryService.moveDocumentsWithPendingDocBackToAdminQueue);

cron.schedule('*/10 * * * *', paymentHistoryService.complainMovetoAdminTable);




// cron.schedule('* * * * *', paymentHistoryService.assignPendingPaymentHistories);
