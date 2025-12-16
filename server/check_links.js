const Parser = require('rss-parser');
const parser = new Parser();

const FEED_URLS = [
    'https://www.fiercepharma.com/rss/marketing/xml',
    'https://www.fiercepharma.com/rss/xml'
];

async function checkLinks() {
    const feedPromises = FEED_URLS.map(url => parser.parseURL(url));
    const feeds = await Promise.all(feedPromises);

    let allItems = [];
    feeds.forEach(feed => {
        allItems = allItems.concat(feed.items);
    });

    allItems.forEach((item, index) => {
        if (typeof item.link !== 'string' || !item.link.startsWith('http')) {
            console.log(`Item ${index} has invalid link:`, item.link);
        }
    });
    console.log(`Checked ${allItems.length} items.`);
}

checkLinks();
