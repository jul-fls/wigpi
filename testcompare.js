require('dotenv').config();
const fs = require('fs');
const compare = require('./compareLib.js');
$json = fs.readFileSync(process.env.ROOT_PATH + "api/classes.json");
$classes = JSON.parse($json);
compare.compareClasses($classes, process.env.ROOT_PATH);