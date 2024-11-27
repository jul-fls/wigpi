require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const port = process.env.PORT || 3000;
const env = process.env.ENV || 'dev';

// Vérification de l'existence du fichier paths.js
const pathsFile = path.join(__dirname, '../config/paths.js');
if (!fs.existsSync(pathsFile)) {
    console.error(`Le fichier ${pathsFile} n'existe pas`);
    console.error('Contenu du répertoire config:', fs.readdirSync(path.join(__dirname, '../config')));
    process.exit(1);
}

const paths = require('../config/paths');

// Set the correct host based on the environment
try {
    if (env === 'dev') {
        swaggerDocument.host = `localhost:${port}`;
        swaggerDocument.schemes = ['http'];
    } else if (env === 'prod') {
        swaggerDocument.host = process.env.EXTERNAL_DOMAIN.split('://')[1];
        swaggerDocument.schemes = [process.env.EXTERNAL_DOMAIN.split('://')[0]];
    }
} catch (error) {
    console.error("Erreur lors de la configuration de Swagger:", error.message);
}

//// DOCS ROUTE ////
try {
    app.use('/api/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
    console.error("Erreur lors de la configuration de Swagger UI:", error.message);
}
//// DOCS ROUTE ////

//// API ROUTES ////
const loadRoute = (routePath, routeName) => {
    try {
        const route = require(routePath);
        return route;
    } catch (error) {
        console.error(`Erreur lors du chargement de la route ${routeName}:`, error.message);
        return null; // Return null if the route fails to load
    }
};

// Define API routes and add them only if successfully loaded
const apiRoutes = [
    { path: '/api/classes/get_json', route: 'classes/get_json', name: 'Classes Get JSON' },
    { path: '/api/courses/get_ics', route: 'courses/get_ics', name: 'Courses Get ICS' },
    { path: '/api/courses/get_json', route: 'courses/get_json', name: 'Courses Get JSON' },
    { path: '/api/courses/get_png', route: 'courses/get_png', name: 'Courses Get PNG' },
    { path: '/api/courses/get_html', route: 'courses/get_html', name: 'Courses Get HTML' },
    { path: '/api/courses/get_html_calendar', route: 'courses/get_html_calendar', name: 'Courses Get HTML Calendar' },
    { path: '/api/data/courses_data', route: 'data/api/courses_data_api', name: 'Courses Data API' },
    { path: '/api/teachers/check_if_email_exists', route: 'teachers/check_if_email_exists', name: 'Check If Email Exists' },
    { path: '/api/system/refresh_edt', route: 'system/refresh_edt', name: 'System Refresh EDT' },
    { path: '/api/system/post_discord_edt', route: 'system/post_discord_edt', name: 'System Post Discord EDT' },
    { path: '/api/system/check_locks', route: 'system/check_locks', name: 'System Check Locks' }
];

apiRoutes.forEach(apiRoute => {
    const loadedRoute = loadRoute(path.join(paths.api.routes, apiRoute.route), apiRoute.name);
    if (loadedRoute) {
        app.use(apiRoute.path, loadedRoute);
    }
});
//// API ROUTES ////

//// FRONT-END ROUTES ////
const frontEndRoutes = [
    { path: '/', route: 'front/homepage/index', name: 'Homepage' },
    { path: '/data/', route: 'front/courses_data/courses_data_front', name: 'Courses Data Front' }
];

frontEndRoutes.forEach(frontRoute => {
    const loadedRoute = loadRoute(path.join(paths.api.routes, frontRoute.route), frontRoute.name);
    if (loadedRoute) {
        app.use(frontRoute.path, loadedRoute);
    }
});

// Static front-end route
try {
    app.use('/api/front/courses_data/public', express.static(path.join(paths.api.routes, 'front', 'courses_data', 'public')));
} catch (error) {
    console.error("Erreur lors de la configuration de la route statique:", error.message);
}
//// FRONT-END ROUTES ////

// Global error handler middleware to catch errors in routes and continue
app.use((err, req, res, next) => {
    console.error("Erreur survenue:", err.message);
    res.status(500).json({ error: "Une erreur est survenue. Veuillez réessayer plus tard." });
});

// APP LISTEN //
app.listen(port, () => {
    console.log(`Wigpi api is listening at ${swaggerDocument.schemes[0]}://${swaggerDocument.host}${swaggerDocument.basePath || ''}`);
});
