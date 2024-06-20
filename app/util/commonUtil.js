const nodemailer = require('nodemailer');

exports.generateRandomPassword = (mailObj) => {
    let pass = '';
    let str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
        'abcdefghijklmnopqrstuvwxyz0123456789@#$';
 
    for (let i = 1; i <= 8; i++) {
        let char = Math.floor(Math.random()
            * str.length + 1);
 
        pass += str.charAt(char)
    }
 
    return pass;
}

exports.calculateAverageRating= (ratings) => {
    if (Array.isArray(ratings)) {
        // Filter ratings that have a 'rating' field
        const validRatings = ratings.filter(r => typeof r.rating === 'number');

        // Calculate the average rating
        const averageRating = validRatings.reduce((acc, r) => acc + r.rating, 0) / validRatings.length;

        return averageRating;
    }
}

exports.getDateInGeneralFormat = (date) => {
    let day,month,year
    try{
         day = date.getDate().toString().padStart(2, '0');
         month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() returns 0-11
         year = date.getFullYear();
    } catch (error) {
        // console.log(error)
        return date
    }
    return `${day}-${month}-${year}`;
}

exports.getDateInYYYYMMDDFormat = (date) => {
    let day,month,year
    try{
         day = date.getDate().toString().padStart(2, '0');
         month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() returns 0-11
         year = date.getFullYear();
    } catch (error) {
        // console.log(error)
        return date
    }
    return `${year}-${month}-${day}`;
}


exports.convertGeneralFormatDateStrToDate = (date) => {
    try{
        const parts = dateString.split("-");

        // Extract day, month, and year from the parts array
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Months are 0-based (January is 0)
        const year = parseInt(parts[2], 10);
    
        // Create a new Date object with the extracted values
        date = new Date(year, month, day);
    
    } catch (error) {
        // console.log(error)
        return date
    }
    return date
}


exports.findOldestDueDate = (invoices) => {
    return invoices
    .map(invoice => new Date(invoice.dueDate))
    .reduce((minDate, currentDate) => (currentDate < minDate ? currentDate : minDate))
}