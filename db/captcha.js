const request = require('request');

let captcha = {};

captcha.verify = (address) => {

    /* This is the function that the main image upload form waits on while the user's reCaptcha challenge is verified. 
    It makes a request to Google's server using the address provided, then if it returns a successful response, it will return success and vice-versa. */
    return new Promise((resolve, reject) => {
        request(address, async (err, res, body) => {
            if (err){
                return reject("failure")
            }
            let score = await JSON.parse(body);
            if (score.success === "true"){
                return resolve("success")
            } else {
                return reject("Captcha failed. Please try again.")
            }
        })
    })
}

module.exports = captcha;