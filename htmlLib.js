require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

// Function to hash a string (like matiere) into a color
function hashStringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = ((hash >> 24) & 0xFF).toString(16) + // R
                  ((hash >> 16) & 0xFF).toString(16) + // G
                  ((hash >> 8) & 0xFF).toString(16);   // B
    return `#${color.substring(0, 6)}`;  // Trim to 6 characters for valid hex
}


async function GenerateHTML(classname, date1, $cours_of_the_week) {
    const $date = new Date(date1);
    const $cours = $cours_of_the_week.map((cours) => {
        return {
            'prof': cours.prof.name,
            'matiere': cours.matiere,
            'annee': cours.annee,
            'batiment': cours.batiment,
            'salle': cours.salle,
            'horaires': cours.horaires,
            'heure_debut': cours.heure_debut,
            'heure_fin': cours.heure_fin,
            'date': cours.date,
            'jour': cours.jour,
        };
    });

    // Read the template
    const templatePath = process.env.ROOT_PATH + "template.html";
    const templateHtml = fs.readFileSync(templatePath, 'utf8');

    // Load the template into Cheerio
    const $ = cheerio.load(templateHtml);

    // Calculate the dates for the week starting from the provided date
    const monday_date_str = formatDate($date);
    const tuesday_date_str = formatDate(addDays($date, 1));
    const wednesday_date_str = formatDate(addDays($date, 2));
    const thursday_date_str = formatDate(addDays($date, 3));
    const friday_date_str = formatDate(addDays($date, 4));

    // Set the table header dates (lundi to vendredi)
    $("#lundi").text("Lundi " + monday_date_str);
    $("#mardi").text("Mardi " + tuesday_date_str);
    $("#mercredi").text("Mercredi " + wednesday_date_str);
    $("#jeudi").text("Jeudi " + thursday_date_str);
    $("#vendredi").text("Vendredi " + friday_date_str);

    // Group courses by day of the week
    const coursesByDay = { '0': [], '1': [], '2': [], '3': [], '4': [] };
    $cours.forEach((cours) => {
        if (coursesByDay[cours.jour]) {
            coursesByDay[cours.jour].push(cours);
        }
    });

    // Track which courses have been rendered to avoid duplicates
    const renderedCourses = {};

    // Create a 30-minute time increment for each hour from 08:00 to 18:00 (Last time slot is 17:30-18:00)
    const timeSlots = [];
    for (let hour = 8; hour <= 17; hour++) {
        timeSlots.push(`${hour}:00 - ${hour}:30`);
        if (hour !== 18) {  // Skip the slot after 18:00
            timeSlots.push(`${hour}:30 - ${hour + 1}:00`);
        }
    }

    // Generate table rows for each 30-minute time slot
    const $tbody = $('tbody');
    timeSlots.forEach(timeSlot => {
        const [start, end] = timeSlot.split(' - ');
        const $tr = $('<tr></tr>');
    
        // Create the time slot cell
        // const $timeCell = $('<td class="p-4 border-b border-gray-400 rounded-lg w-1/6 text-center"></td>').text(timeSlot);
        // $tr.append($timeCell);
        // No need to create a time slot cell as we are removing the "Horaires" column
    
        // Generate course cells for each day (0 = Monday, 4 = Friday)
        for (let day = 0; day <= 4; day++) {
            const courseForSlot = coursesByDay[day].find(cours => isCourseInSlot(cours, start, end));
    
            if (courseForSlot && !renderedCourses[`${day}-${courseForSlot.heure_debut}`]) {
                const rowspan = calculateRowspan(courseForSlot);
    
                // Generate a unique color based on the matiere string
                const backgroundColor = hashStringToColor(courseForSlot.matiere);
    
                // Use Tailwind's arbitrary value syntax for dynamic border color
                const $courseCell = $(`<td class="shadow-neumorphism rounded-2xl border-[32px] text-center border-transparent bg-[${backgroundColor}]/25 w-1/6"></td>`)
                    .attr('rowspan', rowspan)
                    .append(`<span class="flex justify-center font-bold text-4xl mb-6">${courseForSlot.matiere}</span>
                        <div class="flex justify-center">
                            <div class="flex flex-col items-start">
                                <span class="flex items-center text-3xl">
                                    <i class="fa-solid fa-person-chalkboard mr-6"></i>${courseForSlot.prof ? courseForSlot.prof : "Aucun intervenant"}
                                </span>
                                <br/>
                                <span class="flex items-center text-2xl">
                                    <i class="fa-solid fa-building mr-10"></i>${courseForSlot.batiment}
                                </span>
                                <span class="flex items-center text-2xl">
                                    <i class="fa-solid fa-door-open mr-8"></i>${courseForSlot.salle}
                                </span>
                                <br/>
                                <span class="flex items-center text-xl">
                                    <i class="fa-solid fa-clock mr-10"></i>${courseForSlot.horaires}
                                </span>
                            </div>
                        </div>`);
                $tr.append($courseCell);
    
                // Mark this course as rendered for its start time
                renderedCourses[`${day}-${courseForSlot.heure_debut}`] = true;
            } else if (!courseForSlot) {
                $tr.append('<td class="p-2 border h-10"></td>');
            }
        }
    
        // Append the row to the tbody
        $tbody.append($tr);
    });

    // Save the generated HTML
    const outputPath = process.env.ROOT_PATH + `htmlFiles/${classname}.html`;
    fs.writeFileSync(outputPath, $.html());

    // Make HTTP GET call to capture the screenshot
    const screenshotUrl = `${process.env.SCREENSHOT_SERVICE_URL}?width=1920&height=1080&url=${process.env.EXTERNAL_DOMAIN}/api/courses/get_html/${classname}`;
    try {
        const response = await axios.get(screenshotUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync(process.env.ROOT_PATH + `pngFiles/${classname}.png`, response.data);
    } catch (error) {
        console.error("Error taking screenshot: ", error);
    }

    return $.html();
}

// Helper functions
function formatDate(date) {
    return ('0' + date.getDate()).slice(-2) + "/" + ('0' + (date.getMonth() + 1)).slice(-2) + "/" + date.getFullYear();
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Check if the course falls within the given start and end times
function isCourseInSlot(course, startTime, endTime) {
    const [startHour, startMinute] = course.heure_debut.split(':').map(Number);
    const [endHour, endMinute] = course.heure_fin.split(':').map(Number);

    const startSlot = parseTime(startTime);
    const endSlot = parseTime(endTime);

    const courseStart = startHour * 60 + startMinute;
    const courseEnd = endHour * 60 + endMinute;

    return courseStart < endSlot && courseEnd > startSlot;
}

// Helper to parse time string into minutes from 00:00
function parseTime(timeStr) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
}

// Calculate rowspan for courses that span multiple 30-minute slots
function calculateRowspan(course) {
    const [startHour, startMinute] = course.heure_debut.split(':').map(Number);
    const [endHour, endMinute] = course.heure_fin.split(':').map(Number);

    const courseDurationInMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    return courseDurationInMinutes / 30;
}

module.exports = {
    GenerateHTML: GenerateHTML
};
