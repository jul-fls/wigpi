const path = require('path');

// Chemin racine du projet (un niveau au-dessus de config/)
const rootDir = path.join(__dirname, '..');

module.exports = {
  root: rootDir,
  config: path.join(rootDir, 'config'),
  output: {
    ics: path.join(rootDir, 'output', 'icsFiles'),
    json: path.join(rootDir, 'output', 'jsonFiles'),
    oldJson: path.join(rootDir, 'output', 'oldjsonFiles'),
    png: path.join(rootDir, 'output', 'pngFiles'),
    lock: path.join(rootDir, 'output', 'lockFiles'),
    html: path.join(rootDir, 'output', 'htmlFiles')
  },
  logs: path.join(rootDir, 'logs'),
  api: {
    routes: path.join(rootDir, 'api', 'routes')
  }
};