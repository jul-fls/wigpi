const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));
const cheerio = require('cheerio');

async function getMetaRefreshUrl(url) {
    await fetch(url)
        .then(response => response.text())
        .then(body => {
            $body = body;
        })
        .catch(error => {
            console.error('Une erreur s\'est produite lors de l\'accès à l\'url ' + url + "\nErreur: " + error);
        });
        const $ = cheerio.load($body);
        const content = $("meta[http-equiv='refresh']").attr("content");
        const refreshUrl = content.split("0; URL=")[1].trim();
        return refreshUrl;
}
module.exports = {
    getMetaRefreshUrl: getMetaRefreshUrl
};