//array of alphabet
var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
//execute get request for url with a param from the array
//import fs
const fs = require('fs');
var request = require('request');
alphabet.forEach(function (letter) {
    //get request
    var url = "https://edtmobiliteng.wigorservices.net/WebPsDyn.aspx?action=posEDTBEECOME&Tel=clement.lafon&date=10/03/2022&serverid=" + letter;
    req = request(url, function (error, response, body){
        if (error || !body.includes("THeure")) {
            console.error('Une erreur s\'est produite lors de l\'accès à l\'url '+url+"\nErreur: "+error);
        }else{
            fs.writeprocess.env.ROOT_PATH+"servers/"+letter + ".html", body, function (err) {   
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
        }
    });
});