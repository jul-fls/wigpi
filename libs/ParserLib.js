require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
const miscLib = require('./miscLib');

// Create UID for each course based on subject (matiere) and date
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

        // Merge consecutive courses
        mergeConsecutiveCourses($cleaned_cours_week);

        // Generate unique IDs for courses
        generateUniqueIdForWeek($cleaned_cours_week);

        // Sort courses by date
        $cleaned_cours_week.sort((a, b) => new Date(a.date) - new Date(b.date));

        return $cleaned_cours_week;
    }
}

async function extractCourseDetails($, $cours, date) {
    const cours = {};
    cours.date = formatDate(date);
    cours.visio = false;

    // Extract course details
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

    // Process room info
    processRoomInfo(cours);

    cours.position = parseInt($cours.attribs.style.split("left:")[1].split("%")[0]);
    cours.jour = determineDayFromPosition(cours.position);
    cours.dtstart = formatDateTime(cours.date, cours.heure_debut);
    cours.dtend = formatDateTime(cours.date, cours.heure_fin);

    return cours;
}

function formatDate(date) {
    const parsedDate = new Date(date);
    return parsedDate.toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(date, time) {
    const [day, month, year] = date.split("/");
    const [hours, minutes] = time.split(":");

    if (!day || !month || !year || !hours || !minutes) {
        console.error("Invalid date or time values:", { date, time });
        return null;
    }

    const dateTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);
    if (isNaN(dateTime.getTime())) {
        console.error("Invalid constructed date:", dateTime);
        return null;
    }

    return dateTime.toISOString().replace(/-|:|\.\d{3}/g, "").slice(0, 15); // "YYYYMMDDTHHmmss"
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
