function getMonday(d) {
    d = new Date(d);
    day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    monday=new Date(d.setDate(diff));
    date = monday.getDate();
    if (date < 10){
        date = "0" + date;
    }
    month = monday.getMonth() + 1;
    if (month < 10){
        month = "0" + month;
    }
    year = monday.getFullYear();
    return month + "/" + date + "/" + year;
}

function getWeeks(year){
    weeks = [];
    d = new Date(year, 0, 1);
    while (d.getFullYear() == year) {
        week = getMonday(d);
        weeks.push(week);
        d.setDate(d.getDate() + 7);
    }
    for (i = 0; i < weeks.length; i++) {
        week = weeks[i];
        weekYear = week.split("/")[2];
        if (weekYear != year){
            weeks.splice(i, 1);
        }
    }
    weeks.sort(function(a, b){
        a = a.split("/");
        b = b.split("/");
        return new Date(a[2], a[0], a[1]) - new Date(b[2], b[0], b[1]);
    });
    return weeks;
}
module.exports = {
    getWeeks: getWeeks,
    getMonday: getMonday
}