require('dotenv').config();
const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const { Webhook } = require('simple-discord-webhooks');
const FormData = require('form-data');
const form = new FormData();

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
        })
}

async function post_message(webhook_id, webhook_token, role_id, date, classname) {
    const hook = new Webhook(process.env.DISCORD_API_BASE_URL + webhook_id + "/" + webhook_token, "EDT", process.env.DISCORD_IMAGE);
    $refresh_date = new Date();
    $refresh_date_str = ('0' + $refresh_date.getDate()).slice(-2) + "/" + ('0' + ($refresh_date.getMonth() + 1)).slice(-2) + "/" + $refresh_date.getFullYear() + " à " + ('0' + $refresh_date.getHours()).slice(-2) + ":" + ('0' + $refresh_date.getMinutes()).slice(-2) + ":" + ('0' + $refresh_date.getSeconds()).slice(-2);
    $date = date.split("/");
    $date = $date[0] + "/" + $date[1] + "/" + $date[2];

    let chemin = path.join(process.env.ROOT_PATH + "pngFiles/", classname + ".png");
    $random_str = "" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    $embeds = [];

    $embed = {
        "title": "EDT Semaine du " + $date,
        "description": "Actualisé le " + $refresh_date_str,
        "color": parseInt(process.env.DISCORD_EMBED_COLOR, 16),
        "timestamp": $refresh_date.toISOString(),
        "footer": {
            "text": "EDT EPSI I1",
            "icon_url": process.env.DISCORD_IMAGE
        },
        "image": {
            "url": process.env.EXTERNAL_DOMAIN + "/api/courses/get_png/" + classname + "/" + $random_str
        }
    };
    $embeds.push($embed);
    // $content = "<@&" + role_id + ">";
    $content = "";
    hook.send($content, $embeds)
        .then((response) => {
            //if the message is sent
            if (response.id != undefined) {
                fs.writeFile(process.env.ROOT_PATH + "messageIds/" + classname + ".txt", response.id, (err) => {
                    if (err) {
                        console.log("Erreur lors de l'écriture du message id pour la classe " + classname);
                    } else {
                        console.log("Message ID saved for class " + classname);
                    }
                });
            }
        })
        .catch((err) => {
            console.log("Erreur lors de l'envoi du message pour la classe " + classname);
            console.error(err);
        })
}
async function post_edt(webhook_id, webhook_token, role_id, date, classname) {
    fs.readFile(process.env.ROOT_PATH + "messageIds/" + classname + ".txt", 'utf8', async function(err, message_id) {
        if (err) {
            fs.writeFile(process.env.ROOT_PATH + "messageIds/" + classname + ".txt", '', (err) => {
                if (err) {
                    console.log(err);
                }
            });
        } else {
            //if the file is not empty
            if (message_id != '') {
                await delete_message(webhook_id, webhook_token, message_id, classname);
            }
            await post_message(webhook_id, webhook_token, role_id, date, classname)
                .then(() => {
                    console.log("Message posted for class " + classname);
                })
                .catch((err) => {
                    console.log(err);
                })
        }
    });
}
module.exports = {
    post_edt
};
