require('dotenv').config();
const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const { Webhook } = require('simple-discord-webhooks');
const FormData = require('form-data');
const form = new FormData();

// Charger les classes depuis le fichier JSON
const classes = JSON.parse(fs.readFileSync(process.env.ROOT_PATH + "config/classes.json", 'utf8'));

function readMessageIds() {
    try {
        const data = fs.readFileSync(process.env.ROOT_PATH + "output/messageIds.json", 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // Return empty array if file doesn't exist or is unreadable
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

async function delete_message(webhook_id, webhook_token, message_id, classname) {
    fetch(process.env.DISCORD_API_BASE_URL + webhook_id + '/' + webhook_token + '/messages/' + message_id, {
            method: 'DELETE'
        })
        .then((res) => {
            if (res.status == 204) {
                console.log("Message deleted for class " + classname);
            } else {
                console.log("Error deleting message for class " + classname);
            }
        });
}

async function post_message(webhook_id, webhook_token, role_id, date, classname, groupNumber) {
    const hook = new Webhook(process.env.DISCORD_API_BASE_URL + webhook_id + "/" + webhook_token, "EDT", process.env.DISCORD_IMAGE);
    $refresh_date = new Date();
    $refresh_date_str = ('0' + $refresh_date.getDate()).slice(-2) + "/" + ('0' + ($refresh_date.getMonth() + 1)).slice(-2) + "/" + $refresh_date.getFullYear() + " à " + ('0' + $refresh_date.getHours()).slice(-2) + ":" + ('0' + $refresh_date.getMinutes()).slice(-2) + ":" + ('0' + $refresh_date.getSeconds()).slice(-2);
    $date = date.split("/");
    $date = $date[0] + "/" + $date[1] + "/" + $date[2];

    let chemin = path.join(process.env.ROOT_PATH + "output/pngFiles/", classname + ".png");
    $random_str = "" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    $embeds = [];

    $embed = {
        "title": "EDT Semaine du " + $date,
        "description": "Actualisé le " + $refresh_date_str,
        "color": parseInt(process.env.DISCORD_EMBED_COLOR, 16),
        "timestamp": $refresh_date.toISOString(),
        "footer": {
            "text": "EDT EPSI I2",
            "icon_url": process.env.DISCORD_IMAGE
        },
        "image": {
            "url": process.env.EXTERNAL_DOMAIN + "/api/courses/get_png/" + classname + "/" + $random_str
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

    // Ajoutez les liens vers les canaux Discord si groupNumber est 0
    if (groupNumber === 0) {
        classes.forEach(cls => {
            if (cls.user.groupNumber !== 0) {
                $embed.fields.push(
                    {
                        "name": `EDT ${cls.displayname}`,
                        "value": `<#${cls.channelid}>`,
                        "inline": false
                    }
                );
            }
        });
    }

    $embeds.push($embed);
    // $content = "<@&" + role_id + ">";
    $content = "";
    hook.send($content, $embeds)
        .then((response) => {
            //if the message is sent
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
