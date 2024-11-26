require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
const miscLib = require('./miscLib');

//create uid for each cours based on matiere and date
function generateUniqueIdForWeek(courses) {
    let courseOccurrencesByDate = {};

    courses.forEach((cours) => {
        const courseKey = `${cours.matiere}_${cours.date}`;
        if (!courseOccurrencesByDate[courseKey]) {
            courseOccurrencesByDate[courseKey] = 0;
        }
        courseOccurrencesByDate[courseKey]++;
    });

    let occurrenceCountByDate = {};
    courses.forEach((cours) => {
        const courseKey = `${cours.matiere}_${cours.date}`;

        if (!occurrenceCountByDate[courseKey]) {
            occurrenceCountByDate[courseKey] = 1;
        } else {
            occurrenceCountByDate[courseKey]++;
        }

        const orderIndex = occurrenceCountByDate[courseKey] > 1 ? `_${occurrenceCountByDate[courseKey]}` : '';
        const uniqueId = `${cours.matiere}_${cours.date}${orderIndex}`;
        cours.uid = crypto.createHash('md5').update(uniqueId).digest("hex");
    });
}

async function parseHTMLForWeek(response, date, groupNumber) {
    const $ = cheerio.load(response);
    if ($('body').text().includes(process.env.WIGOR_NO_COURSE_TEXT)) {
        console.log("Pas de cours la semaine du " + date + " !");
        return [];
    } else {
        console.log("Cours détectés la semaine du " + date + " !");
        const $cours_week_raw = $(".Case:not([id])").toArray();
        let $cleaned_cours_week = [];

        for (const $cours of $cours_week_raw) {
            const cours = await extractCourseDetails($, $cours, date);
            if (cours.groupNumber === groupNumber && cours.batiment !== undefined && parseInt(cours.heure_debut.split(":")[0]) < 18) {
                $cleaned_cours_week.push(cours);
            }
        }

        mergeConsecutiveCourses($cleaned_cours_week);
        $cleaned_cours_week.sort((a, b) => new Date(a.date) - new Date(b.date));
        generateUniqueIdForWeek($cleaned_cours_week);

        return $cleaned_cours_week;
    }
}

async function extractCourseDetails($, $cours, date) {
    const cours = {};
    cours.date = date;
    cours.visio = false;
    cours.matiere = extractText($, $cours, 'matiere')
        .replace(/(visio|distanciel)/i, "")
        .trim()
        .replace(/^./, char => char.toUpperCase())
        .replaceAll(".", "")
        .replaceAll(",", " ");

    cours.salle = extractText($, $cours, 'salle').replace("Salle:", "").trim();
    if (cours.salle.includes("DISTANCIEL")) {
        cours.visio = true;
    }

    cours.prof = await extractProfDetails($, $cours);
    cours.groupNumber = extractGroupNumber($, $cours);
    cours.annee = extractText($, $cours, 'annee');
    cours.horaires = extractText($, $cours, 'horaires');
    cours.heure_debut = cours.horaires.split(" - ")[0];
    cours.heure_fin = cours.horaires.split(" - ")[1];

    processRoomInfo(cours);
    cours.position = parseInt($cours.attribs.style.split("left:")[1].split("%")[0]);
    cours.jour = determineDayFromPosition(cours.position);
    cours.dtstart = formatDateTime(cours.date, cours.heure_debut);
    cours.dtend = formatDateTime(cours.date, cours.heure_fin);

    return cours;
}

function extractText($, $cours, type) {
    switch (type) {
        case 'matiere':
            return $($cours.children[0].children[1].children[0].children[0].children[0].children[0]).text().replace(/(\r\n|\n|\r)/gm, " ");
        case 'salle':
            return $($cours.children[0].children[1].children[0].children[0].children[2].children[1]).text();
        case 'annee':
            return $($cours.children[0].children[1].children[0].children[0].children[1].children[0]).html().split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
        case 'horaires':
            return $($cours.children[0].children[1].children[0].children[0].children[2].children[0]).text();
        default:
            return "";
    }
}

async function extractProfDetails($, $cours) {
    let profName = $($cours.children[0].children[1].children[0].children[0].children[1].children[0])
        .html().split("</span>")[1]
        .split("<br>")[0]
        .replace(/(\r\n|\n|\r)/gm, " ")
        .replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
        })
        .replace(/epsi/gi, "")
        .trim();

    return {
        name: profName,
        email: profName !== "" ? await miscLib.EpsiNameToEmail(profName) : ""
    };
}

function extractGroupNumber($, $cours) {
    const text = $($cours.children[0].children[1].children[0].children[0].children[1].children[0]).html();
    const afterSpan = text.split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
    const cleanedText = afterSpan.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

    const transversalesIndex = cleanedText.indexOf("Transversales");
    if (transversalesIndex !== -1) {
        const match = /Transversales(\d)/.exec(cleanedText.substring(transversalesIndex));
        return match ? match[1] : "0";
    }
    return "0";
}

function processRoomInfo(cours) {
    if (!cours.salle) return;

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
    // Handle multiple rooms or different building prefixes
    // ... (similar to original processing logic)
}

function determineDayFromPosition(position) {
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

function calculateCourseDate(baseDate, dayOffset) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(date, time) {
    const [day, month, year] = date.split("/");
    return `${year}${month}${day}T${time.replace(":", "") + "00"}`;
}

function mergeConsecutiveCourses(courses) {
    for (let i = 0; i < courses.length - 1; i++) {
        if (
            courses[i].heure_fin === courses[i + 1].heure_debut &&
            courses[i].salle === courses[i + 1].salle &&
            courses[i].prof.name === courses[i + 1].prof.name &&
            courses[i].visio === courses[i + 1].visio &&
            courses[i].batiment === courses[i + 1].batiment
        ) {
            courses[i].heure_fin = courses[i + 1].heure_fin;
            courses[i].horaires = `${courses[i].heure_debut} - ${courses[i].heure_fin}`;
            courses[i].dtend = courses[i + 1].dtend;
            courses.splice(i + 1, 1);
        }
    }
}

module.exports = { parseHTMLForWeek };
