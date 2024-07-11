
exports.sendWhatsappMessage = async (number, message) => {

    const accountSid = process.env.WHATSAPP_SID;
    const authToken = process.env.WHATSAPP_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    return new Promise((resolve, reject) => {
        client.messages
            .create({
                body: `${message}`,
                from: 'whatsapp:+14155238886',
                to: `whatsapp:+91${number}`
            })
            .then(message => {
                console.log(message.sid)
                resolve(message.sid)
            })
        /* .done(); */

    })


}

