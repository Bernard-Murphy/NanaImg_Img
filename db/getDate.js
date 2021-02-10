// Obtains the current date in the format that nanaimg.net uses, i.e. dd-mm-yyyy @ hh:mm:ss UTC

function getDate(){
    let time = new Date();
    let day = time.getUTCDate();
    while (String(day).length < 2){
        day = "0" + day;
    }
    let month = time.getUTCMonth() + 1;
    while (String(month).length < 2){
        month = "0" + month;
    }
    let year = time.getUTCFullYear();
    let hour = time.getUTCHours();
    while(String(hour).length < 2){
        hour = "0" + hour;
    }
    let minute = time.getUTCMinutes();
    while(String(minute).length < 2){
        minute = "0" + minute;
    }
    let second = time.getUTCSeconds();
    while(String(second).length < 2){
        second = "0" + second;
    }

    return {
        date: day + '-' + month + '-' + year + " @ " + hour + ":" + minute + ":" + second + " UTC",
        day: day,
        month: month,
        year: year
    }
}

module.exports = getDate;