const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const moment = require('moment-timezone');
let root_path = process.env.root_path || process.cwd();

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

        let profName = decodeURIComponent(JSON.parse('"' + course.prof.name + '"'));

        // Create a new course object with potentially updated course name and add it to the processed list
        let newCourse = { ...course, matiere: courseName, prof: { name: profName, email: course.prof.email } };
        processedCourses.push(newCourse);
    });
    console.log("number courses =",processedCourses.length);
    const dev_processedCourses = processedCourses.slice(0, 10);
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
                        const subjectsSummary = {};
                        const now = moment(); // Current date and time
                        processedCourses.forEach(course => {
                            const subject = course.matiere;
                            const startDateTime = parseDateTime(course.dtstart);
                            const endDateTime = parseDateTime(course.dtend);
                            const durationHours = endDateTime.diff(startDateTime, 'hours', true);
                            const isRealized = endDateTime.isBefore(now);
                            const isVisio = course.visio === "true";
                        
                            if (!subjectsSummary[subject]) {
                                subjectsSummary[subject] = {
                                    firstDate: startDateTime,
                                    lastDate: endDateTime,
                                    occurrences: 1,
                                    totalHours: durationHours,
                                    realizedHours: isRealized ? durationHours : 0,
                                    plannedHours: isRealized ? 0 : durationHours,
                                    teachers: [{name: course.prof.name, email: course.prof.email}],
                                    hasVisio: isVisio,
                                    visioCount: isVisio ? 1 : 0
                                };
                            } else {
                                const subjectEntry = subjectsSummary[subject];
                                subjectEntry.occurrences += 1;
                                subjectEntry.totalHours += durationHours;
                                if (isRealized) {
                                    subjectEntry.realizedHours += durationHours;
                                } else {
                                    subjectEntry.plannedHours += durationHours;
                                }
                                if (startDateTime.isBefore(subjectEntry.firstDate)) {
                                    subjectEntry.firstDate = startDateTime;
                                }
                                if (endDateTime.isAfter(subjectEntry.lastDate)) {
                                    subjectEntry.lastDate = endDateTime;
                                }
                                if (isVisio) {
                                    subjectEntry.hasVisio = true;
                                    subjectEntry.visioCount += 1;
                                }

                                // Add unique teacher
                                const teacherExists = subjectEntry.teachers.some(teacher => teacher.email === course.prof.email);
                                if (!teacherExists && course.prof.name !== "" && course.prof.email !== "") {
                                    subjectEntry.teachers.push({name: course.prof.name, email: course.prof.email});
                                }
                            }
                        });

                        const summaryArray = Object.keys(subjectsSummary).map(key => {
                            const summary = subjectsSummary[key];
                            const percentageOfCompletion = (summary.realizedHours / summary.totalHours) * 100;
                            const percentageOfVisio = summary.hasVisio ? Math.floor((summary.visioCount / summary.occurrences) * 100) : 0;
                            return {
                                subject: key,
                                firstDate: summary.firstDate.format(),
                                lastDate: summary.lastDate.format(),
                                occurrences: summary.occurrences,
                                totalHours: summary.totalHours,
                                realizedHours: summary.realizedHours,
                                plannedHours: summary.plannedHours,
                                percentageOfCompletion: Math.floor(percentageOfCompletion),
                                teachers: removeObjectsWithEmptyStrings(summary.teachers),
                                hasVisio: summary.hasVisio,
                                percentageOfVisio: percentageOfVisio
                            };
                        });
                        res.json(summaryArray);
                    }
                }
            }
        }        
    }
});

function parseDateTime(dateTimeStr) {
    const format = "YYYYMMDDHHmmss";
    // Parse the date in Europe/Paris timezone and consider daylight saving time
    let date = moment.tz(dateTimeStr,format, "Europe/Paris");
    
    return date
}

function isSimilarEnough(a, b, threshold = 0.8) {
    let s = new difflib.SequenceMatcher(null, a, b);
    return s.ratio() >= threshold;
}

function removeObjectsWithEmptyStrings(array) {
    return array.filter(obj => {
        return Object.values(obj).every(value => value !== "");
    });
}

module.exports = router;