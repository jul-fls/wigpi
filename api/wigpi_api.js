require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Vérification de l'existence du fichier paths.js
const pathsFile = path.join(__dirname, '../config/paths.js');
if (!fs.existsSync(pathsFile)) {
    console.error(`Le fichier ${pathsFile} n'existe pas`);
    console.error('Contenu du répertoire config:', fs.readdirSync(path.join(__dirname, '../config')));
    process.exit(1);
}

const paths = require('../config/paths');
const app = express();
const port = process.env.PORT || 3000;
const env = process.env.ENV || 'dev';

// Set the correct host based on the environment
if (env === 'dev') {
    swaggerDocument.host = `localhost:${port}`;
    swaggerDocument.schemes = ['http'];
} else if (env === 'prod') {
    swaggerDocument.host = process.env.EXTERNAL_DOMAIN.split('://')[1];
    swaggerDocument.schemes = [process.env.EXTERNAL_DOMAIN.split('://')[0]];
}

//// DOCS ROUTE ////
app.use('/api/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
//// DOCS ROUTE ////



//// API ROUTES ////
const classesRouteGetJson = require(path.join(paths.api.routes, 'classes', 'get_json'));
const coursesRouteGetIcs = require(path.join(paths.api.routes, 'courses', 'get_ics'));
const coursesRouteGetJson = require(path.join(paths.api.routes, 'courses', 'get_json'));
const coursesRouteGetPng = require(path.join(paths.api.routes, 'courses', 'get_png'));
const coursesRouteGetHtml = require(path.join(paths.api.routes, 'courses', 'get_html'));
const dataRouteCoursesDataAPI = require(path.join(paths.api.routes, 'data', 'api', 'courses_data_api'));
const teachersRouteCheckIfEmailExists = require(path.join(paths.api.routes, 'teachers', 'check_if_email_exists'));
const systemRouteRefreshEdt = require(path.join(paths.api.routes, 'system', 'refresh_edt'));
const systemRoutePostDiscordEdt = require(path.join(paths.api.routes, 'system', 'post_discord_edt'));
const systemRouteCheckLocks = require(path.join(paths.api.routes, 'system', 'check_locks'));

app.use('/api/classes/get_json', classesRouteGetJson);
app.use('/api/courses/get_ics', coursesRouteGetIcs);
app.use('/api/courses/get_json', coursesRouteGetJson);
app.use('/api/courses/get_png', coursesRouteGetPng);
app.use('/api/courses/get_html', coursesRouteGetHtml);
app.use('/api/data/courses_data', dataRouteCoursesDataAPI);
app.use('/api/teachers/check_if_email_exists', teachersRouteCheckIfEmailExists);
app.use('/api/system/refresh_edt', systemRouteRefreshEdt);
app.use('/api/system/post_discord_edt', systemRoutePostDiscordEdt);
app.use('/api/system/check_locks', systemRouteCheckLocks);
//// API ROUTES ////



//// FRONT-END ROUTES ////
const homepageRoute = require(path.join(paths.api.routes, 'front', 'homepage', 'index'));
const dataRouteCoursesDataFront = require(path.join(paths.api.routes, 'front', 'courses_data', 'courses_data_front'));

app.use('/', homepageRoute);
app.use('/data/', dataRouteCoursesDataFront);
app.use('/api/front/courses_data/public', express.static(path.join(paths.api.routes, 'front', 'courses_data', 'public')));
//// FRONT-END ROUTES ////



// APP LISTEN //
app.listen(port, () => {
    console.log(`Wigpi api is listening at ${swaggerDocument.schemes[0]}://${swaggerDocument.host}${swaggerDocument.basePath}`);
});