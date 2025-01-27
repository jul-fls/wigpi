require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
const miscLib = require('./miscLib');

//create uid for each cours based on matiere and date
function generateUniqueIdForWeek(courses) {
    let courseOccurrencesByDate = {};

    // Compte combien de fois chaque cours avec une même matière et date apparaît
    courses.forEach((cours) => {
        const courseKey = `${cours.matiere}_${cours.date}`;
        if (!courseOccurrencesByDate[courseKey]) {
            courseOccurrencesByDate[courseKey] = 0;
        }
        courseOccurrencesByDate[courseKey]++;
    });

    let occurrenceCountByDate = {}; // Pour compter les occurrences actuelles lors de l'itération
    courses.forEach((cours) => {
        const courseKey = `${cours.matiere}_${cours.date}`;
        
        // Si c'est la première occurrence, initialise le compteur pour ce cours
        if (!occurrenceCountByDate[courseKey]) {
            occurrenceCountByDate[courseKey] = 1;
        } else {
            occurrenceCountByDate[courseKey]++;
        }

        // Ajoute un index d'ordre si le même cours apparaît plusieurs fois à la même date
        const orderIndex = occurrenceCountByDate[courseKey] > 1 ? `_${occurrenceCountByDate[courseKey]}` : '';

        // Génère l'ID unique basé sur la matière, la date, et l'index d'ordre
        const uniqueId = `${cours.matiere}_${cours.date}${orderIndex}`;
        cours.uid = crypto.createHash('md5').update(uniqueId).digest("hex");
    });
}

function processRoomInformation(cours) {
    const salleParts = cours.salle.split("(");
    if (salleParts.length > 1) {
        const batimentParts = salleParts[1].split(")");
        if (batimentParts.length > 0) {
            cours.batiment = batimentParts[0];
            if (cours.batiment === "DISTANCIEL") {
                cours.visio = true;
                cours.batiment = "VISIO";
                cours.salle = "VISIO";
            }
        }
    }

    cours.salle = salleParts[0].trim();

    if (cours.salle.startsWith("M")) {
        let multiSalles = cours.salle.replace("M: ", "").split(", ");
        let firstBatiment = null;

        multiSalles = multiSalles.map((salle) => {
            let parsedSalle = salle.trim();
            if (parsedSalle.startsWith("F")) {
                let etage = parseInt(parsedSalle[1]);
                parsedSalle = `Etage ${etage} Salle ${parsedSalle.slice(2).trim()}`;
                if (!firstBatiment) firstBatiment = "Faure";
            } else if (parsedSalle.startsWith("B")) {
                let etage = parseInt(parsedSalle[1]) + 1;
                parsedSalle = `Etage ${etage} Salle ${parsedSalle.slice(2).trim()}`;
                if (!firstBatiment) firstBatiment = "Bruges";
            }
            return parsedSalle;
        });

        multiSalles.sort();
        cours.salle = multiSalles.join(", ");
        cours.batiment = firstBatiment;
    } else if (cours.salle.startsWith("F")) {
        let etage = parseInt(cours.salle[1]);
        cours.salle = `Etage ${etage} Salle ${cours.salle.slice(2).trim()}`;
        cours.batiment = "Faure";
    } else if (cours.salle.startsWith("B")) {
        let etage = parseInt(cours.salle[1]) + 1;
        cours.salle = `Etage ${etage} Salle ${cours.salle.slice(2).trim()}`;
        cours.batiment = "Bruges";
    } else if (cours.salle.includes("SALLE_")) {
        cours.salle = "VISIO";
    }
    cours.salle = cours.salle.replaceAll("_", "");
}

function calculateDayFromPosition(position) {
    switch (true) {
        case position >= parseInt(process.env.MONDAY_LEFT) && position < parseInt(process.env.TUESDAY_LEFT):
            return 0;
        case position >= parseInt(process.env.TUESDAY_LEFT) && position < parseInt(process.env.WEDNESDAY_LEFT):
            return 1;
        case position >= parseInt(process.env.WEDNESDAY_LEFT) && position < parseInt(process.env.THURSDAY_LEFT):
            return 2;
        case position >= parseInt(process.env.THURSDAY_LEFT) && position < parseInt(process.env.FRIDAY_LEFT):
            return 3;
        case position >= parseInt(process.env.FRIDAY_LEFT):
            return 4;
        default:
            console.log("Erreur de position, valeur inconnue : " + position);
            return -1;
    }
}

function formatName(name) {
    return name.replace(/(\r\n|\n|\r)/gm, " ")
               .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
               .replace(/epsi/gi, "")
               .trim();
}

function filterCourses(courses) {
    return courses.filter(cours => {
        return parseInt(cours.heure_debut.split(":")[0]) < 18 && cours.batiment !== undefined;
    });
}

function mergeConsecutiveCourses(courses) {
    for (let i = 0; i < courses.length - 1; i++) {
        if (courses[i].heure_fin == courses[i + 1].heure_debut &&
            courses[i].salle == courses[i + 1].salle &&
            courses[i].prof.name == courses[i + 1].prof.name &&
            courses[i].visio == courses[i + 1].visio &&
            courses[i].batiment == courses[i + 1].batiment) {
            courses[i].heure_fin = courses[i + 1].heure_fin;
            courses[i].horaires = courses[i].heure_debut + " - " + courses[i].heure_fin;
            courses[i].dtend = courses[i + 1].dtend;
            courses.splice(i + 1, 1);
            i--;
        }
    }
    return courses;
}

function extractGroupNumber(htmlText) {
    // Extract the text after </span> and clean it
    const afterSpan = htmlText.split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
    const cleanedText = afterSpan.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

    // Check if the string contains "Transversales" and extract the number
    const transversalesIndex = cleanedText.indexOf("Transversales");
    if (transversalesIndex !== -1) {
        const match = cleanedText.substring(transversalesIndex).match(/Transversales(\d)/);
        return match ? match[1] : "0";
    }

    // Default to "0" if no match is found
    return "0";
}

async function parseHTMLForWeek(response, date, groupNumber) {
    const $ = cheerio.load(response);
    if ($('body').text().includes(process.env.WIGOR_NO_COURSE_TEXT)) {
        console.log("Pas de cours la semaine du " + date + " !");
    } else {
        console.log("Cours détectés la semaine du " + date + " !");
        const $cours_week_raw = $(".Case:not([id])");
        let $cours_week = $cours_week_raw.toArray();
        let $cleaned_cours_week = [];
        for (let $i = 0; $i < $cours_week.length; $i++) {
            let cours = [];
            cours.visio = false;
            cours.matiere = formatName($($cours_week[$i].children[0].children[1].children[0].children[0].children[0].children[0]).text());
            cours.salle = $($cours_week[$i].children[0].children[1].children[0].children[0].children[2].children[1]).text().replace("Salle:", "");
            if (cours.salle.includes("DISTANCIEL")) {
                cours.visio = true;
            }
            cours.matiere = formatName(cours.matiere.toLowerCase().replace("visio", "").replace("distanciel", "").trim().replace(/^./, char => char.toUpperCase()).replaceAll(".", "").replaceAll(",", " "));
            cours.prof = {
                name: "",
                email: ""
            };
            cours.prof.name = $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[0].replace(/(\r\n|\n|\r)/gm, " ").replace(/\w\S*/g, function(txt) {
                return formatName(txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            });
            cours.prof.name = cours.prof.name.replace(/epsi/gi, "").trim();
            if (cours.prof.name != "") {
                cours.prof.email = await miscLib.EpsiNameToEmail(cours.prof.name);
            }
            cours.groupNumber = extractGroupNumber(
                $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html()
            );
            cours.annee = $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
            cours.horaires = $($cours_week[$i].children[0].children[1].children[0].children[0].children[2].children[0]).text();
            cours.heure_debut = cours.horaires.split(" - ")[0];
            cours.heure_fin = cours.horaires.split(" - ")[1];
            processRoomInformation(cours)
            cours.position = parseInt($cours_week[$i].attribs.style.split("left:")[1].split("%")[0]);
            cours.jour = calculateDayFromPosition(cours.position);
            cours.date = new Date(date);
            cours.date.setDate(cours.date.getDate() + cours.jour);
            cours.date = cours.date.toLocaleDateString("fr-FR");
            if (cours.date.split("/")[0].length === 1) {
                cours.date = "0" + cours.date;
            }
            if (cours.date.split("/")[1].length === 1) {
                cours.date = cours.date.split("/")[0] + "/0" + cours.date.split("/")[1] + "/" + cours.date.split("/")[2];
            }
            cours.dtstart = cours.date.split("/")[2] + cours.date.split("/")[1] + cours.date.split("/")[0] + "T" + cours.heure_debut.replace(":", "") + "00";
            cours.dtend = cours.date.split("/")[2] + cours.date.split("/")[1] + cours.date.split("/")[0] + "T" + cours.heure_fin.replace(":", "") + "00";
            if(groupNumber === cours.groupNumber) {
                $cleaned_cours_week.push(cours);
            }
        }
        $cleaned_cours_week.sort(function(a, b) {
            return new Date(a.date) - new Date(b.date);
        });

        $cleaned_cours_week = mergeConsecutiveCourses($cleaned_cours_week);

        $cleaned_cours_week = filterCourses($cleaned_cours_week);

        generateUniqueIdForWeek($cleaned_cours_week);

        return $cleaned_cours_week;
    }
}

module.exports = { parseHTMLForWeek: parseHTMLForWeek };