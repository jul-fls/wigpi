const { DateTime } = require('luxon');
const express = require('express');
const router = express.Router();

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const difflib = require('difflib');
const root_path = process.env.root_path || process.cwd();

function getSessionStatus(startDateTime, endDateTime, now) {
    if (now < startDateTime) {
        return "planned";
    } else if (now >= startDateTime && now <= endDateTime) {
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

        const profName = decodeURIComponent(JSON.parse('"' + course.prof.name + '"'));

        // Create a new course object with potentially updated course name and add it to the processed list
        const newCourse = { ...course, matiere: courseName, prof: { name: profName, email: course.prof.email } };
        processedCourses.push(newCourse);
    });

    // Sort the processedCourses by start time in chronological order
    processedCourses.sort((a, b) => parseDateTime(a.dtstart) - parseDateTime(b.dtstart));

    // Define the 1st of September of the current year
    const currentYear = new Date().getFullYear();
    const firstOfSeptember = new Date(`${currentYear}-09-01T00:00:00+02:00`); // +02:00 for Europe/Paris timezone during summer

    // Find the first course that occurs on or after the 1st of September
    const septemberStartIndex = processedCourses.findIndex(course => {
        const courseDate = parseDateTime(course.dtstart);
        return courseDate >= firstOfSeptember;
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
    $classes = fs.readFileSync(root_path + "/config/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $status = 0;

    for (let i = 0; i < $classes.length; i++) {
        if ($status != 0) {
            break;
        } else {
            if ($classes[i].name === class_name) {
                $status = 1;
                const classFilePath = root_path + "/output/jsonFiles/" + class_name + ".json";
                if (fs.existsSync(classFilePath)) {
                    const classData = JSON.parse(fs.readFileSync(classFilePath, 'utf8'));

                    if (classData.courses.length > 0) {
                        // Apply filtering and renaming logic to courses
                        const dataTimestamp = classData.info.timestamp;
                        const processedCourses = filterAndRenameCourses(classData.courses);
                        
                        // Initialize stats for each batiment
                        const stats = {
                            Bruges: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 },
                            Faure: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 },
                            VISIO: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 },
                            Total: { totalEdt: 0, totalRealized: 0, totalPlanned: 0 }
                        };

                        // Process courses for stats calculation
                        processedCourses.forEach(course => {
                            const batiment = course.batiment || 'Unknown';
                            const startDateTime = parseDateTime(course.dtstart);
                            const endDateTime = parseDateTime(course.dtend);
                            const durationHours = calculateDuration(startDateTime, endDateTime); // Using native JS duration calculation
                            const isRealized = endDateTime < new Date(); // Compare with current time
                        
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
                            const durationHours = calculateDuration(startDateTime, endDateTime); // Using native JS duration calculation
                            const isRealized = endDateTime < new Date(); // Compare with current time
                            const isVisio = course.visio;
                            const sessionStatus = getSessionStatus(startDateTime, endDateTime, new Date());

                            const session = {
                                date: formatDate(startDateTime), // Use the formatDate helper function
                                startHour: formatTime(startDateTime), // Use the formatTime helper function
                                endHour: formatTime(endDateTime), // Use the formatTime helper function
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
                                if (startDateTime < subjectEntry.firstDate) {
                                    subjectEntry.firstDate = startDateTime;
                                }
                                if (endDateTime > subjectEntry.lastDate) {
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
                                firstDate: formatDate(summary.firstDate),
                                lastDate: formatDate(summary.lastDate),
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
    // Extract components from the string (assumed format: "YYYYMMDDTHHmmss")
    const year = dateTimeStr.substring(0, 4);
    const month = dateTimeStr.substring(4, 6);
    const day = dateTimeStr.substring(6, 8);
    const hour = dateTimeStr.substring(9, 11);
    const minute = dateTimeStr.substring(11, 13);
    const second = dateTimeStr.substring(13, 15);

    // Use Luxon to create a DateTime object in Europe/Paris timezone
    return DateTime.fromObject(
        {
            year: parseInt(year),
            month: parseInt(month),
            day: parseInt(day),
            hour: parseInt(hour),
            minute: parseInt(minute),
            second: parseInt(second),
        },
        { zone: 'Europe/Paris' }
    ).toJSDate(); // Convert to a JavaScript Date object
}

// Helper to format time into the desired output format (HH:mm)
function formatTime(date) {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

// Helper to format date into the desired output format (DD/MM/yyyy)
function formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function calculateDuration(startDateTime, endDateTime) {
    const diffMs = endDateTime - startDateTime; // Difference in milliseconds
    return diffMs / (1000 * 60 * 60); // Convert from milliseconds to hours
}

function isSimilarEnough(a, b, threshold = 0.8) {
    if(a.toLowerCase().includes("mspr") && b.toLowerCase().includes("mspr")){
        const s = new difflib.SequenceMatcher(null, a, b);
        return s.ratio() >= 0.95;
    }else{
        const s = new difflib.SequenceMatcher(null, a.toLowerCase(), b.toLowerCase());
        return s.ratio() >= threshold;   
    }
}

function removeObjectsWithEmptyStrings(array) {
    return array.filter(obj => {
        return Object.values(obj).every(value => value !== "");
    });
}

module.exports = router;