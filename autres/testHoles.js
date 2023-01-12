require('dotenv').config();
const fs = require('fs');
const cal = require('./calendarLib.js');
//create a function which returns all the moments where there is no class by looking at the horaires and jour property of each cours
//with input "08:00 - 12:00", create an array like this ["08:00", "09:00", "10:00", "11:00"] with a function
function getCoursHours(cours_of_the_week) {
    var holes = [];
    for (var i = 0; i < cours_of_the_week.length; i++) {
        var cours = cours_of_the_week[i];
        var horaires = cours.horaires.split(" - ");
        var start = horaires[0];
        var end = horaires[1];
        var start_hour = parseInt(start.split(":")[0]);
        var start_minute = parseInt(start.split(":")[1]);
        var end_hour = parseInt(end.split(":")[0]);
        var end_minute = parseInt(end.split(":")[1]);
        var start_time = start_hour * 60 + start_minute;
        var end_time = end_hour * 60 + end_minute;
        var time = start_time;
        while (time < end_time) {
            var hour = Math.floor(time / 60);
            var minute = time % 60;
            var hole = "J"+cours.jour + " H" + hour + ":" + minute;
            holes.push(hole);
            time += 60;
        }
    }
    return holes;
}
//with the array of cours hour and jours, find when there is no cours
function getHoles(cours_of_the_week) {
    var holes = [];
    var cours_hours = getCoursHours(cours_of_the_week);
    //create an array of all the possible hours and jours
    var all_hours = [];
    for (var i = 0; i < 5; i++) {
        for (var j = 8; j < 20; j++) {
            for (var k = 0; k < 60; k += 60) {
                var hour = "J" + i + " H" + j + ":" + k;
                all_hours.push(hour);
            }
        }
    }
    for (var i = 0; i < all_hours.length; i++) {
        var hour = all_hours[i];
        if (cours_hours.indexOf(hour) == -1) {
            holes.push(hour);
        }
    }
    //replace ":0" by ":00" to all the holes
    for (var i = 0; i < holes.length; i++) {
        var hole = holes[i];
        if (hole.indexOf(":0") != -1) {
            hole = hole.replace(":0", ":00");
            holes[i] = hole;
        }
        if(hole.indexOf("H") != -1){
            hole = hole.replace("H", "");
            holes[i] = hole;
        }
        if(hole.indexOf("J") != -1){
            hole = hole.replace("J", "");
            holes[i] = hole;
        }
    }
    return holes;
}
function createFakeCours(cours_of_the_week){
    var cours = getHoles(cours_of_the_week);
    var fake_cours = [];
    for(var i = 0; i < cours.length; i++){
        //if not the last item
        if(i != cours.length - 1){
            var cours_jour = cours[i].split(" ")[0]
            var cours_horaires = cours[i].split(" ")[1]+ " - " + (parseInt(cours[i].split(" ")[1].split(":")[0])+1) + ":" + cours[i].split(" ")[1].split(":")[1];
            var cours_fake = {
                "jour": cours_jour,
                "horaires": cours_horaires,
                "empty": true
            }
            fake_cours.push(cours_fake);
        }
    }
    //fuse all the cours if they are next to each other
    for(var i = 0; i < fake_cours.length; i++){
        if(i != fake_cours.length - 1){
            var cours_jour = fake_cours[i].jour;
            var cours_horaires = fake_cours[i].horaires;
            var cours_jour_next = fake_cours[i+1].jour;
            var cours_horaires_next = fake_cours[i+1].horaires;
            if(cours_jour == cours_jour_next){
                if(cours_horaires.split(" - ")[1] == cours_horaires_next.split(" - ")[0]){
                    var cours_fake = {
                        "jour": cours_jour,
                        "horaires": cours_horaires.split(" - ")[0] + " - " + cours_horaires_next.split(" - ")[1],
                        "empty": true
                    }
                    fake_cours[i] = cours_fake;
                    fake_cours.splice(i+1, 1);
                }
            }
        }
    }
    for(var i = 0; i < fake_cours.length; i++){
        if(i != fake_cours.length - 1){
            var cours_jour = fake_cours[i].jour;
            var cours_horaires = fake_cours[i].horaires;
            var cours_jour_next = fake_cours[i+1].jour;
            var cours_horaires_next = fake_cours[i+1].horaires;
            if(cours_jour == cours_jour_next){
                if(cours_horaires.split(" - ")[1] == cours_horaires_next.split(" - ")[0]){
                    var cours_fake = {
                        "jour": cours_jour,
                        "horaires": cours_horaires.split(" - ")[0] + " - " + cours_horaires_next.split(" - ")[1],
                        "empty": true
                    }
                    fake_cours[i] = cours_fake;
                    fake_cours.splice(i+1, 1);
                }
            }
        }
    }
    for(var i = 0; i < fake_cours.length; i++){
        if(i != fake_cours.length - 1){
            var cours_jour = fake_cours[i].jour;
            var cours_horaires = fake_cours[i].horaires;
            var cours_jour_next = fake_cours[i+1].jour;
            var cours_horaires_next = fake_cours[i+1].horaires;
            if(cours_jour == cours_jour_next){
                if(cours_horaires.split(" - ")[1] == cours_horaires_next.split(" - ")[0]){
                    var cours_fake = {
                        "jour": cours_jour,
                        "horaires": cours_horaires.split(" - ")[0] + " - " + cours_horaires_next.split(" - ")[1],
                        "empty": true
                    }
                    fake_cours[i] = cours_fake;
                    fake_cours.splice(i+1, 1);
                }
            }
        }
    }
    //foreach fakecours, add 0 to the hour if it's less than 10
    for(var i = 0; i < fake_cours.length; i++){
        var cours_horaires = fake_cours[i].horaires;
        var cours_horaires_split = cours_horaires.split(" - ");
        var cours_horaires_split_0 = cours_horaires_split[0].split(":");
        var cours_horaires_split_1 = cours_horaires_split[1].split(":");
        if(cours_horaires_split_0[0].length == 1){
            cours_horaires_split_0[0] = "0" + cours_horaires_split_0[0];
        }
        if(cours_horaires_split_1[0].length == 1){
            cours_horaires_split_1[0] = "0" + cours_horaires_split_1[0];
        }
        cours_horaires = cours_horaires_split_0[0] + ":" + cours_horaires_split_0[1] + " - " + cours_horaires_split_1[0] + ":" + cours_horaires_split_1[1];
        fake_cours[i].horaires = cours_horaires;
    }
    return fake_cours;
}
async function main() {
    var serverids = process.env.WIGOR_SERVER_IDS.split("");
    base_url = "https://edtmobiliteng.wigorservices.net/WebPsDyn.aspx?action=posEDTBEECOME";
    user = "username";
    //choose random server
    serverid = serverids[Math.floor(Math.random() * serverids.length)];
    date = "10/17/2022";
    await cal.getCalendarForWeek(base_url, serverid, user, date)
        .then((cours_of_the_week) => {
            console.log(createFakeCours(cours_of_the_week));
        });
}
main();