var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
const fs = require('fs');
var request = require('request');
var servers = [];
require('dotenv').config();
alphabet.forEach(function (letter) {
    var url = "https://edtmobiliteng.wigorservices.net/WebPsDyn.aspx?action=posEDTBEECOME&Tel=julien.flusin&date=02/06/2023&serverid=" + letter;
    req = request(url, function (error, response, body){
        if (error || !body.includes("THeure")) {
            console.error('Une erreur s\'est produite lors de l\'accès à l\'url '+url+"\nErreur: "+error);
        }else{
            fs.writeFileSync(process.env.ROOT_PATH+"servers/"+letter + ".html", body, function (err) {   
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
            servers.push(letter);
        }
    });
});
fs.writeFileSync(process.env.ROOT_PATH+"servers/servers.txt", servers.join(""), function (err) {   
    if (err) {
        return console.log(err);
    }
    console.log("The file was saved!");
});