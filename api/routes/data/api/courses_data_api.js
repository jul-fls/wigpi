const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const moment = require('moment-timezone');
let root_path = process.env.root_path || process.cwd();

function getSessionStatus(startDateTime, endDateTime, now) {
    if (now.isBefore(startDateTime)) {
        return "planned";
    } else if (now.isBetween(startDateTime, endDateTime)) {
        return "in progress";
    } else {
        return "done";
    }
}


function filterAndRenameCourses(courses) {
    let data = {}; // Use this object to track unique course names and their data
    let processedCourses = [];

    // Convert course dates and store in an easier-to-process array
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

    // Sort the processedCourses by start time in chronological order
    processedCourses.sort((a, b) => moment(a.dtstart, "YYYYMMDDTHHmmss").diff(moment(b.dtstart, "YYYYMMDDTHHmmss")));

    // Find the first course in September
    const septemberStartIndex = processedCourses.findIndex(course => {
        const courseDate = moment(course.dtstart, "YYYYMMDDTHHmmss");
        return courseDate.month() === 8; // September is month 8 (0-indexed months in moment.js)
    });

    // If the first September course is found, filter from that point onward
    if (septemberStartIndex !== -1) {
        processedCourses = processedCourses.slice(septemberStartIndex);
    }

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
        } else {
            if ($classes[i].name === class_name) {
                $status = 1;
                let classFilePath = root_path + "/jsonFiles/" + class_name + ".json";
                if (fs.existsSync(classFilePath)) {
                    let classData = JSON.parse(fs.readFileSync(classFilePath, 'utf8'));

                    if (classData.courses.length > 0) {
                        // Apply filtering and renaming logic to courses
                        let dataTimestamp = classData.info.timestamp;
                        let processedCourses = filterAndRenameCourses(classData.courses);
                        
                        // Initialize stats for each batiment
                        const stats = {
                            Bruges: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 },
                            Faure: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 },
                            VISIO: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 },
                            Total: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 }
                        };
                        const now = moment();

                        // Process courses for stats calculation
                        processedCourses.forEach(course => {
                            const batiment = course.batiment || 'Unknown';
                            const startDateTime = parseDateTime(course.dtstart);
                            const endDateTime = parseDateTime(course.dtend);
                            const durationHours = endDateTime.diff(startDateTime, 'hours', true);
                            const isRealized = endDateTime.isBefore(now);

                            if (stats[batiment]) {
                                stats[batiment].totalEdt += durationHours;
                                stats[batiment].totalPlanned += durationHours;
                                if (isRealized) {
                                    stats[batiment].totalRealized += durationHours;
                                }
                            }
                            stats.Total.totalEdt += durationHours;
                            stats.Total.totalPlanned += durationHours;
                            if (isRealized) {
                                stats.Total.totalRealized += durationHours;
                            }
                        });

                        // Calculate Répartition heures edt and % heures réalisées for each batiment
                        Object.keys(stats).forEach(batiment => {
                            const totalHoursEdt = stats[batiment].totalEdt;
                            const totalRealized = stats[batiment].totalRealized;

                            stats[batiment].repartitionHeuresEdt = ((totalHoursEdt / stats.Total.totalEdt) * 100).toFixed(8);
                            stats[batiment].pourcentageHeuresRealisees = totalHoursEdt ? ((totalRealized / totalHoursEdt) * 100).toFixed(2) : 0;
                        });

                        // Process courses into subjectsSummary (keeping subjects intact)
                        const subjectsSummary = {};
                        processedCourses.forEach(course => {
                            const subject = course.matiere;
                            const startDateTime = parseDateTime(course.dtstart);
                            const endDateTime = parseDateTime(course.dtend);
                            const durationHours = endDateTime.diff(startDateTime, 'hours', true);
                            const isRealized = endDateTime.isBefore(now);
                            const isVisio = course.visio;
                            const sessionStatus = getSessionStatus(startDateTime, endDateTime, now);

                            const session = {
                                date: startDateTime.format("DD/MM/yyyy"),
                                startHour: startDateTime.format("HH:mm"),
                                endHour: endDateTime.format("HH:mm"),
                                duration: durationHours,
                                isVisio: isVisio,
                                status: sessionStatus,
                                batiment: course.batiment,
                                salle: course.salle,
                            };
                            if (isVisio && course.teamslink !== "null") {
                                session.teamslink = course.teamslink;
                            }

                            if (!subjectsSummary[subject]) {
                                subjectsSummary[subject] = {
                                    firstDate: startDateTime,
                                    lastDate: endDateTime,
                                    sessions: {
                                        total: 1,
                                        realized: isRealized ? 1 : 0,
                                        planned: isRealized ? 0 : 1,
                                        list: [session]
                                    },
                                    hours: {
                                        total: durationHours,
                                        realized: isRealized ? durationHours : 0,
                                        planned: isRealized ? 0 : durationHours
                                    },
                                    teachers: [{name: course.prof.name, email: course.prof.email}],
                                    hasVisio: isVisio,
                                    visioCount: isVisio ? 1 : 0
                                };
                            } else {
                                const subjectEntry = subjectsSummary[subject];
                                subjectEntry.sessions.total += 1;
                                if (isRealized) {
                                    subjectEntry.sessions.realized += 1;
                                    subjectEntry.hours.realized += durationHours;
                                } else {
                                    subjectEntry.sessions.planned += 1;
                                    subjectEntry.hours.planned += durationHours;
                                }
                                subjectEntry.hours.total += durationHours;
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

                                subjectEntry.sessions.list.push(session);

                                // Add unique teacher
                                const teacherExists = subjectEntry.teachers.some(teacher => teacher.email === course.prof.email);
                                if (!teacherExists && course.prof.name !== "" && course.prof.email !== "") {
                                    subjectEntry.teachers.push({name: course.prof.name, email: course.prof.email });
                                }
                            }
                        });

                        const summaryArray = Object.keys(subjectsSummary).map(key => {
                            const summary = subjectsSummary[key];
                            const percentageOfCompletion = (summary.hours.realized / summary.hours.total) * 100;
                            const percentageOfVisio = summary.hasVisio ? Math.floor((summary.visioCount / summary.sessions.total) * 100) : 0;
                            const ongoing = percentageOfCompletion < 100;
                            return {
                                subject: key,
                                firstDate: summary.firstDate.format("DD/MM/yyyy"),
                                lastDate: summary.lastDate.format("DD/MM/yyyy"),
                                sessions: summary.sessions,
                                hours: summary.hours,
                                percentageOfCompletion: Math.floor(percentageOfCompletion),
                                ongoing: ongoing,
                                teachers: removeObjectsWithEmptyStrings(summary.teachers),
                                hasVisio: summary.hasVisio,
                                percentageOfVisio: percentageOfVisio
                            };
                        });

                        // Add the dataTimestamp and stats to the response
                        res.json({
                            dataTimestamp: dataTimestamp,
                            subjects: summaryArray, // Keep the subjects as you originally intended
                            stats: {
                                Bruges: {
                                    TotalHeuresEdt: stats.Bruges.totalEdt,
                                    TotalHeuresRealisees: stats.Bruges.totalRealized,
                                    TotalHeuresPlanifiees: stats.Bruges.totalPlanned,
                                    RepartitionHeuresEdt: stats.Bruges.repartitionHeuresEdt,
                                    PourcentageHeuresRealisees: stats.Bruges.pourcentageHeuresRealisees
                                },
                                Faure: {
                                    TotalHeuresEdt: stats.Faure.totalEdt,
                                    TotalHeuresRealisees: stats.Faure.totalRealized,
                                    TotalHeuresPlanifiees: stats.Faure.totalPlanned,
                                    RepartitionHeuresEdt: stats.Faure.repartitionHeuresEdt,
                                    PourcentageHeuresRealisees: stats.Faure.pourcentageHeuresRealisees
                                },
                                VISIO: {
                                    TotalHeuresEdt: stats.VISIO.totalEdt,
                                    TotalHeuresRealisees: stats.VISIO.totalRealized,
                                    TotalHeuresPlanifiees: stats.VISIO.totalPlanned,
                                    RepartitionHeuresEdt: stats.VISIO.repartitionHeuresEdt,
                                    PourcentageHeuresRealisees: stats.VISIO.pourcentageHeuresRealisees
                                },
                                Total: {
                                    TotalHeuresEdt: stats.Total.totalEdt,
                                    TotalHeuresRealisees: stats.Total.totalRealized,
                                    TotalHeuresPlanifiees: stats.Total.totalPlanned,
                                    RepartitionHeuresEdt: stats.Total.repartitionHeuresEdt,
                                    PourcentageHeuresRealisees: stats.Total.pourcentageHeuresRealisees
                                }
                            }
                        });
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
    if(a.toLowerCase().includes("mspr") && b.toLowerCase().includes("mspr")){
        let s = new difflib.SequenceMatcher(null, a, b);
        return s.ratio() >= 0.95;
    }else{
        let s = new difflib.SequenceMatcher(null, a.toLowerCase(), b.toLowerCase());
        return s.ratio() >= threshold;   
    }
}

function removeObjectsWithEmptyStrings(array) {
    return array.filter(obj => {
        return Object.values(obj).every(value => value !== "");
    });
}

module.exports = router;