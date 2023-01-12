const cheerio = require('cheerio');
var { exec } = require('node:child_process');
var request = require('request');
var fs = require('fs');

//make a get request
$base_url = "https://edtmobiliteng.wigorservices.net/WebPsDyn.aspx?action=posEDTBEECOME&serverid=i";
$user = "username";
$date = "10/03/2022";

//if date is not monday, find it
function getMonday(d) {
    var d = new Date(d);
    var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    monday=new Date(d.setDate(diff));
    var curr_date = monday.getDate();
    var curr_month = monday.getMonth()+1;
    var curr_year = monday.getFullYear();
    return curr_month + "/" + curr_date + "/" + curr_year;
}
$date = getMonday($date);
$url = $base_url+"&Tel="+$user+"&Date="+$date;
request($url, function (error, response, body){
    if (error || !body.includes("THeure")) {
        console.error('Une erreur s\'est produite !');
        console.error(response);
    }else{
        callback(body);
    }
});

function callback(response){
    // save to file
    fs.writeFile('cours.html', response, function (err) {
        if (err) throw err;
        console.log('HTML saved!');
    });
    const $ = cheerio.load(response);
    var $cours_raw = $(".Case:not([id])");
    var $cours = $cours_raw.toArray();
    var $cleaned_cours = [];
    $i = 0;
    for($i=0;$i<$cours.length;$i++){
        cours = [];
        cours.matiere = $($cours[$i].children[0].children[1].children[0].children[0].children[0].children[0]).text();
        cours.prof = $($cours[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[0];
        cours.annee = $($cours[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[1];
        cours.horaires = $($cours[$i].children[0].children[1].children[0].children[0].children[2].children[0]).text();
        cours.heure_debut = cours.horaires.split(" - ")[0];
        cours.heure_fin = cours.horaires.split(" - ")[1];
        cours.dt_heure_debut = cours.heure_debut.replace(':',"");
        cours.dt_heure_fin = cours.heure_fin.replace(':',"");
        cours.salle = $($cours[$i].children[0].children[1].children[0].children[0].children[2].children[1]).text().replace("Salle:","");
        cours.position = parseInt($cours[$i].attribs.style.split("left:")[1].split("%")[0]);
        switch(cours.position){
            case 103:
                cours.jour = 0;
                break;
            case 122:
                cours.jour = 1;
                break;
            case 141:
                cours.jour = 2;
                break;
            case 161:
                cours.jour = 3;
                break;
            case 180:
                cours.jour = 4;
                break;
            default:
                console.log("Erreur de position");
                break;
        }
        cours.date = new Date($date);
        cours.date.setDate(cours.date.getDate() + cours.jour);
        cours.date = cours.date.toLocaleDateString("fr-FR");
        //add 0 if day or month is < 10
        if(cours.date.split("/")[0].length == 1){
            cours.date = "0" + cours.date;
        }
        if(cours.date.split("/")[1].length == 1){
            cours.date = cours.date.split("/")[0] + "/0" + cours.date.split("/")[1] + "/" + cours.date.split("/")[2];
        }
        cours.date_and_time_start = cours.date + " " + cours.heure_debut;
        cours.date_and_time_end = cours.date + " " + cours.heure_fin;
        cours.dtstart = cours.date.split("/")[2] + cours.date.split("/")[1] + cours.date.split("/")[0] + "T" + cours.dt_heure_debut + "00Z";
        cours.dtend = cours.date.split("/")[2] + cours.date.split("/")[1] + cours.date.split("/")[0] + "T" + cours.dt_heure_fin + "00Z";
        $cleaned_cours.push(cours);
    };
    //sort by date_and_time_start alphabetically
    $cleaned_cours.sort(function(a, b){
        var keyA = new Date(a.date_and_time_start),
            keyB = new Date(b.date_and_time_start);
        // Compare the 2 dates
        if(keyA < keyB) return -1;
        if(keyA > keyB) return 1;
        return 0;
    });
    //if two cours are one after the other fusion them
    // $i = 0;
    // for($i=0;$i<$cleaned_cours.length;$i++){
    //     //if cours is not the last one
    //     if($i+1<$cleaned_cours.length){
    //         if($cleaned_cours[$i].heure_fin == $cleaned_cours[$i+1].heure_debut && $cleaned_cours[$i].salle == $cleaned_cours[$i+1].salle && $cleaned_cours[$i].prof == $cleaned_cours[$i+1].prof){
    //             $cleaned_cours[$i].heure_fin = $cleaned_cours[$i+1].heure_fin;
    //             $cleaned_cours[$i].date_and_time_end = $cleaned_cours[$i+1].date_and_time_end;
    //             $cleaned_cours[$i].horaires = $cleaned_cours[$i].heure_debut + " - " + $cleaned_cours[$i].heure_fin;
    //             $cleaned_cours.splice($i+1, 1);
    //         }
    //     }
    // }
    console.log($cleaned_cours);
    //generate ics file from $cleaned_cours
    timezone = "BEGIN:VTIMEZONE\n";
    timezone += "TZID:Europe/Paris\n";
    timezone += "X-LIC-LOCATION:Europe/Paris\n";
    timezone += "X-WR-CALNAME://Julien Flusin//Cours//\n";
    timezone += "X-WR-TIMEZONE:Europe/Paris\n";
    timezone += "BEGIN:DAYLIGHT\n";
    timezone += "TZOFFSETFROM:+0100\n";
    timezone += "TZOFFSETTO:+0200\n";
    timezone += "TZNAME:CEST\n";
    timezone += "DTSTART:19700329T020000\n";
    timezone += "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU\n";
    timezone += "END:DAYLIGHT\n";
    timezone += "BEGIN:STANDARD\n";
    timezone += "TZOFFSETFROM:+0200\n";
    timezone += "TZOFFSETTO:+0100\n";
    timezone += "TZNAME:CET\n";
    timezone += "DTSTART:19701025T030000\n";
    timezone += "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU\n";
    timezone += "END:STANDARD\n";
    timezone += "END:VTIMEZONE\n";
    ics = "BEGIN:VCALENDAR\n" + timezone +
    "VERSION:2.0" + "\n" +
    "PRODID:-//Julien Flusin//Cours//FR" + "\n";
    $i = 0;
    for($i=0;$i<$cleaned_cours.length;$i++){
        //generate random uid
        uid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        tzid = "TZID=Europe/Paris:";
        dtstamp = new Date().toISOString().replace(/-|:|\.\d+/g, "");
        ics += "BEGIN:VEVENT" + "\n" +
        "UID:" + uid + "\n" +
        "DTSTAMP;" + tzid + dtstamp + "\n" +
        "DTSTART;" + tzid + $cleaned_cours[$i].dtstart + "\n" +
        "DTEND;" + tzid + $cleaned_cours[$i].dtend + "\n" +
        "SUMMARY:" + $cleaned_cours[$i].matiere + "\n" +
        "DESCRIPTION:" + $cleaned_cours[$i].prof + "\n" +
        "LOCATION:" + $cleaned_cours[$i].salle + "\n" +
        "END:VEVENT" + "\n";
    }
    ics += "END:VCALENDAR";
    fs.writeFile(process.env.ROOT_PATH+"cours.ics", ics, function (err) {
        if (err) throw err;
        console.log('ICS saved!');
    });
}