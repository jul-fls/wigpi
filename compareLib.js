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

// Function to check if a course is in the future
function isFutureCourse(course) {
    const now = new Date();
    const courseStartDate = new Date(course.dtstart);
    return courseStartDate >= now;
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

// Function to detect differences between old and new course data
function detectDifferences(oldCourses, newCourses) {
    let added = [];
    let removed = [];
    let modified = [];

    // Compare new courses
    Object.keys(newCourses).forEach(uid => {
        if (!oldCourses[uid]) {
            added.push(newCourses[uid]); // New course added
        } else if (JSON.stringify(oldCourses[uid]) !== JSON.stringify(newCourses[uid])) {
            modified.push({ before: oldCourses[uid], after: newCourses[uid] }); // Course modified
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
    let changesDetected = false;
    let discordMessage = "";

    // Compare JSON files for each class
    classes.forEach(cl => {
        const oldJsonPath = rootPath + `oldJsonFiles/${cl.name}.json`;
        const newJsonPath = rootPath + `jsonFiles/${cl.name}.json`;

        // Check if both JSON files exist
        if (fs.existsSync(oldJsonPath) && fs.existsSync(newJsonPath)) {
            const oldJson = JSON.parse(fs.readFileSync(oldJsonPath, 'utf8')).courses;
            const newJson = JSON.parse(fs.readFileSync(newJsonPath, 'utf8')).courses;

            // Normalize and map by UID
            const oldCoursesMap = mapByUid(oldJson);
            const newCoursesMap = mapByUid(newJson);

            // Detect differences
            const { added, removed, modified } = detectDifferences(oldCoursesMap, newCoursesMap);

            if (added.length > 0 || removed.length > 0 || modified.length > 0) {
                changesDetected = true;
                discordMessage += `**Changes detected for class ${cl.displayname}:**\n`;

                // List added courses
                if (added.length > 0) {
                    discordMessage += "Added courses:\n";
                    added.forEach(course => {
                        discordMessage += `- ${course.matiere} from ${course.dtstart} to ${course.dtend}\n`;
                    });
                }

                // List removed courses
                if (removed.length > 0) {
                    discordMessage += "Removed courses:\n";
                    removed.forEach(course => {
                        discordMessage += `- ${course.matiere} from ${course.dtstart} to ${course.dtend}\n`;
                    });
                }

                // List modified courses
                if (modified.length > 0) {
                    discordMessage += "Modified courses:\n";
                    modified.forEach(change => {
                        discordMessage += `- ${change.before.matiere}: changed from ${change.before.dtstart}-${change.before.dtend} to ${change.after.dtstart}-${change.after.dtend}\n`;
                    });
                }
            }
        } else {
            console.log(`JSON files for class ${cl.displayname} are missing.`);
        }
    });

    // Send the message to Discord if changes were detected
    if (changesDetected) {
        await sendDiscordMessage(discordMessage);
        console.log("Changes detected and message sent to Discord.");
        console.log(discordMessage);
    } else {
        console.log("No changes detected.");
    }
}

module.exports = { compareClasses };
