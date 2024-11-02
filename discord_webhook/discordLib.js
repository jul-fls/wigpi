require('dotenv').config();
const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const { Webhook } = require('simple-discord-webhooks');
const FormData = require('form-data');
const form = new FormData();

// Load classes from JSON file
const classes = JSON.parse(fs.readFileSync(process.env.ROOT_PATH + "config/classes.json", 'utf8'));

function readMessageIds() {
    try {
        const data = fs.readFileSync(process.env.ROOT_PATH + "output/messageIds.json", 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

function writeMessageIds(messageIds) {
    fs.writeFileSync(process.env.ROOT_PATH + "output/messageIds.json", JSON.stringify(messageIds, null, 2), 'utf8');
}

function getMessageIdByClassname(messageIds, classname) {
    const found = messageIds.find(entry => entry.classname === classname);
    return found ? found.message_id : null;
}

function setMessageIdByClassname(messageIds, classname, message_id) {
    const index = messageIds.findIndex(entry => entry.classname === classname);
    if (index !== -1) {
        messageIds[index].message_id = message_id;
    } else {
        messageIds.push({ classname, message_id });
    }
    writeMessageIds(messageIds);
}

function getTimestampFromSnowflake(snowflake) {
    const discordEpoch = 1420070400000n;
    return new Date(Number((BigInt(snowflake) >> 22n) + discordEpoch));
}

function getGroupNumberByClassname(classname) {
    const classData = classes.find(cls => cls.name === classname);
    return classData ? classData.user.groupNumber : null;
}

function checkRecentMessages(messageIds) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 1 day ago in UTC
    return messageIds.some(entry => {
        const messageTime = getTimestampFromSnowflake(entry.message_id).getTime();
        const groupNumber = getGroupNumberByClassname(entry.classname);
        return groupNumber !== "0" && messageTime >= oneDayAgo;
    });
}

async function delete_message(webhook_id, webhook_token, message_id, classname) {
    fetch(process.env.DISCORD_API_BASE_URL + webhook_id + '/' + webhook_token + '/messages/' + message_id, {
        method: 'DELETE'
    }).then((res) => {
        if (res.status == 204) {
            console.log("Message deleted for class " + classname);
        } else {
            console.log("Error deleting message for class " + classname);
        }
    });
}

async function post_message(webhook_id, webhook_token, role_id, date, classname, groupNumber) {
    const hook = new Webhook(process.env.DISCORD_API_BASE_URL + webhook_id + "/" + webhook_token, "EDT", process.env.DISCORD_IMAGE);
    const refresh_date = new Date();
    const refresh_date_str = ('0' + refresh_date.getDate()).slice(-2) + "/" + ('0' + (refresh_date.getMonth() + 1)).slice(-2) + "/" + refresh_date.getFullYear() + " à " + ('0' + refresh_date.getHours()).slice(-2) + ":" + ('0' + refresh_date.getMinutes()).slice(-2) + ":" + ('0' + refresh_date.getSeconds()).slice(-2);
    const [day, month, year] = date.split("/");

    const random_str = "" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const embeds = [];

    const embed = {
        "title": "EDT Semaine du " + `${day}/${month}/${year}`,
        "description": "Actualisé le " + refresh_date_str,
        "color": parseInt(process.env.DISCORD_EMBED_COLOR, 16),
        "timestamp": refresh_date.toISOString(),
        "footer": {
            "text": "EDT EPSI I2",
            "icon_url": process.env.DISCORD_IMAGE
        },
        "image": {
            "url": process.env.EXTERNAL_DOMAIN + "/api/courses/get_png/" + classname + "/" + random_str
        },
        "fields": [
            {
                "name": " ",
                "value": `Lien calendrier Outlook / Google Agenda : ${process.env.EXTERNAL_DOMAIN.replace("https","webcals")}/api/courses/get_ics/${classname}`,
                "inline": false
            },
            {
                "name": " ",
                "value": `[Page de données wigpi](${process.env.EXTERNAL_DOMAIN}/data)`,
                "inline": false
            }
        ]
    };

    if (groupNumber === "0") {
        // Add links to other classes' channels if groupNumber is 0
        classes.forEach(cls => {
            if (cls.user.groupNumber !== "0") {
                embed.fields.push({
                    "name": `EDT ${cls.displayname}`,
                    "value": `<#${cls.channelid}>`,
                    "inline": false
                });
            }
        });

        // Check for recent messages in other classes with groupNumber != 0
        const messageIds = readMessageIds();
        const hasRecentMessages = checkRecentMessages(messageIds);
        if (hasRecentMessages) {
            embed.fields.push({
                "name": "⚠️ **Attention**",
                "value": "**Des cours de groupes transverses ont été postés récemment.**\n\n" +
                    "Veuillez vérifier les canaux des groupes transverses ci-dessus pour plus d'informations.",
                "inline": false
            });
        }
    }

    embeds.push(embed);
    const content = "";
    hook.send(content, embeds)
        .then((response) => {
            if (response.id != undefined) {
                let messageIds = readMessageIds();
                setMessageIdByClassname(messageIds, classname, response.id);
                console.log("Message ID saved for class " + classname);
            }
        })
        .catch((err) => {
            console.log("Erreur lors de l'envoi du message pour la classe " + classname);
            console.error(err);
        });
}

async function post_edt(webhook_id, webhook_token, role_id, date, classname, groupNumber) {
    console.log("Posting message for class " + classname);
    let messageIds = readMessageIds();
    let message_id = getMessageIdByClassname(messageIds, classname);

    if (message_id) {
        await delete_message(webhook_id, webhook_token, message_id, classname);
    }

    await post_message(webhook_id, webhook_token, role_id, date, classname, groupNumber)
        .then(() => {
            console.log("Message posted for class " + classname);
        })
        .catch((err) => {
            console.log(err);
        });
}

module.exports = {
    post_edt
};
