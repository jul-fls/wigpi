const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const paths = require('../../../config/paths');

// Load API keys
const apiKeysFilePath = path.join(paths.config, 'apiKeys.json');
const apiKeys = JSON.parse(fs.readFileSync(apiKeysFilePath, 'utf8'));

// Function to redirect logs to a specific file
function redirectLogsToFile(logFilePath) {
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    console.log = (...args) => {
        const message = args.join(' ') + '\n';
        logStream.write(message);
    };

    return () => {
        console.log = (...args) => {
            process.stdout.write(args.join(' ') + '\n');
        };
        logStream.end();
    };
}

router.get('/', (req, res) => {
    const apiKey = req.query.apiKey;

    // Validate API key
    const validKey = apiKeys.keys.find(key => key.value === apiKey && key.status === 'active');
    if (!validKey) {
        return res.status(403).json({ error: 'Invalid or inactive API key' });
    }

    const lockDirPath = paths.output.lock;
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const logFilePath = path.join(paths.logs, 'lock_check.log');
    const restoreConsole = redirectLogsToFile(logFilePath);
    const expiredLocks = [];

    console.log(`[LOCK CHECK INITIATED] - ${new Date().toLocaleString('fr-FR', { hour12: false })}`);

    fs.readdir(lockDirPath, (err, files) => {
        if (err) {
            console.error("Failed to read lock files directory:", err);
            restoreConsole();
            return res.status(500).json({ error: 'Error reading lock files directory' });
        }

        files.forEach(file => {
            const lockFilePath = path.join(lockDirPath, file);

            if (fs.existsSync(lockFilePath)) {
                const lockState = fs.readFileSync(lockFilePath, 'utf8').trim();
                const stats = fs.statSync(lockFilePath);
                
                if (lockState === '1' && stats.mtimeMs < thirtyMinutesAgo) {
                    console.log(`[EXPIRED LOCK DETECTED] - ${file} has been locked for over 30 minutes.`);
                    expiredLocks.push(file);
                    fs.writeFileSync(lockFilePath, '0'); // Unlock the file
                }
            }
        });

        // Respond and log results
        const responseMessage = expiredLocks.length > 0
            ? `Expired locks found and unlocked: ${expiredLocks.join(', ')}`
            : 'No expired locks found';

        console.log(`[LOCK CHECK COMPLETE] - ${responseMessage}`);
        restoreConsole();
        
        res.json({
            message: responseMessage,
            unlockedLocks: expiredLocks
        });
    });
});

module.exports = router;
