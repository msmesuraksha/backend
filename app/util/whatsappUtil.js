
exports.sendWhatsappMessage = async () => {

    const accountSid = process.env.WHATSAPP_SID;
    const authToken = process.env.WHATSAPP_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    return new Promise((resolve, reject) => {
        client.messages
            .create({
                body: 'Your appointment is coming up on July 21 at 3PM',
                from: 'whatsapp:+14155238886',
                to: 'whatsapp:+919820924375'
            })
            .then(message => {
                console.log(message.sid)
                resolve(message.sid)
            })
        /* .done(); */

    })


}

