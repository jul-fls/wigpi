var db = require('./dbLib.js');
//insert a single row with dates as datetime fields
db.query("INSERT INTO cours (start,end,description,lieu) VALUES ('2018-12-24 00:00:00','2018-01-01 00:00:00','test','test')")
.then(function(result){
    console.log(result);
})