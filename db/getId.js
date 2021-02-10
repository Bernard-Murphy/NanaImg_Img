// Returns a random 8 character ID with letters, numbers, and some symbols.

function getId() {
    var id = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_-,.~';
    var charLength = chars.length;
    for ( var i = 0; i < 8; i++ ) {
       id += chars.charAt(Math.floor(Math.random() * charLength));
    }
    return id;
 }

 module.exports = getId;