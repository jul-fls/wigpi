require('dotenv').config();
var fs = require('fs');
var path = require('path');
var $classes = JSON.parse(fs.readFileSync(process.env.ROOT_PATH+"api/classes.json", 'utf8'));
var htmlLib = require('../htmlLib.js');
const cal = require('../calendarLib.js');
var discordLib = require('./discordLib.js');
$classes = JSON.parse(fs.readFileSync(process.env.ROOT_PATH+"api/classes.json", 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main(class_name){
    $date = new Date();
    $date.setDate($date.getDate() - $date.getDay() + 1);
    $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear();
    $date_str_2 = ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + ('0' + $date.getDate()).slice(-2) + "/" + $date.getFullYear();
    var serverids = process.env.WIGOR_SERVER_IDS.split("");
    base_url = process.env.WIGOR_BASE_URL;
    serverid = serverids[Math.floor(Math.random() * serverids.length)];
    await cal.getCalendarForWeek(base_url, serverid, class_name.username, $date_str_2)
        .then(async(cours_of_the_week) => {
            //if there is courses
            if (cours_of_the_week != undefined) {
                await htmlLib.GenerateHTML(class_name.name, $date_str_2, cours_of_the_week)
                    .then(async (result) => {
                        console.log("HTML generated for " + class_name.name);
                        await discordLib.post_edt(class_name.webhookid, class_name.webhooktoken, class_name.roleid, $date_str, class_name.name);
                    });
            }else{
                console.log("No course for this week for class_name " + class_name.name);
            }
            await sleep(1000);
        });
}
async function main2(){
    for(var i = 0; i < $classes.length; i++) {
        $date = new Date();
        $date_str = ('0' + $date.getDate()).slice(-2) + "/" + ('0' + ($date.getMonth() + 1)).slice(-2) + "/" + $date.getFullYear() + " " + ('0' + $date.getHours()).slice(-2) + ":" + ('0' + $date.getMinutes()).slice(-2) + ":" + ('0' + $date.getSeconds()).slice(-2);
        console.log("[LOG POST EDT]["+$date_str+"] Début de la classe " + $classes[i].name);
        await main($classes[i]);
        console.log("[LOG POST EDT]["+$date_str+"] Fin de la classe " + $classes[i].name);
    }
}
main2();