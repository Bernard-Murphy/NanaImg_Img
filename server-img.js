const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const db = require('./db');
const util = require('util');
const getDate = require('./db/getDate');
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageSize = require('image-size');
const sharp = require('sharp');
const http = require('http');
const https = require('https');
const captcha = require('./db/captcha');
const uuid = require('uuid');
const server = express();

/* Initialize dotenv, bodyparser, allow cors, set public directory (where all the images live), use the fileUpload middleware which adds a req.files to requests with images attached to them. */
dotenv.config();
server.use(bodyParser.json());
server.use(cors());
server.use(express.static(path.join(__dirname, '/public')));
server.use(fileUpload());


server.use(function(req, res, next) {
    // This fixes some weird cors errors that some users were getting.
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

server.post('/upload', async (req, res) => {
    try{

        /* This is the endpoint that most users hit when they are uploading images. Users who are not verified, 
        moderators, or administrators must solve a captcha in order to upload images to the site. captchaVerifyUrl 
        creates the url using nanaimg.net's captcha key and the user's individual captcha challenge key and creates the 
        url that I need to send to Google to verify that the user solved a valid Captcha challenge. */

        const captchaKey = process.env.CAPTCHA_KEY;
        const captchaVerifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${captchaKey}&response=${req.body.captcha}&remoteip=${req.connection.remoteAddress}`;
        const captchaCheck = await captcha.verify(captchaVerifyUrl);
        if (captchaCheck !== "success") throw "Captcha failed. Please try again.";

        /* Various checks to make sure that the image, name, and manifesto are valid, and sees whether the user has 
        disabled the comments or marked their image NSFW */

        if (req.body.name.length > 30) throw "Max name length exceeded";
        if (req.body.manifesto.length > 10000) throw "Max manifesto length exceeded";
        if (req.files === null || req.files.length === 0 || req.files.image === undefined) throw "No file selected";
        const username = req.body.name;
        let manifesto = (req.body.manifesto.length > 0) ? req.body.manifesto : null;
        const commentsDisabled = (req.body.disableComments === 'true') ? 1 : 0;
        const nsfw = (req.body.nsfw === 'true') ? 1 : 0;
        const moment = getDate();
        
        const file = req.files.image;
        const fileName = file.name;
        const extension = path.extname(fileName);

        /* Checking to make sure that the image doesn't already exist in the database. It does this by taking the md5 hash of the image and seeing whether there are any results when a search is done using the md5. If the image already exists on nanaimg, the user is redirected there instead of saving the same image twice into the system. */

        const md5 = file.md5;
        const md5Sql = `SELECT image_id FROM images WHERE md5 = '${md5}'`;
        const md5Check = await db.getImg(md5Sql);
        if (md5Check.length === 0){

            /* Removes characters from the user's name or manifesto, such as backslashes or quotation marks, that might create problems when inserting into the database. I will probably clean this up later. */
            const URL = '/public/img/' + md5 + extension;
            const sqlName = md5 + extension;
            const postId = req.body.postId;
            const postColor = req.body.postColor;
            const badge = req.body.badge;
            if (username.split("\\").length > 1){
                username = username.split("\\").join('');
            }
            if (username.split("'").length > 1){
                let splitText = username.split("'")
                for (let i = 1; i < splitText.length; i++){
                    splitText[i] = "\\'" + splitText[i];
                }
                username = splitText.join('');
            }
            if (manifesto !== null){
                if (manifesto.split("\\").length > 1){
                    manifesto = manifesto.split("\\").join('');
                }
                if (manifesto.split("'").length > 1){
                    let splitText = manifesto.split("'")
                    for (let i = 1; i < splitText.length; i++){
                        splitText[i] = "\\'" + splitText[i];
                    }
                    manifesto = splitText.join('');
                }
            }

            // Saves the image to local storage.
            await util.promisify(file.mv)(path.join(__dirname) + URL);

            /* In this part, a thumbnail is created. We want a thumbnail with a max width and max height of 150 pixels, but we also want the image to keep the same proportions. This is done by taking the dimension that is larger, setting it to 150 pixels, then scaling the other dimension proportionally. If the image is already lower than 150 x 150 pixels, it is saved for a second time into the thumbnails folder. */

            const dimensions = imageSize(`public/img/${md5}${extension}`);
            let width = dimensions.width;
            let height = dimensions.height;
            if (width > height){
                if (width > 150){
                    let newHeight = Math.round((150 * height)/width);
                    await sharp(`public/img/${md5}${extension}`).resize(150, newHeight).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                } else {
                    await sharp(`public/img/${md5}${extension}`).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                }
            } else {
                if (height > 150){
                    let newWidth = Math.round((150 * height)/width);
                    await sharp(`public/img/${md5}${extension}`).resize(newWidth, 150).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                } else {
                    await sharp(`public/img/${md5}${extension}`).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                }                
            }
            await imagemin([`public/thumbnails/${md5}.jpeg`], {
                destination: 'public/thumbnails',
                plugins: [
                    imageminJpegtran()
                ]
            });

            /* Inserting the image data into the database */
            const sql = `INSERT INTO images VALUES (default, '${username}', '${manifesto}', '${sqlName}', '${md5}', '${moment.date}', '${moment.day}', '${moment.month}', '${moment.year}', '${commentsDisabled}', '${nsfw}', '0', '0', 'null', '0', 'null', '${postId}', '${postColor}', '${badge}', '0', '${md5}.jpeg', '0', '${req.connection.remoteAddress}');`;
            const upload = await db.upload(sql);

            // Sends the image insertId so that the user knows where to be redirected.
            res.send({
                image_id: upload.insertId
            })
        } else {
            res.send({
                image_id: md5Check[0].image_id
            })
        }
    } catch (err) {
        console.log(err);
        res.send({
            error: err
        })
    }
})

server.post('/uploadauth', async (req, res) => {
    try{

        /* This is the same as the other upload function save for the fact that the user does not need to solve a Captcha challenge in order to upload their image. Instead, they prove that they are authorized to be doing this by pinging the main server, and if their session on the main server is valid, the main server grabs a uuid from the database that both the main server and this image server are connected to, and the user sends a second request to this server with this uuid. 
        
        This function checks the uuid that the user sends, and if it is valid, it proceeds with the image upload process in the same way as the previous endpoint. */

        const checkId = await db.getImg(`select type, user_id from users where uuid = '${req.body.uid}'`);
        if (checkId.length > 0){
            let id = checkId[0].user_id;
            if (id == req.body.userId){
                if (checkId[0].type === "Chadmin" || checkId[0].type === "Janny" || checkId[0].type === "Verified"){
                    if (req.body.name.length > 30) throw "max name length exceeded";
                    if (req.body.manifesto.length > 10000) throw "max manifesto length exceeded";
                    if (req.files === null || req.files.length === 0 || req.files.image === undefined) throw "No file selected";
                    const username = req.body.name;
                    let manifesto = (req.body.manifesto.length > 0) ? req.body.manifesto : null;
                    const commentsDisabled = (req.body.disableComments === 'true') ? 1 : 0;
                    const nsfw = (req.body.nsfw === 'true') ? 1 : 0;
                    const moment = getDate();
                    const file = req.files.image;
                    const fileName = file.name;
                    const extension = path.extname(fileName);
    
                    const md5 = file.md5;
                    const md5Sql = `select image_id from images where md5 = '${md5}'`;
                    const md5Check = await db.getImg(md5Sql);
                    if (md5Check.length === 0){
                        const URL = '/public/img/' + md5 + extension;
                        const sqlName = md5 + extension;
                        const postId = req.body.postId;
                        const postColor = req.body.postColor;
                        const badge = req.body.badge;
                        if (username.split("\\").length > 1){
                            username = username.split("\\").join('');
                        }
                        if (username.split("'").length > 1){
                            let splitText = username.split("'")
                            for (let i = 1; i < splitText.length; i++){
                                splitText[i] = "\\'" + splitText[i];
                            }
                            username = splitText.join('');
                        }
                        if (manifesto !== null){
                            if (manifesto.split("\\").length > 1){
                                manifesto = manifesto.split("\\").join('');
                            }
                            if (manifesto.split("'").length > 1){
                                let splitText = manifesto.split("'")
                                for (let i = 1; i < splitText.length; i++){
                                    splitText[i] = "\\'" + splitText[i];
                                }
                                manifesto = splitText.join('');
                            }
                        }
                        await util.promisify(file.mv)(path.join(__dirname) + URL);
                        const dimensions = imageSize(`public/img/${md5}${extension}`);
                        let width = dimensions.width;
                        let height = dimensions.height;
                        if (width > height){
                            if (width > 150){
                                let newHeight = Math.round((150 * height)/width);
                                await sharp(`public/img/${md5}${extension}`).resize(150, newHeight).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                            } else {
                                await sharp(`public/img/${md5}${extension}`).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                            }
                        } else {
                            if (height > 150){
                                let newWidth = Math.round((150 * height)/width);
                                await sharp(`public/img/${md5}${extension}`).resize(newWidth, 150).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                            } else {
                                await sharp(`public/img/${md5}${extension}`).jpeg().toFile(`public/thumbnails/${md5}.jpeg`);
                            }                
                        }
                        await imagemin([`public/thumbnails/${md5}.jpeg`], {
                            destination: 'public/thumbnails',
                            plugins: [
                                imageminJpegtran()
                            ]
                        });
                        const sql = `insert into images values (default, '${username}', '${manifesto}', '${sqlName}', '${md5}', '${moment.date}', '${moment.day}', '${moment.month}', '${moment.year}', '${commentsDisabled}', '${nsfw}', '0', '0', 'null', '0', 'null', '${postId}', '${postColor}', '${badge}', '0', '${md5}.jpeg', '0', '${req.connection.remoteAddress}');`;
                        const upload = await db.upload(sql);
                        const newId = uuid.v4();
                        await db.getImg(`update users set uuid = '${newId}' where user_id = '${id}'`);
                        res.send({
                            image_id: upload.insertId
                        })
                    } else {
                        res.send({
                            image_id: md5Check[0].image_id
                        })
                    }
                } else throw "Unauthorized"
            } else throw "Unauthorized"
        } else throw "Unauthorized"
    } catch (err) {
        console.log(err);
        res.send({
            error: err
        })
    }
})

server.post('/login', async (req, res) => {
    res.sendStatus(200);
})

const httpServer = http.createServer(server);
const httpsServer = https.createServer(server);

httpServer.listen(3000, () => {
    console.log(`feeding nana on port 3000`);
})

httpsServer.listen(4000, () => {
    console.log('feeding nana securely on port 4000');
})