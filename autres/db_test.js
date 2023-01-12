// var db = require('./dbLib.js');
var $sql = "";
for($i=0;$i<$cleaned_cours_week.length;$i++){
    $cleaned_cours_week[$i].dtdbstart = $cleaned_cours_week[$i].dtstart.substring(0,4) + "-" + $cleaned_cours_week[$i].dtstart.substring(4,6) + "-" + $cleaned_cours_week[$i].dtstart.substring(6,8) + " " + $cleaned_cours_week[$i].dtstart.substring(9,11) + ":" + $cleaned_cours_week[$i].dtstart.substring(11,13) + ":" + $cleaned_cours_week[$i].dtstart.substring(13,15);
    $cleaned_cours_week[$i].dtdbend = $cleaned_cours_week[$i].dtend.substring(0,4) + "-" + $cleaned_cours_week[$i].dtend.substring(4,6) + "-" + $cleaned_cours_week[$i].dtend.substring(6,8) + " " + $cleaned_cours_week[$i].dtend.substring(9,11) + ":" + $cleaned_cours_week[$i].dtend.substring(11,13) + ":" + $cleaned_cours_week[$i].dtend.substring(13,15);
    if($i+1<$cleaned_cours_week.length){
        $sql += "('" + $cleaned_cours_week[$i].uid + "','" + $cleaned_cours_week[$i].dtdbstart + "','" + $cleaned_cours_week[$i].dtdbend + "','" + $cleaned_cours_week[$i].prof + "','" + $cleaned_cours_week[$i].matiere + "','" + $cleaned_cours_week[$i].salle + "'),";
    }else{
        $sql += "('" + $cleaned_cours_week[$i].uid + "','" + $cleaned_cours_week[$i].dtdbstart + "','" + $cleaned_cours_week[$i].dtdbend + "','" + $cleaned_cours_week[$i].prof + "','" + $cleaned_cours_week[$i].matiere + "','" + $cleaned_cours_week[$i].salle + "')";
    }
}
// db.query("INSERT INTO cours (uid,start,end,prof,matiere,salle) VALUES "+$sql)
//     .then(function(result){
//         console.log("Cours ajouté");
//     })
// return $cleaned_cours_week;