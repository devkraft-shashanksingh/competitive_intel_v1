const Parser = require('rss-parser');
const parser = new Parser();

const FEED_URLS = [
    'https://www.fiercepharma.com/rss/marketing/xml',
    'https://www.fiercepharma.com/rss/xml'
];

// In-memory vote store reference (passed from index.js or shared)
// For simplicity, we'll just fetch and normalize here. 
// Votes are attached in the main route, but for AI we might just need content.

const fetchAndNormalizeFeeds = async (category = 'all') => {
    let urlsToFetch = [];
    if (category === 'marketing') {
        urlsToFetch = ['https://www.fiercepharma.com/rss/marketing/xml'];
    } else {
        urlsToFetch = FEED_URLS;
    }

    const feedPromises = urlsToFetch.map(url => parser.parseURL(url));
    const feeds = await Promise.all(feedPromises);

    const seenLinks = new Set();
    let allItems = [];

    feeds.forEach(feed => {
        feed.items.forEach(item => {
            if (!seenLinks.has(item.link)) {
                seenLinks.add(item.link);
                allItems.push(item);
            }
        });
    });

    // Sort by pubDate descending
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Normalize data
    return allItems.map(item => {
        // Normalize title
        let title = item.title;
        if (typeof title === 'object' && title !== null) {
            if (title.a && title.a[0] && title.a[0]._) {
                title = title.a[0]._;
            } else if (title._) {
                title = title._;
            }
        }

        // Normalize creator
        let creator = item.creator || item['dc:creator'];
        if (typeof creator === 'object' && creator !== null) {
            if (creator.a && creator.a[0] && creator.a[0]._) {
                creator = creator.a[0]._;
            } else if (creator._) {
                creator = creator._;
            }
        }

        return {
            ...item,
            title: typeof title === 'string' ? title : 'Untitled',
            creator: typeof creator === 'string' ? creator : 'Unknown',
        };
    });
};

module.exports = { fetchAndNormalizeFeeds };
