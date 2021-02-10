const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config();

const nana = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE
})

nana.connect((err) => {
    if(err) throw err
    console.log('Connected to the nanabase')
})

let db = {};

db.img = (img) => {
    return new Promise((resolve, reject) => {
        nana.query(`select * from images where image_id = '${img}';`, (err, result) => {
            if (err){
                return reject(err);
            }
            return resolve(result);
        });
    });
};

db.upload = (sql) => {
    return new Promise((resolve, reject) => {
        nana.query(sql, (err, result) => {
            if (err){
                return reject(err);
            }
            return resolve(result);
        });
    });
};

db.postComment = (sql) => {
    return new Promise((resolve, reject) => {
        nana.query(sql, (err, result) => {
            if (err){
                return reject(err);
            }
            return resolve(result);
        });
    });
};

db.fetchComments = (sql) => {
    return new Promise((resolve, reject) => {
        nana.query(sql, (err, result) => {
            if (err){
                return reject(err);
            }
            return resolve(result);
        });
    });
};

db.getImg = (sql) => {
    return new Promise((resolve, reject) => {
        nana.query(sql, (err, result) => {
            if (err){
                return reject(err);
            }
            return resolve(result);
        });
    });
};

module.exports = db;