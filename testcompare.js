require('dotenv').config();
const fs = require('fs');
const path = require('path');
const compare = require('./libs/compareLib.js');
const paths = require('./config/paths');

// Lecture du fichier de configuration des classes
const $json = fs.readFileSync(path.join(paths.config, 'classes.json'));
const $classes = JSON.parse($json);

compare.compareClasses($classes, paths.root);