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
            cours.matiere = $($cours_week[$i].children[0].children[1].children[0].children[0].children[0].children[0]).text().replace(/(\r\n|\n|\r)/gm, " ");
            cours.salle = $($cours_week[$i].children[0].children[1].children[0].children[0].children[2].children[1]).text().replace("Salle:", "");
            if (cours.salle.includes("DISTANCIEL")) {
                cours.visio = true;
            }
            cours.matiere = cours.matiere.toLowerCase().replace("visio", "").replace("distanciel", "").trim().replace(/^./, char => char.toUpperCase()).replaceAll(".", "").replaceAll(",", " ");
            cours.prof = {
                name: "",
                email: ""
            };
            cours.prof.name = $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[0].replace(/(\r\n|\n|\r)/gm, " ").replace(/\w\S*/g, function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
            cours.prof.name = cours.prof.name.replace(/epsi/gi, "").trim();
            if (cours.prof.name != "") {
                cours.prof.email = await miscLib.EpsiNameToEmail(cours.prof.name);
            }
            cours.groupNumber = (() => {
                const text = $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html();
                const afterSpan = text.split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
                const cleanedText = afterSpan.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            
                // Check if the string contains "transversales"
                const transversalesIndex = cleanedText.indexOf("Transversales");
                if (transversalesIndex !== -1) {
                    // Extract the number right after "transversales"
                    const match = cleanedText.substring(transversalesIndex).match(/Transversales(\d)/);
                    return match ? match[1] : "0";
                } else {
                    return "0";
                }
            })();
            cours.annee = $($cours_week[$i].children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
            cours.horaires = $($cours_week[$i].children[0].children[1].children[0].children[0].children[2].children[0]).text();
            cours.heure_debut = cours.horaires.split(" - ")[0];
            cours.heure_fin = cours.horaires.split(" - ")[1];
            cours.salle = $($cours_week[$i].children[0].children[1].children[0].children[0].children[2].children[1]).text().replace("Salle:", "");
            
            // Process the room information
            if (cours.salle) {
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
                
                // Check if salle starts with "M:" and handle multiple rooms
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
                            let etage = parseInt(parsedSalle[1])+1;
                            parsedSalle = `Etage ${etage} Salle ${parsedSalle.slice(2).trim()}`;
                            if (!firstBatiment) firstBatiment = "Bruges";
                        }

                        return parsedSalle;
                    });

                    multiSalles.sort(); // Sort by batiment alphabetically
                    cours.salle = multiSalles.join(", ");
                    cours.batiment = firstBatiment; // Only consider the first batiment
                } else if (cours.salle.startsWith("F")) {
                    // Process Faure building
                    cours.salle = cours.salle.replace("F", "");
                    let etage = parseInt(cours.salle[0]);
                    cours.salle = `Etage ${etage} Salle ${cours.salle.slice(1).trim()}`;
                    cours.batiment = "Faure";
                } else if (cours.salle.startsWith("B")) {
                    // Process Bruges building
                    cours.salle = cours.salle.replace("B", "");
                    let etage = parseInt(cours.salle[0])+1;
                    cours.salle = `Etage ${etage} Salle ${cours.salle.slice(1).trim()}`;
                    cours.batiment = "Bruges";
                } else if (cours.salle.includes("SALLE_")) {
                    cours.salle = "VISIO";
                }
                cours.salle = cours.salle.replaceAll("_", "");
            }
            
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
        for (let $i = 0; $i < $cleaned_cours_week.length; $i++) {
            if ($i + 1 < $cleaned_cours_week.length) {
                if ($cleaned_cours_week[$i].heure_fin == $cleaned_cours_week[$i + 1].heure_debut && $cleaned_cours_week[$i].salle == $cleaned_cours_week[$i + 1].salle && $cleaned_cours_week[$i].prof.name == $cleaned_cours_week[$i + 1].prof.name && $cleaned_cours_week[$i].viso == $cleaned_cours_week[$i + 1].viso && $cleaned_cours_week[$i].batiment == $cleaned_cours_week[$i + 1].batiment) {
                    $cleaned_cours_week[$i].heure_fin = $cleaned_cours_week[$i + 1].heure_fin;
                    $cleaned_cours_week[$i].horaires = $cleaned_cours_week[$i].heure_debut + " - " + $cleaned_cours_week[$i].heure_fin;
                    $cleaned_cours_week[$i].dtend = $cleaned_cours_week[$i + 1].dtend;
                    $cleaned_cours_week.splice($i + 1, 1);
                }
            }
        }
        // Remove all the courses that start at 18:00 or later
        $cleaned_cours_week = $cleaned_cours_week.filter(function(cours) {
            return parseInt(cours.heure_debut.split(":")[0]) < 18;
        });

        // Ignorer les cours sans bâtiment défini
        $cleaned_cours_week = $cleaned_cours_week.filter(function(cours) {
            return cours.batiment !== undefined;
        });

        generateUniqueIdForWeek($cleaned_cours_week);

        return $cleaned_cours_week;
    }
}

module.exports = { parseHTMLForWeek: parseHTMLForWeek };