require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const cal = require('./calendarLib.js');

async function GenerateHTML(classname, date1, $cours_of_the_week) {
    const $date = date1;
    const $cours = $cours_of_the_week.map((cours) => {
        return {
            'prof': cours.prof,
            'matiere': cours.matiere,
            'annee': cours.annee,
            'salle': cours.salle,
            'horaires': cours.horaires,
            'heure_debut': cours.heure_debut,
            'heure_fin': cours.heure_fin,
            'date': cours.date,
            'jour': cours.jour,
        }
    });
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: parseInt(process.env.PNG_WIDTH),
        height: parseInt(process.env.PNG_HEIGHT),
    });
    await page.goto("file://"+process.env.ROOT_PATH+"template.html", {'timeout': 10000, 'waitUntil':'networkidle2'});
    const result = await page.evaluate(($date, $cours, MONDAY_COLOR, TUESDAY_COLOR, WEDNESDAY_COLOR, THURSDAY_COLOR, FRIDAY_COLOR) => {
        monday_date = new Date($date);
        monday_date_str = ('0' + monday_date.getDate()).slice(-2) + "/" + ('0' + (monday_date.getMonth() + 1)).slice(-2) + "/" + monday_date.getFullYear();
        tuesday_date = new Date(monday_date);
        tuesday_date.setDate(tuesday_date.getDate() + 1);
        tuesday_date_str = ('0' + tuesday_date.getDate()).slice(-2) + "/" + ('0' + (tuesday_date.getMonth() + 1)).slice(-2) + "/" + tuesday_date.getFullYear();
        wednesday_date = new Date(tuesday_date);
        wednesday_date.setDate(wednesday_date.getDate() + 1);
        wednesday_date_str = ('0' + wednesday_date.getDate()).slice(-2) + "/" + ('0' + (wednesday_date.getMonth() + 1)).slice(-2) + "/" + wednesday_date.getFullYear();
        thursday_date = new Date(wednesday_date);
        thursday_date.setDate(thursday_date.getDate() + 1);
        thursday_date_str = ('0' + thursday_date.getDate()).slice(-2) + "/" + ('0' + (thursday_date.getMonth() + 1)).slice(-2) + "/" + thursday_date.getFullYear();
        friday_date = new Date(thursday_date);
        friday_date.setDate(friday_date.getDate() + 1);
        friday_date_str = ('0' + friday_date.getDate()).slice(-2) + "/" + ('0' + (friday_date.getMonth() + 1)).slice(-2) + "/" + friday_date.getFullYear();
        document.querySelector("#lundi").innerHTML = "Lundi " + monday_date_str;
        document.querySelector("#mardi").innerHTML = "Mardi " + tuesday_date_str;
        document.querySelector("#mercredi").innerHTML = "Mercredi " + wednesday_date_str;
        document.querySelector("#jeudi").innerHTML = "Jeudi " + thursday_date_str;
        document.querySelector("#vendredi").innerHTML = "Vendredi " + friday_date_str;
        tbody = document.querySelector("tbody");
        $horaires = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];

        function getCoursHours(cours_of_the_week) {
            var holes = [];
            for (var i = 0; i < cours_of_the_week.length; i++) {
                var cours = cours_of_the_week[i];
                var horaires = cours.horaires.split(" - ");
                var start = horaires[0];
                var end = horaires[1];
                var start_hour = parseInt(start.split(":")[0]);
                var start_minute = parseInt(start.split(":")[1]);
                var end_hour = parseInt(end.split(":")[0]);
                var end_minute = parseInt(end.split(":")[1]);
                var start_time = start_hour * 60 + start_minute;
                var end_time = end_hour * 60 + end_minute;
                var time = start_time;
                while (time < end_time) {
                    var hour = Math.floor(time / 60);
                    var minute = time % 60;
                    var hole = "J" + cours.jour + " H" + hour + ":" + minute;
                    holes.push(hole);
                    time += 60;
                }
            }
            return holes;
        }
        function getHoles(cours_of_the_week) {
            var holes = [];
            var cours_hours = getCoursHours(cours_of_the_week);
            var all_hours = [];
            for (var i = 0; i < 5; i++) {
                for (var j = 8; j < 20; j++) {
                    for (var k = 0; k < 60; k += 60) {
                        var hour = "J" + i + " H" + j + ":" + k;
                        all_hours.push(hour);
                    }
                }
            }
            for (var i = 0; i < all_hours.length; i++) {
                var hour = all_hours[i];
                if (cours_hours.indexOf(hour) == -1) {
                    holes.push(hour);
                }
            }
            for (var i = 0; i < holes.length; i++) {
                var hole = holes[i];
                if (hole.indexOf(":0") != -1) {
                    hole = hole.replace(":0", ":00");
                    holes[i] = hole;
                }
                if (hole.indexOf("H") != -1) {
                    hole = hole.replace("H", "");
                    holes[i] = hole;
                }
                if (hole.indexOf("J") != -1) {
                    hole = hole.replace("J", "");
                    holes[i] = hole;
                }
            }
            return holes;
        }

        function createFakeCours(cours_of_the_week) {
            var cours = getHoles(cours_of_the_week);
            var fake_cours = [];
            for (var i = 0; i < cours.length; i++) {
                if (i != cours.length - 1) {
                    var cours_jour = cours[i].split(" ")[0]
                    var cours_horaires = cours[i].split(" ")[1] + " - " + (parseInt(cours[i].split(" ")[1].split(":")[0]) + 1) + ":" + cours[i].split(" ")[1].split(":")[1];
                    var cours_fake = {
                        "jour": cours_jour,
                        "horaires": cours_horaires,
                        "heure_debut": cours_horaires.split(" - ")[0],
                        "empty": true
                    }
                    fake_cours.push(cours_fake);
                }
            }
            for(var i = 0; i <= fake_cours.length; i++){
                for (var i = 0; i < fake_cours.length; i++) {
                    if (i != fake_cours.length - 1) {
                        var cours_jour = fake_cours[i].jour;
                        var cours_horaires = fake_cours[i].horaires;
                        var cours_jour_next = fake_cours[i + 1].jour;
                        var cours_horaires_next = fake_cours[i + 1].horaires;
                        if (cours_jour == cours_jour_next) {
                            if (cours_horaires.split(" - ")[1] == cours_horaires_next.split(" - ")[0]) {
                                var cours_fake = {
                                    "jour": cours_jour,
                                    "horaires": cours_horaires.split(" - ")[0] + " - " + cours_horaires_next.split(" - ")[1],
                                    "heure_debut": cours_horaires.split(" - ")[0],
                                    "empty": true
                                }
                                fake_cours[i] = cours_fake;
                                fake_cours.splice(i + 1, 1);
                            }
                        }
                    }
                }
            }
            for (var i = 0; i < fake_cours.length; i++) {
                if (i != fake_cours.length - 1) {
                    var cours_jour = fake_cours[i].jour;
                    var cours_horaires = fake_cours[i].horaires;
                    var cours_jour_next = fake_cours[i + 1].jour;
                    var cours_horaires_next = fake_cours[i + 1].horaires;
                    if (cours_jour == cours_jour_next) {
                        if (cours_horaires.split(" - ")[1] == cours_horaires_next.split(" - ")[0]) {
                            var cours_fake = {
                                "jour": cours_jour,
                                "horaires": cours_horaires.split(" - ")[0] + " - " + cours_horaires_next.split(" - ")[1],
                                "heure_debut": cours_horaires.split(" - ")[0],
                                "heure_fin": cours_horaires_next.split(" - ")[1],
                                "empty": true
                            }
                            fake_cours[i] = cours_fake;
                            fake_cours.splice(i + 1, 1);
                        }
                    }
                }
            }
            for (var i = 0; i < fake_cours.length; i++) {
                var cours_horaires = fake_cours[i].horaires;
                var cours_horaires_split = cours_horaires.split(" - ");
                var cours_horaires_split_0 = cours_horaires_split[0].split(":");
                var cours_horaires_split_1 = cours_horaires_split[1].split(":");
                if (cours_horaires_split_0[0].length == 1) {
                    cours_horaires_split_0[0] = "0" + cours_horaires_split_0[0];
                }
                if (cours_horaires_split_1[0].length == 1) {
                    cours_horaires_split_1[0] = "0" + cours_horaires_split_1[0];
                }
                cours_horaires = cours_horaires_split_0[0] + ":" + cours_horaires_split_0[1] + " - " + cours_horaires_split_1[0] + ":" + cours_horaires_split_1[1];
                fake_cours[i].horaires = cours_horaires;
                fake_cours[i].heure_debut = cours_horaires.split(" - ")[0];
                fake_cours[i].heure_fin = cours_horaires.split(" - ")[1];
                switch (fake_cours[i].jour) {
                    case '0':
                        fake_cours[i].date = monday_date_str;
                        break;
                    case '1':
                        fake_cours[i].date = tuesday_date_str;
                        break;
                    case '2':
                        fake_cours[i].date = wednesday_date_str;
                        break;
                    case '3':
                        fake_cours[i].date = thursday_date_str;
                        break;
                    case '4':
                        fake_cours[i].date = friday_date_str;
                        break;
                }
            }
            return fake_cours;
        }
        $fakecours = createFakeCours($cours);
        $cours_with_fake_cours = $cours.concat($fakecours);

        $cours_with_fake_cours.forEach((cours) => {
            cours.horaires_id = cours.horaires.replace(/:00/gm, "").replace(/ - /gm, "");
            cours.plage_horaire = [cours.horaires_id.slice(0, 2), cours.horaires_id.slice(2, 4)];
            cours.duree = cours.plage_horaire[1] - cours.plage_horaire[0];
            cours.heures = [];
            for (i = 0; i < cours.duree; i++) {
                cours.heures.push(parseInt(cours.plage_horaire[0]) + i);
            }
        });

        $horaires.forEach(heure => {
            tr = document.createElement("tr");
            tr.classList.add("text-center");
            tr.setAttribute("id", "h" + heure);
            tbody.appendChild(tr);
        });

        $cours_with_fake_cours.sort((a, b) => {
            var date_a = a.date.split("/");
            var date_b = b.date.split("/");
            date_a = date_a[2] + "-" + date_a[1] + "-" + date_a[0];
            date_b = date_b[2] + "-" + date_b[1] + "-" + date_b[0];
            var date_a_obj = new Date(date_a + " " + a.heure_debut);
            var date_b_obj = new Date(date_b + " " + b.heure_debut);
            return date_a_obj - date_b_obj;
        });

        $cours_8h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "08:00");
        $cours_9h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "09:00");
        $cours_10h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "10:00");
        $cours_11h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "11:00");
        $cours_12h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "12:00");
        $cours_13h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "13:00");
        $cours_14h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "14:00");
        $cours_15h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "15:00");
        $cours_16h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "16:00");
        $cours_17h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "17:00");
        $cours_18h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "18:00");
        $cours_19h = $cours_with_fake_cours.filter(cours => cours.heure_debut == "19:00");
        $cours_with_fake_cours = [$cours_8h, $cours_9h, $cours_10h, $cours_11h, $cours_12h, $cours_13h, $cours_14h, $cours_15h, $cours_16h, $cours_17h, $cours_18h, $cours_19h];

        $trs = document.querySelectorAll("tr");

        $trs = Array.prototype.slice.call($trs, 1);

        $trs.forEach(tr => {
            td = document.createElement("td");
            td.classList.add("text-center");
            td.classList.add("align-middle");
            td.classList.add("font-black");
            td.classList.add("bg-gray-100");
            td.classList.add("border-y-2");
            td.innerHTML = tr.id.slice(1, 3) + "h00" + " - " + (parseInt(tr.id.slice(1, 3)) + 1) + "h00";
            tr.appendChild(td);
        });
        $trs.forEach((tr, index) => {
            heure = tr.id.split("h")[1];
            cours_hour = $cours_with_fake_cours[index];
            cours_hour.forEach(cours => {
                td = document.createElement("td");
                if (cours.empty == undefined || cours.empty == false) {
                    switch (cours.jour) {
                        case 0:
                            bg_color = MONDAY_COLOR;
                            break;
                        case 1:
                            bg_color = TUESDAY_COLOR;
                            break;
                        case 2:
                            bg_color = WEDNESDAY_COLOR;
                            break;
                        case 3:
                            bg_color = THURSDAY_COLOR;
                            break;
                        case 4:
                            bg_color = FRIDAY_COLOR;
                            break;
                    }
                    td.setAttribute("rowspan", cours.duree);
                } else {
                    bg_color = "bg-transparent";
                    td.setAttribute("rowspan", cours.duree);
                }
                td.classList.add(bg_color);
                td.classList.add("border-x-8", "border-gray-100", "p-1", "w-50");
                span_matiere = document.createElement("span");
                span_matiere.classList.add("font-bold");
                span_matiere.innerHTML = cours.matiere;
                br1 = document.createElement("br");
                span_prof = document.createElement("span");
                span_prof.innerHTML = '<i class="fa-solid fa-person-chalkboard"></i> ' + cours.prof;
                br2 = document.createElement("br");
                span_salle = document.createElement("span");
                span_salle.innerHTML = '<i class="fa-solid fa-door-open"></i> ' + cours.salle;
                br3 = document.createElement("br");
                span_horaires = document.createElement("span");
                span_horaires.innerHTML = '<i class="fa-solid fa-clock"></i> ' + cours.horaires;
                div = document.createElement("div");
                td.classList.add("event", bg_color, "text-white", "rounded-3xl", "p-1", "pl-2", "text-center", ("py-" + cours.duree * 2));
                if (cours.empty == undefined || cours.empty == false) {
                    div.appendChild(span_matiere);
                }
                div.appendChild(br1);
                if (cours.empty == undefined || cours.empty == false) {
                    div.appendChild(span_prof);
                }
                div.appendChild(br2);
                if (cours.empty == undefined || cours.empty == false) {
                    div.appendChild(span_salle);
                }
                div.appendChild(br3);
                if (cours.empty == undefined || cours.empty == false) {
                    div.appendChild(span_horaires);
                }
                td.appendChild(div);
                tr.appendChild(td);
            });
        });
        return document.querySelector("html").innerHTML;

    }, $date, $cours, process.env.MONDAY_COLOR, process.env.TUESDAY_COLOR, process.env.WEDNESDAY_COLOR, process.env.THURSDAY_COLOR, process.env.FRIDAY_COLOR);
    await page.screenshot({ path: process.env.ROOT_PATH+"pngFiles/" + classname + '.png' });
    await browser.close();
    return result;
}
module.exports = {
    GenerateHTML: GenerateHTML
};