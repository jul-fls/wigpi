require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const app = express();
const port = parseInt(process.env.API_PORT) || 3000;
let root_path = process.env.root_path || process.cwd();

//// DOCS ROUTE ////
app.use('/api/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
//// DOCS ROUTE ////



//// API ROUTES ////
const classesRouteGetJson = require('./routes/classes/get_json');
const coursesRouteGetIcs = require('./routes/courses/get_ics');
const coursesRouteGetJson = require('./routes/courses/get_json');
const coursesRouteGetPng = require('./routes/courses/get_png');
const coursesRouteGetHtml = require('./routes/courses/get_html');
const dataRouteCoursesDataAPI = require('./routes/data/api/courses_data_api');
const teachersRouteCheckIfEmailExists = require('./routes/teachers/check_if_email_exists');
const systemRouteRefreshEdt = require('./routes/system/refresh_edt');
const systemRoutePostDiscordEdt = require('./routes/system/post_discord_edt');

app.use('/api/classes/get_json', classesRouteGetJson);
app.use('/api/courses/get_ics', coursesRouteGetIcs);
app.use('/api/courses/get_json', coursesRouteGetJson);
app.use('/api/courses/get_png', coursesRouteGetPng);
app.use('/api/courses/get_html', coursesRouteGetHtml);
app.use('/api/data/courses_data', dataRouteCoursesDataAPI);
app.use('/api/teachers/check_if_email_exists', teachersRouteCheckIfEmailExists);
app.use('/api/system/refresh_edt', systemRouteRefreshEdt);
app.use('/api/system/post_discord_edt', systemRoutePostDiscordEdt);
//// API ROUTES ////



//// FRONT-END ROUTES ////
const homepageRoute = require('./routes/front/homepage/index');
const dataRouteCoursesDataFront = require('./routes/front/courses_data/courses_data_front');

app.use('/', homepageRoute);
app.use('/data/', dataRouteCoursesDataFront);
app.use('/api/front/courses_data/public', express.static(path.join(__dirname, 'routes/front/courses_data/public')));
//// FRONT-END ROUTES ////



// APP LISTEN //
app.listen(port, () => {
    console.log(`Wigpi api is listening at http://localhost:${port}/api`)
})