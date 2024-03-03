require('dotenv').config();
var fs = require('fs');
var path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
var urlLib = require('./urlLib.js');
async function parseHTMLForWeek(response, date) {
    const $ = cheerio.load(response);
    if ($('body').text().includes(process.env.WIGOR_NO_COURSE_TEXT)) {
        console.log("Pas de cours la semaine du " + date + " !");
    } else {
        //remove all the img tags that have the class "IMG_Warning"
        $("img.IMG_Warning").remove();
        $cours_week_raw = $(".Case:not([id])");
        $cours_week = $cours_week_raw.toArray();
        $cleaned_cours_week = [];
        for ($i = 0; $i < $cours_week.length; $i++) {
            cours = [];
            cours.matiere = $($cours_week[$i].children[0].children[1].children[0].children[0].children[0].children[0]).text().replace(/(\r\n|\n|\r)/gm, " ");
            cours.prof = $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[0].replace(/(\r\n|\n|\r)/gm, " ").replace(/\w\S*/g, function(txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
            cours.annee = $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
            cours.horaires = $($cours_week[$i].children[0].children[1].children[0].children[0].children[2].children[0]).text();
            cours.heure_debut = cours.horaires.split(" - ")[0];
            cours.heure_fin = cours.horaires.split(" - ")[1];
            cours.salle = $($cours_week[$i].children[0].children[1].children[0].children[0].children[2].children[1]).text().replace("Salle:", "");
            if (cours.salle.startsWith("M: ")) {
                cours.salle = cours.salle.replace("M: ", "");
            }
            // if ($($cours_week[$i].children[0].children[1].children[0].children[0].children[0].children[0].children[1].children[0]).attr("href") != undefined) {
            //     cours.lien_teams = $($cours_week[$i].children[0].children[1].children[0].children[0].children[0].children[0].children[1].children[0]).attr("href").split("&Tel=")[0];
            //     console.log("lien teams = "+cours.lien_teams);
            //     cours.lien_teams = await urlLib.getMetaRefreshUrl(cours.lien_teams);
            // }
            cours.position = parseInt($cours_week[$i].attribs.style.split("left:")[1].split("%")[0]);
            switch (true) {
                case cours.position >= parseInt(process.env.MONDAY_LEFT) && cours.position < parseInt(process.env.TUESDAY_LEFT):
                    cours.jour = 0;
                    break;
                case cours.position >= parseInt(process.env.TUESDAY_LEFT) && cours.position < parseInt(process.env.WEDNESDAY_LEFT):
                    cours.jour = 1;
                    break;
                case cours.position >= parseInt(process.env.WEDNESDAY_LEFT) && cours.position < parseInt(process.env.THURSDAY_LEFT):
                    cours.jour = 2;
                    break;
                case cours.position >= parseInt(process.env.THURSDAY_LEFT) && cours.position < parseInt(process.env.FRIDAY_LEFT):
                    cours.jour = 3;
                    break;
                case cours.position >= parseInt(process.env.FRIDAY_LEFT):
                    cours.jour = 4;
                    break;
                default:
                    console.log("Erreur de position, valeur inconnue : " + cours.position);
                    break;
            }
            cours.date = new Date(date);
            cours.date.setDate(cours.date.getDate() + cours.jour);
            cours.date = cours.date.toLocaleDateString("fr-FR");
            if (cours.date.split("/")[0].length == 1) {
                cours.date = "0" + cours.date;
            }
            if (cours.date.split("/")[1].length == 1) {
                cours.date = cours.date.split("/")[0] + "/0" + cours.date.split("/")[1] + "/" + cours.date.split("/")[2];
            }
            cours.dtstart = cours.date.split("/")[2] + cours.date.split("/")[1] + cours.date.split("/")[0] + "T" + cours.heure_debut.replace(":", "") + "00";
            cours.dtend = cours.date.split("/")[2] + cours.date.split("/")[1] + cours.date.split("/")[0] + "T" + cours.heure_fin.replace(":", "") + "00";
            $cleaned_cours_week.push(cours);
        }
        $cleaned_cours_week.sort(function(a, b) {
            return new Date(a.date) - new Date(b.date);
        });
        for ($i = 0; $i < $cleaned_cours_week.length; $i++) {
            if ($i + 1 < $cleaned_cours_week.length) {
                if ($cleaned_cours_week[$i].heure_fin == $cleaned_cours_week[$i + 1].heure_debut && $cleaned_cours_week[$i].salle == $cleaned_cours_week[$i + 1].salle && $cleaned_cours_week[$i].prof == $cleaned_cours_week[$i + 1].prof) {
                    $cleaned_cours_week[$i].heure_fin = $cleaned_cours_week[$i + 1].heure_fin;
                    $cleaned_cours_week[$i].horaires = $cleaned_cours_week[$i].heure_debut + " - " + $cleaned_cours_week[$i].heure_fin;
                    $cleaned_cours_week[$i].dtend = $cleaned_cours_week[$i + 1].dtend;
                    $cleaned_cours_week.splice($i + 1, 1);
                }
            }
        }
        //create uid for each cours
        for ($i = 0; $i < $cleaned_cours_week.length; $i++) {
            $cleaned_cours_week[$i].uid = $cleaned_cours_week[$i].date + $cleaned_cours_week[$i].heure_debut + $cleaned_cours_week[$i].heure_fin + $cleaned_cours_week[$i].salle + $cleaned_cours_week[$i].prof;
            $cleaned_cours_week[$i].uid = crypto.createHash('md5').update($cleaned_cours_week[$i].uid).digest("hex");
        }
        //remove all the cours that have "autonomie" in the matiere
        $cleaned_cours_week = $cleaned_cours_week.filter(function(cours) {
            return !cours.matiere.toLowerCase().includes("autonomie");
        });

        return $cleaned_cours_week;
    }
}
module.exports = { parseHTMLForWeek: parseHTMLForWeek };