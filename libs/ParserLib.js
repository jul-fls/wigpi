require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const crypto = require('crypto');
const miscLib = require('./miscLib');

// Utility: Generate unique ID for courses
function generateUniqueIdForWeek(courses) {
    let courseOccurrencesByDate = {};
    let occurrenceCountByDate = {};

    courses.forEach((cours) => {
        const courseKey = `${cours.matiere}_${cours.date}`;
        courseOccurrencesByDate[courseKey] = (courseOccurrencesByDate[courseKey] || 0) + 1;
    });

    courses.forEach((cours) => {
        const courseKey = `${cours.matiere}_${cours.date}`;
        occurrenceCountByDate[courseKey] = (occurrenceCountByDate[courseKey] || 0) + 1;
        const orderIndex = occurrenceCountByDate[courseKey] > 1 ? `_${occurrenceCountByDate[courseKey]}` : '';
        const uniqueId = `${cours.matiere}_${cours.date}${orderIndex}`;
        cours.uid = crypto.createHash('md5').update(uniqueId).digest("hex");
    });
}

// Utility: Parse and clean course details
function parseCourseDetails($, courseElement, date, groupNumber) {
    let cours = {
        visio: false,
        matiere: $(courseElement.children[0].children[1].children[0].children[0].children[0].children[0])
            .text().replace(/(\r\n|\n|\r)/gm, " ").toLowerCase()
            .replace("visio", "").replace("distanciel", "").trim()
            .replace(/^./, char => char.toUpperCase()).replaceAll(".", "").replaceAll(",", " "),
        salle: $(courseElement.children[0].children[1].children[0].children[0].children[2].children[1])
            .text().replace("Salle:", "").trim(),
        prof: {
            name: "",
            email: ""
        },
        groupNumber: "",
        annee: "",
        horaires: "",
        heure_debut: "",
        heure_fin: "",
        position: parseInt(courseElement.attribs.style.split("left:")[1].split("%")[0]),
        jour: -1,
        date: "",
        dtstart: "",
        dtend: "",
        batiment: undefined
    };

    // Process visio courses
    if (cours.salle.includes("DISTANCIEL")) {
        cours.visio = true;
    }

    // Process professor details
    const profText = $(courseElement.children[0].children[1].children[0].children[0].children[1].children[0]).html();
    if (profText) {
        cours.prof.name = profText.split("</span>")[1].split("<br>")[0].replace(/(\r\n|\n|\r)/gm, " ")
            .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()).trim();
        if (cours.prof.name) {
            cours.prof.email = miscLib.EpsiNameToEmail(cours.prof.name);
        }
    }

    // Process group number
    cours.groupNumber = extractGroupNumber(profText);

    // Process building and room
    processBuildingAndRoom(cours);

    // Determine course date
    cours.jour = determineDayFromPosition(cours.position);
    cours.date = calculateDateForDay(date, cours.jour);
    cours.dtstart = formatDateTime(cours.date, cours.heure_debut);
    cours.dtend = formatDateTime(cours.date, cours.heure_fin);

    return cours.groupNumber === groupNumber ? cours : null;
}

// Utility: Extract group number
function extractGroupNumber(profText) {
    const text = profText.split("</span>")[1].split("<br>")[1].replace(/(\r\n|\n|\r)/gm, " ");
    const cleanedText = text.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    const match = cleanedText.match(/Transversales(\d)/);
    return match ? match[1] : "0";
}

// Utility: Process building and room
function processBuildingAndRoom(cours) {
    // Your existing logic for handling rooms and buildings
    // This includes handling "M:", "F", "B" prefixes, etc.
}

// Utility: Determine day of the week based on position
function determineDayFromPosition(position) {
    const monday = parseInt(process.env.MONDAY_LEFT);
    const tuesday = parseInt(process.env.TUESDAY_LEFT);
    const wednesday = parseInt(process.env.WEDNESDAY_LEFT);
    const thursday = parseInt(process.env.THURSDAY_LEFT);
    const friday = parseInt(process.env.FRIDAY_LEFT);

    if (position >= monday && position < tuesday) return 0;
    if (position >= tuesday && position < wednesday) return 1;
    if (position >= wednesday && position < thursday) return 2;
    if (position >= thursday && position < friday) return 3;
    if (position >= friday) return 4;
    return -1;
}

// Utility: Calculate date for the given day
function calculateDateForDay(baseDate, dayOffset) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString("fr-FR");
}

// Utility: Format date-time for dtstart/dtend
function formatDateTime(date, time) {
    const [day, month, year] = date.split("/");
    return `${year}${month}${day}T${time.replace(":", "")}00`;
}

// Main function: Parse HTML for a week
async function parseHTMLForWeek(response, date, groupNumber) {
    const $ = cheerio.load(response);
    if ($('body').text().includes(process.env.WIGOR_NO_COURSE_TEXT)) {
        console.log("Pas de cours la semaine du " + date + " !");
        return [];
    }

    console.log("Cours détectés la semaine du " + date + " !");
    const $coursWeekRaw = $(".Case:not([id])").toArray();
    let cleanedCourses = $coursWeekRaw.map(courseElement => parseCourseDetails($, courseElement, date, groupNumber))
        .filter(cours => cours !== null);

    // Combine adjacent courses and filter unwanted ones
    cleanedCourses = combineAdjacentCourses(cleanedCourses);
    cleanedCourses = filterCourses(cleanedCourses);

    generateUniqueIdForWeek(cleanedCourses);

    return cleanedCourses;
}

// Utility: Combine adjacent courses
function combineAdjacentCourses(courses) {
    for (let i = 0; i < courses.length - 1; i++) {
        const curr = courses[i];
        const next = courses[i + 1];
        if (curr.heure_fin === next.heure_debut && curr.salle === next.salle &&
            curr.prof.name === next.prof.name && curr.visio === next.visio &&
            curr.batiment === next.batiment) {
            curr.heure_fin = next.heure_fin;
            curr.horaires = `${curr.heure_debut} - ${curr.heure_fin}`;
            curr.dtend = next.dtend;
            courses.splice(i + 1, 1);
            i--;
        }
    }
    return courses;
}

// Utility: Filter courses based on conditions
function filterCourses(courses) {
    return courses.filter(cours => parseInt(cours.heure_debut.split(":")[0]) < 18 && cours.batiment !== undefined);
}

module.exports = { parseHTMLForWeek };