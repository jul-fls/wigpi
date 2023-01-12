require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const form = new FormData();
function edit_message(webhook_id, webhook_token, message_id, date, filename){
    $refresh_date = new Date();
    $refresh_date = ('0' + $refresh_date.getDate()).slice(-2) + "/" + ('0' + ($refresh_date.getMonth()+1)).slice(-2) + "/" + $refresh_date.getFullYear() + " à " + ('0' + $refresh_date.getHours()).slice(-2) + ":" + ('0' + $refresh_date.getMinutes()).slice(-2) + ":" + ('0' + $refresh_date.getSeconds()).slice(-2);
    // $refresh_date = date;
    form.append('payload_json', JSON.stringify({
        "content": "",
        "embeds": [
            {
                "title": "EDT Semaine du "+date,
                "description": "Actualisé le "+$refresh_date,
                "color": process.env.DISCORD_EMBED_COLOR,
                "timestamp": "2021-10-17T20:20:39.866Z",
                "footer": {
                    "text": "EDT Footer",
                    "icon_url": "https://i.postimg.cc/5ySzCJb0/logo-epsi.png"
                },
                "image": {
                    "url": "attachment://"+filename,
                }
            }
        ],
        "avatar_url": "https://i.postimg.cc/5ySzCJb0/logo-epsi.png",
        "username": "EDT"
    }));
    const path = require('path');
    let chemin = process.env.ROOT_PATH+"julien.flusin_cours.png";
    form.append('file', fs.createReadStream(chemin));
    //send the request to the discord api
    const response = fetch('https://discord.com/api/webhooks/'+webhook_id+'/'+webhook_token+'/messages/'+message_id, {
        method: 'PATCH',
        body: form
    })
    .then((res) => { 
        status = res.status; 
        return res.json() 
      })
    .then((response) => {
        // console.log(jsonResponse);
        console.log(status);
    })
}
edit_message('1031336832379654144', 'wIxwtJZgOG-KtBq_Wo4IqbA_RYPUNrrXigXEn-69LtkFyIi7kF2jniogzVKPU_ZyE13p', '1031336902621663272', '07/11/2022', 'julien.flusin_cours.png');