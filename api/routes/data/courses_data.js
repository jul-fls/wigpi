const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const moment = require('moment-timezone');
let root_path = process.env.root_path || process.cwd();

// router.get('/', async (req, res) => {
//     const classesPath = path.join(root_path, "api", "classes.json");
//     let classes = JSON.parse(fs.readFileSync(classesPath, 'utf8'));
//     let data = {};

//     let firstRun = true;
//     classes.forEach(cls => {
//         if(!firstRun) return ;
//         firstRun = false;
//         const classFilePath = path.join(root_path, "jsonFiles", `${cls.name}.json`);
//         if (fs.existsSync(classFilePath)) {
//             let classData = JSON.parse(fs.readFileSync(classFilePath, 'utf8'));
            
//             if (classData.courses.length > 0) {
//                 classData.courses.forEach(course => {
//                     let courseName = decodeURIComponent(JSON.parse('"' + course.matiere + '"')).trim();
//                     let matchedKey = Object.keys(data).find(key => isSimilarEnough(key, courseName));
//                     courseName = matchedKey || courseName;

//                     if (!data[courseName]) { // Initialize if not already
//                         data[courseName] = {
//                             subject: courseName,
//                             teachers: [],
//                             hours: { planned: 0, realized: 0, percentage: 0 },
//                             onGoing: false,
//                             timespan: { start: "0", end: "0" }, // Placeholder values
//                             nb: 0
//                         };
//                     }

//                     let profName = decodeURIComponent(JSON.parse('"' + course.prof + '"'));
//                     if (!data[courseName].teachers.includes(profName)) {
//                         data[courseName].teachers.push(profName);
//                     }

//                     // Assuming parseDateTime returns a Date object
//                     let startTime = parseDateTime(course.dtstart);
//                     let endTime = parseDateTime(course.dtend);

//                     // Update session count
//                     data[courseName].nb += 1;

//                     // Update start and end dates if this course's dates are outside the current range
//                     if (startTime > data[courseName].timespan.start) {
//                         data[courseName].timespan.start = startTime;
//                     }
//                     if (endTime > data[courseName].timespan.end) {
//                         data[courseName].timespan.end = endTime;
//                     }
//                 });

//                 // Update percentage and format dates after processing all courses
//                 Object.keys(data).forEach(key => {
//                     let course = data[key];
//                     // Assuming all planned hours are realized for simplicity
//                     course.hours.percentage = 100;
//                     // course.timespan.start = formatDateTime(parseDateTime(course.timespan.start));
//                     // course.timespan.end = formatDateTime(parseDateTime(course.timespan.end));
//                 });
//             }
//         }
//     });

//     res.json(data);
// });

function filterAndRenameCourses(courses) {
    let data = {}; // Use this object to track unique course names and their data
    let processedCourses = [];

    courses.forEach(course => {
        let courseName = decodeURIComponent(JSON.parse('"' + course.matiere + '"')).trim();
        let matchedKey = Object.keys(data).find(key => isSimilarEnough(key, courseName));

        // If a similar course name is found, use the matched key; otherwise, use the current course name
        courseName = matchedKey || courseName;

        if (!data[courseName]) { // Initialize if not already
            data[courseName] = true; // Mark this course name as processed
        }

        let profName = decodeURIComponent(JSON.parse('"' + course.prof + '"'));

        // Create a new course object with potentially updated course name and add it to the processed list
        let newCourse = { ...course, matiere: courseName, prof: profName };
        processedCourses.push(newCourse);
    });

    return processedCourses;
}

router.get('/:class_name', async (req, res) => {
    const class_name = req.params.class_name;
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;

    for (var i = 0; i < $classes.length; i++) {
        if ($status != 0) {
            break;
        }else{
            if ($classes[i].name === class_name) {
                $status = 1;
                let classFilePath = root_path + "/jsonFiles/" + class_name + ".json";
                if (fs.existsSync(classFilePath)) {
                    let classData = JSON.parse(fs.readFileSync(classFilePath, 'utf8'));
        
                    if (classData.courses.length > 0) {
                        // Apply filtering and renaming logic to courses
                        let processedCourses = filterAndRenameCourses(classData.courses);
                        res.json(processedCourses);
                    }
                }
            }
        }        
    }
});

function calculate_duration(start, end) {
    // start and end are js date strings like "2021-01-01T00:00:00.000Z" (using timezone "Europe/Paris" is very important for this to work properly!)
    let start_date = new Date(start);
    let end_date = new Date(end);
    let duration = end_date - start_date; // in milliseconds
    // convert it in hours
    duration = duration / 1000 / 60 / 60;
    return duration;
}

function calculate_hours_realized_and_planned(courses) {
    let hours_realized = 0;
    let hours_planned = 0;
    courses.forEach(course => {
        hours_realized += calculate_duration(course.dtstart, course.dtend);
        hours_planned += calculate_duration(course.dtstart, course.dtend);
    });
    return { hours_realized, hours_planned };
}

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