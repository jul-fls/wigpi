const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Function to send a Discord message
async function sendDiscordMessage(content) {
    try {
        const response = await fetch(process.env.DISCORD_WEBHOOK_DETECT_CHANGES_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        if (!response.ok) {
            console.error("Error sending message to Discord:", response.statusText);
        } else {
            console.log("Message sent to Discord successfully.");
        }
    } catch (error) {
        console.error("Error while sending Discord message:", error);
    }
}

function isFutureCourse(course) {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const courseStartDate = parseCourseDate(course.dtstart);

    // Check if the course is in the future or within the last month
    return courseStartDate >= oneMonthAgo;
}

// Convert JSON data into an object keyed by `uid`, filtering only future courses
function mapByUid(courses) {
    let map = {};
    courses
        .filter(isFutureCourse) // Filter only future courses
        .forEach(course => {
            map[course.uid] = normalizeCourse(course);
        });
    return map;
}

// Normalize course data for comparison
function normalizeCourse(course) {
    return {
        dtstart: course.dtstart.trim(),
        dtend: course.dtend.trim(),
        matiere: course.matiere.trim().toLowerCase(),
        prof: {
            name: course.prof.name.trim(),
            email: course.prof.email ? course.prof.email.trim() : ""
        },
        salle: course.salle ? course.salle.trim() : "",
        batiment: course.batiment ? course.batiment.trim() : "",
        visio: course.visio,
        teamslink: course.teamslink || null
    };
}

// Function to detect and display detailed differences between two course objects
function detectDetailedDifferences(oldCourse, newCourse) {
    let differences = [];

    Object.keys(newCourse).forEach(key => {
        // If the key is an object (e.g., 'prof'), we need to compare its inner properties
        if (typeof newCourse[key] === 'object' && newCourse[key] !== null) {
            Object.keys(newCourse[key]).forEach(subKey => {
                if (oldCourse[key][subKey] !== newCourse[key][subKey]) {
                    differences.push({
                        key: `${key}.${subKey}`,
                        before: oldCourse[key][subKey],
                        after: newCourse[key][subKey]
                    });
                }
            });
        } else if (oldCourse[key] !== newCourse[key]) {
            // Compare primitive values
            differences.push({
                key: key,
                before: oldCourse[key],
                after: newCourse[key]
            });
        }
    });

    return differences;
}

function parseCourseDate(dateStr) {
    // dateStr is in format "YYYYMMDDTHHmmss"
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);

    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}


// Function to detect differences between old and new course data
function detectDifferences(oldCourses, newCourses) {
    let added = [];
    let removed = [];
    let modified = [];

    // Compare new courses
    Object.keys(newCourses).forEach(uid => {
        if (!oldCourses[uid]) {
            added.push(newCourses[uid]); // New course added
        } else {
            let detailedDifferences = detectDetailedDifferences(oldCourses[uid], newCourses[uid]);
            if (detailedDifferences.length > 0) {
                modified.push({
                    before: oldCourses[uid],
                    after: newCourses[uid],
                    differences: detailedDifferences
                }); // Course modified
            }
        }
    });

    // Find removed courses
    Object.keys(oldCourses).forEach(uid => {
        if (!newCourses[uid]) {
            removed.push(oldCourses[uid]); // Course removed
        }
    });

    return { added, removed, modified };
}

// Main function to compare JSON files for all classes and send Discord messages if changes are detected
async function compareClasses(classes, rootPath) {
    // Compare JSON files for each class
    for (const cl of classes) {
        // if (cl.name === "i2-eisi-dev2") {
        if (true) {
            const oldJsonPath = rootPath + `oldJsonFiles/${cl.name}.json`;
            const newJsonPath = rootPath + `jsonFiles/${cl.name}.json`;

            // Check if both JSON files exist
            if (fs.existsSync(oldJsonPath) && fs.existsSync(newJsonPath)) {
                try {
                    const oldJsonData = fs.readFileSync(oldJsonPath, 'utf8');
                    const newJsonData = fs.readFileSync(newJsonPath, 'utf8');

                    if (!oldJsonData || !newJsonData) {
                        console.log(`Empty JSON file detected for class ${cl.displayname}.`);
                        continue;
                    }

                    const oldJson = JSON.parse(oldJsonData).courses;
                    const newJson = JSON.parse(newJsonData).courses;

                    // Normalize and map by UID
                    const oldCoursesMap = mapByUid(oldJson);
                    const newCoursesMap = mapByUid(newJson);

                    // Detect differences
                    const { added, removed, modified } = detectDifferences(oldCoursesMap, newCoursesMap);

                    if (added.length > 0 || removed.length > 0 || modified.length > 0) {
                        let discordMessage = `**Changes detected for class ${cl.displayname}:**\n`;

                        // List added courses
                        if (added.length > 0) {
                            discordMessage += "**Added courses:**\n";
                            added.forEach(course => {
                                discordMessage += `- **${course.matiere}** from ${course.dtstart} to ${course.dtend}\n`;
                            });
                        }

                        // List removed courses
                        if (removed.length > 0) {
                            discordMessage += "**Removed courses:**\n";
                            removed.forEach(course => {
                                discordMessage += `- **${course.matiere}** from ${course.dtstart} to ${course.dtend}\n`;
                            });
                        }

                        // List modified courses with detailed differences
                        if (modified.length > 0) {
                            discordMessage += "**Modified courses:**\n";
                            modified.forEach(change => {
                                discordMessage += `- **${change.before.matiere}** from ${change.before.dtstart} to ${change.before.dtend}\n`;
                                discordMessage += `  - **Changes:**\n`;
                                change.differences.forEach(diff => {
                                    discordMessage += `    - **${diff.key}**: changed from "${diff.before}" to "${diff.after}"\n`;
                                });
                            });
                        }

                        // Send the message to Discord for this class
                        await sendDiscordMessage(discordMessage);
                        console.log(`Changes detected for class ${cl.displayname} and message sent to Discord.`);
                        console.log(discordMessage);
                    } else {
                        console.log(`No changes detected for class ${cl.displayname}.`);
                    }
                } catch (error) {
                    console.error(`Error parsing JSON for class ${cl.displayname}:`, error);
                    continue; // Skip to the next class if there's an error
                }
            } else {
                console.log(`JSON files for class ${cl.displayname} are missing.`);
            }
        }
    }
}

module.exports = { compareClasses };