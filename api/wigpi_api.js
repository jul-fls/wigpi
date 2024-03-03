require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const app = express();
const port = parseInt(process.env.API_PORT) || 3000;
let root_path = process.env.root_path || process.cwd();

app.use('/api/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const classesRouteGetJson = require('./routes/classes/get_json');
const coursesRouteGetIcs = require('./routes/courses/get_ics');
const coursesRouteGetJson = require('./routes/courses/get_json');
const coursesRouteGetPng = require('./routes/courses/get_png');
const dataRouteCoursesData = require('./routes/data/courses_data');

app.use('/api/classes/get_json', classesRouteGetJson);
app.use('/api/get_ics', coursesRouteGetIcs);
app.use('/api/courses/get_json', coursesRouteGetJson);
app.use('/api/courses/get_png', coursesRouteGetPng);
app.use('/api/data/courses_data', dataRouteCoursesData);

//create a route '/' for the home page which will render the index.html file and fill it with the classes.json file
app.get('/', (req, res) => {
    $classes = fs.readFileSync(root_path + "/api/classes.json", 'utf8');
    $classes = JSON.parse($classes);
    $html = fs.readFileSync(root_path + "/api/index.html", 'utf8');
    $data = [];
    for(var i = 0; i < $classes.length; i++){
        $data.push({
            "name": $classes[i].name,
            "displayname": $classes[i].displayname
        });
    }
    $html = $html.replace("{{classes}}", JSON.stringify($data));
    res.type('text/html');
    res.send($html);
})

app.listen(port, () => {
    console.log(`Wigpi api is listening at http://localhost:${port}/api`)
})