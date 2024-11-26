function getMonday(d) {
    d = new Date(d);
    const day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    const monday=new Date(d.setDate(diff));
    let date = monday.getDate();
    if (date < 10){
        date = "0" + date;
    }
    let month = monday.getMonth() + 1;
    if (month < 10){
        month = "0" + month;
    }
    let year = monday.getFullYear();
    return month + "/" + date + "/" + year;
}

function getWeeks(year){
    let weeks = [];
    let d = new Date(year, 0, 1);
    while (d.getFullYear() == year) {
        const week = getMonday(d);
        weeks.push(week);
        d.setDate(d.getDate() + 7);
    }
    for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i];
        const weekYear = week.split("/")[2];
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