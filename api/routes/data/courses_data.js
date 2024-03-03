const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const moment = require('moment-timezone');
let root_path = process.env.root_path || process.cwd();

router.get('/', async (req, res) => {
    const classesPath = path.join(root_path, "api", "classes.json");
    let classes = JSON.parse(fs.readFileSync(classesPath, 'utf8'));
    let data = {};

    let firstRun = true;
    classes.forEach(cls => {
        if(!firstRun) return ;
        firstRun = false;
        const classFilePath = path.join(root_path, "jsonFiles", `${cls.name}.json`);
        if (fs.existsSync(classFilePath)) {
            let classData = JSON.parse(fs.readFileSync(classFilePath, 'utf8'));
            
            if (classData.courses.length > 0) {
                classData.courses.forEach(course => {
                    let courseName = decodeURIComponent(JSON.parse('"' + course.matiere + '"')).trim();
                    let matchedKey = Object.keys(data).find(key => isSimilarEnough(key, courseName));
                    courseName = matchedKey || courseName;

                    if (!data[courseName]) { // Initialize if not already
                        data[courseName] = {
                            subject: courseName,
                            teachers: [],
                            hours: { planned: 0, realized: 0, percentage: 0 },
                            onGoing: false,
                            timespan: { start: "0", end: "0" }, // Placeholder values
                            nb: 0
                        };
                    }

                    let profName = decodeURIComponent(JSON.parse('"' + course.prof + '"'));
                    if (!data[courseName].teachers.includes(profName)) {
                        data[courseName].teachers.push(profName);
                    }

                    // Assuming parseDateTime returns a Date object
                    let startTime = parseDateTime(course.dtstart);
                    let endTime = parseDateTime(course.dtend);

                    // Update session count
                    data[courseName].nb += 1;

                    // Update start and end dates if this course's dates are outside the current range
                    if (startTime > data[courseName].timespan.start) {
                        data[courseName].timespan.start = startTime;
                    }
                    if (endTime > data[courseName].timespan.end) {
                        data[courseName].timespan.end = endTime;
                    }
                });

                // Update percentage and format dates after processing all courses
                Object.keys(data).forEach(key => {
                    let course = data[key];
                    // Assuming all planned hours are realized for simplicity
                    course.hours.percentage = 100;
                    // course.timespan.start = formatDateTime(parseDateTime(course.timespan.start));
                    // course.timespan.end = formatDateTime(parseDateTime(course.timespan.end));
                });
            }
        }
    });

    res.json(data);
});

function parseDateTime(dateTimeStr) {
    const format = "YYYYMMDDHHmmss";
    // Parse the date in Europe/Paris timezone and consider daylight saving time
    let date = moment.tz(dateTimeStr,format, "Europe/Paris");
    
    return date.format();
}


function formatDateTime(date) {
    // console.log(date);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function isSimilarEnough(a, b, threshold = 0.9) {
    let s = new difflib.SequenceMatcher(null, a, b);
    return s.ratio() >= threshold;
}

module.exports = router;