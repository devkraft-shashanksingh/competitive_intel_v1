require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const { fetchAndNormalizeFeeds } = require('./utils/rssFetcher');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key', // Fallback to avoid crash on init
});

app.get('/', (req, res) => {
  res.send('Pharma RSS Backend is running. API available at /api/pharma-feed');
});

// In-memory vote store
// Structure: { "link": { up: 0, down: 0, title: "Article Title" } }
const votes = {};

// In-memory prompt history store with linked article titles
// Structure: [{ prompt: "...", timestamp: "...", matchedTitles: ["title1", "title2"] }]
const promptHistory = [];

// In-memory interest storage
// Structure: { 
//   interests: [{ id: "uuid", topic: "Oncology", category: "Marketing", description: "...", createdAt: "...", source: "manual|suggested" }],
//   suggestions: [{ id: "uuid", topic: "...", category: "...", description: "...", confidence: 0.8, basedOn: "search|upvote" }]
// }
const userInterests = {
  interests: [],
  suggestions: []
};

app.get('/api/pharma-feed', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    const enrichedItems = await fetchAndNormalizeFeeds(category);

    // Attach vote counts
    const itemsWithVotes = enrichedItems.map(item => {
      const link = item.link;
      if (!votes[link]) {
        votes[link] = { up: 0, down: 0 };
      }
      return {
        ...item,
        votes: votes[link]
      };
    });

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedItems = itemsWithVotes.slice(startIndex, endIndex);

    res.json({
      items: paginatedItems,
      total: itemsWithVotes.length,
      page,
      totalPages: Math.ceil(itemsWithVotes.length / limit)
    });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    res.status(500).json({ error: 'Failed to fetch feeds' });
  }
});

app.post('/api/ai-filter', async (req, res) => {
  const { prompt, category } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Store prompt in history with matched titles
  const matchedTitles = [];

  promptHistory.push({
    prompt: prompt,
    timestamp: new Date().toISOString(),
    matchedTitles: matchedTitles // Will be populated after AI response
  });

  try {
    // 1. Fetch all articles
    const articles = await fetchAndNormalizeFeeds(category || 'all');

    // 2. Prepare context for AI (limit to top 50 to save tokens if needed)
    const articlesContext = articles.slice(0, 50).map((a, index) => ({
      id: index,
      title: a.title,
      summary: a.contentSnippet || a.summary,
      link: a.link
    }));

    // 3. Call OpenAI
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      // Mock response if no key
      console.log('No API Key found, returning mock response');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay

      const mockMatches = articlesContext.slice(0, 5);
      // Store matched titles in history
      promptHistory[promptHistory.length - 1].matchedTitles = mockMatches.map(a => a.title);

      return res.json({
        matches: mockMatches.map(a => ({
          link: a.link,
          reason: 'Mock match: This article seems relevant to your query (Demo Mode).'
        }))
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o as requested (closest to "gpt 5" quality)
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that filters news articles based on user interest. Return a JSON object with a key 'matches' containing a list of objects. Each object must have 'link' (exact URL from input) and 'reason' (short explanation)."
        },
        {
          role: "user",
          content: `User Prompt: "${prompt}"\n\nArticles:\n${JSON.stringify(articlesContext)}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Store matched titles in history
    const matchedArticles = result.matches.map(match => {
      const article = articles.find(a => a.link === match.link);
      return article ? article.title : null;
    }).filter(Boolean);

    promptHistory[promptHistory.length - 1].matchedTitles = matchedArticles;

    // Enrich matches with full article data
    const enrichedMatches = result.matches.map(match => {
      const originalArticle = articles.find(a => a.link === match.link);
      return {
        ...originalArticle,
        ...match, // includes reason
        votes: votes[match.link] || { up: 0, down: 0 }
      };
    });

    res.json({ matches: enrichedMatches });

  } catch (error) {
    console.error('Error in AI filter:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

app.get('/api/recommendations', async (req, res) => {
  try {
    // 1. Get upvoted article titles (with vote counts)
    const upvotedTitles = Object.values(votes)
      .filter(v => v.up > 0)
      .sort((a, b) => b.up - a.up)
      .slice(0, 10)
      .map(v => ({ title: v.title, upvotes: v.up }));

    // 2. Get titles from prompt history (last 10 prompts)
    const recentPrompts = promptHistory.slice(-10);
    const promptTitles = recentPrompts
      .flatMap(p => p.matchedTitles || [])
      .filter((title, index, self) => self.indexOf(title) === index) // Unique titles
      .slice(0, 20); // Max 20 titles from prompts

    // 3. Include user interests in the context
    const userInterestContext = userInterests.interests.map(i => i.description).join(', ');

    if (upvotedTitles.length === 0 && promptTitles.length === 0 && userInterests.interests.length === 0) {
      return res.json({
        matches: [],
        message: 'No upvotes, search history, or interests found. Try upvoting articles, searching, or adding interests first!'
      });
    }

    // 4. Fetch current articles (candidates)
    const allArticles = await fetchAndNormalizeFeeds('all');

    // 5. Filter out articles user already interacted with
    const upvotedTitleSet = new Set(upvotedTitles.map(v => v.title));
    const promptTitleSet = new Set(promptTitles);
    const candidateArticles = allArticles.filter(a =>
      !upvotedTitleSet.has(a.title) && !promptTitleSet.has(a.title)
    );

    // 6. Prepare TITLE-ONLY context (massive token savings!)
    const candidateTitles = candidateArticles.slice(0, 50).map(a => ({
      title: a.title,
      link: a.link
    }));

    // 7. Determine optimal recommendation count
    const dataPoints = upvotedTitles.length + promptTitles.length + userInterests.interests.length;
    const optimalCount = Math.min(15, Math.max(3, Math.floor(dataPoints * 0.5)));

    // 8. Build context summary
    const contextSummary = {
      upvotedTitles: upvotedTitles.map(v => v.title),
      searchedTopics: recentPrompts.map(p => p.prompt),
      articlesFromSearches: promptTitles,
      userInterests: userInterestContext
    };

    // 9. Call OpenAI with TITLES ONLY
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      console.log('No API Key found, returning mock recommendations');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return res.json({
        matches: candidateArticles.slice(0, optimalCount).map((article, i) => ({
          ...article,
          smartTag: ['Pharma Industry News', 'Drug Development Updates', 'Clinical Trial Insights', 'Healthcare Innovation'][i % 4],
          votes: votes[article.link] || { up: 0, down: 0 }
        })),
        metadata: {
          basedOnUpvotes: upvotedTitles.length,
          basedOnSearches: recentPrompts.length,
          basedOnInterests: userInterests.interests.length,
          recommendationCount: optimalCount
        }
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a smart recommendation engine. Analyze the user's interests based on article TITLES they upvoted, searched for, and their saved interests. Find ${optimalCount} most relevant article TITLES from candidates. Return JSON with 'matches' array containing 'link' and 'smartTag' (EXACTLY 3-4 words describing why this article matches, e.g., 'Oncology Treatment News', 'Cancer Drug Updates'). Do NOT include long explanations, only the smartTag.`
        },
        {
          role: "user",
          content: `User Context:\n${JSON.stringify(contextSummary, null, 2)}\n\nCandidate Article Titles:\n${JSON.stringify(candidateTitles)}\n\nFind exactly ${optimalCount} best matches with smart tags.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // 10. Enrich with full article data
    const enrichedMatches = result.matches.map(match => {
      const article = allArticles.find(a => a.link === match.link);
      return {
        ...article,
        smartTag: match.smartTag,
        votes: votes[match.link] || { up: 0, down: 0 }
      };
    }).filter(Boolean);

    res.json({
      matches: enrichedMatches,
      metadata: {
        basedOnUpvotes: upvotedTitles.length,
        basedOnSearches: recentPrompts.length,
        basedOnSearchMatches: promptTitles.length,
        basedOnInterests: userInterests.interests.length,
        recommendationCount: enrichedMatches.length,
        tokensSaved: "~70% (titles only)"
      }
    });

  } catch (error) {
    console.error('Error in recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.post('/api/vote', (req, res) => {
  const { link, type, title } = req.body;

  if (!link || !['up', 'down'].includes(type)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (!votes[link]) {
    votes[link] = { up: 0, down: 0, title: title || 'Unknown' };
  }

  votes[link][type]++;

  // Update title if provided
  if (title && !votes[link].title) {
    votes[link].title = title;
  }

  res.json(votes[link]);
});

// Interest Management Endpoints

// Extract interests from user behavior (searches, upvotes)
app.post('/api/interests/extract', async (req, res) => {
  const { prompt, context } = req.body; // context: 'search' | 'upvote'

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Use OpenAI to extract topics and generate smart suggestions
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      // Mock response
      const mockSuggestions = [
        {
          id: `sugg-${Date.now()}-1`,
          topic: 'Oncology',
          category: 'Marketing',
          smartTag: 'Oncology Marketing Updates',
          badgeTag: 'Pharma Industry Insights',
          description: 'Marketing updates in Oncology',
          confidence: 0.9,
          basedOn: context || 'search'
        },
        {
          id: `sugg-${Date.now()}-2`,
          topic: 'Oncology',
          category: 'Research',
          smartTag: 'Cancer Research News',
          badgeTag: 'Medical Innovation Trends',
          description: "What's new in Oncology research",
          confidence: 0.85,
          basedOn: context || 'search'
        }
      ];

      // Add to suggestions if not already present
      if (req.body.save !== false) {
        mockSuggestions.forEach(sugg => {
          const exists = userInterests.suggestions.find(s =>
            s.topic === sugg.topic && s.category === sugg.category
          );
          if (!exists) {
            userInterests.suggestions.push(sugg);
          }
        });
      }

      return res.json({ suggestions: mockSuggestions });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an intelligent interest extraction system. Analyze the user's search prompt and extract key topics/domains. Generate 2-3 smart interest suggestions. Return JSON with 'suggestions' array containing objects with: 'topic' (main subject like Oncology), 'category' (aspect like Marketing/Research/Clinical), 'smartTag' (EXACTLY 3-4 words for the main title, e.g., 'Oncology Marketing Updates', 'Cancer Care News'), 'badgeTag' (EXACTLY 3-4 words for a complementary badge label, e.g., 'Pharma Industry Insights', 'Healthcare Innovation News'), 'description' (user-friendly full text), 'confidence' (0-1 score). Both smartTag and badgeTag MUST be 3-4 words only."
        },
        {
          role: "user",
          content: `User ${context || 'search'}: "${prompt}"\n\nGenerate relevant interest suggestions with smart tags and badge tags.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Add IDs and metadata
    const suggestions = result.suggestions.map(sugg => ({
      ...sugg,
      id: `sugg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      basedOn: context || 'search'
    }));

    // Add to suggestions if not already present
    if (req.body.save !== false) {
      suggestions.forEach(sugg => {
        const exists = userInterests.suggestions.find(s =>
          s.topic === sugg.topic && s.category === sugg.category
        );
        if (!exists) {
          userInterests.suggestions.push(sugg);
        }
      });
    }

    res.json({ suggestions });

  } catch (error) {
    console.error('Error extracting interests:', error);
    res.status(500).json({ error: 'Failed to extract interests' });
  }
});

// Get all interests and suggestions
app.get('/api/interests', (req, res) => {
  res.json(userInterests);
});

// Add/Accept an interest
app.post('/api/interests', (req, res) => {
  const { topic, category, smartTag, badgeTag, description, source } = req.body;

  if (!topic || !description) {
    return res.status(400).json({ error: 'Topic and description are required' });
  }

  const newInterest = {
    id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    topic,
    category: category || 'General',
    smartTag: smartTag || category || 'General',
    badgeTag: badgeTag || smartTag || category || 'General',
    description,
    customPrompt: "I am a weekly content summarizer focused on your interests. For each article, I provide a clear bullet-point summary highlighting the key insights, along with a direct option to navigate to the full article. Additionally, I include a dedicated section explaining how the article relates to your prompt or area of interest, helping you quickly assess its relevance.",
    createdAt: new Date().toISOString(),
    source: source || 'manual'
  };

  userInterests.interests.push(newInterest);

  // If accepting a suggestion, remove it from suggestions
  if (source === 'suggested') {
    userInterests.suggestions = userInterests.suggestions.filter(s =>
      !(s.topic === topic && s.category === category)
    );
  }

  res.json(newInterest);
});

// Update an interest
app.put('/api/interests/:id', (req, res) => {
  const { id } = req.params;
  const { topic, category, description, customPrompt } = req.body;

  const interestIndex = userInterests.interests.findIndex(i => i.id === id);

  if (interestIndex === -1) {
    return res.status(404).json({ error: 'Interest not found' });
  }

  userInterests.interests[interestIndex] = {
    ...userInterests.interests[interestIndex],
    topic: topic || userInterests.interests[interestIndex].topic,
    smartTag: topic || userInterests.interests[interestIndex].smartTag, // Update smartTag to match topic
    category: category || userInterests.interests[interestIndex].category,
    description: description || userInterests.interests[interestIndex].description,
    customPrompt: customPrompt || userInterests.interests[interestIndex].customPrompt, // Save customPrompt
    updatedAt: new Date().toISOString()
  };

  res.json(userInterests.interests[interestIndex]);
});

// Delete an interest
app.delete('/api/interests/:id', (req, res) => {
  const { id } = req.params;

  const initialLength = userInterests.interests.length;
  userInterests.interests = userInterests.interests.filter(i => i.id !== id);

  if (userInterests.interests.length === initialLength) {
    return res.status(404).json({ error: 'Interest not found' });
  }

  res.json({ success: true, message: 'Interest deleted' });
});

// Dismiss a suggestion
app.delete('/api/interests/suggestions/:id', (req, res) => {
  const { id } = req.params;

  const initialLength = userInterests.suggestions.length;
  userInterests.suggestions = userInterests.suggestions.filter(s => s.id !== id);

  if (userInterests.suggestions.length === initialLength) {
    return res.status(404).json({ error: 'Suggestion not found' });
  }

  res.json({ success: true, message: 'Suggestion dismissed' });
});

// Weekly Update - Get articles grouped by interests with AI summaries
app.get('/api/weekly-update', async (req, res) => {
  try {
    // 1. Get all articles from the last 7 days (or all if dates are unavailable)
    const allArticles = await fetchAndNormalizeFeeds('all');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentArticles = allArticles.filter(article => {
      if (!article.pubDate && !article.isoDate) {
        return true;
      }
      const articleDate = new Date(article.pubDate || article.isoDate);
      return isNaN(articleDate.getTime()) || articleDate >= sevenDaysAgo;
    });

    // 2. Get user interests
    const interests = userInterests.interests;

    console.log(`[Weekly Update] Found ${interests.length} interests`);
    console.log(`[Weekly Update] Found ${recentArticles.length} recent articles`);

    if (interests.length === 0) {
      return res.json({ updates: [] });
    }

    // 3. For each interest, find relevant articles and generate summaries
    const updates = [];

    for (const interest of interests) {
      console.log(`[Weekly Update] Processing interest: ${interest.smartTag || interest.topic}`);
      const update = await generateInterestUpdate(interest, recentArticles);
      if (update) {
        updates.push(update);
      }
    }

    console.log(`[Weekly Update] Returning ${updates.length} interest groups with summaries`);
    res.json({ updates });

  } catch (error) {
    console.error('Error generating weekly update:', error);
    res.status(500).json({ error: 'Failed to generate weekly update' });
  }
});

// Regenerate update for a single interest
app.post('/api/weekly-update/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params;
    const interest = userInterests.interests.find(i => i.id === id);

    if (!interest) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    // Get recent articles
    const allArticles = await fetchAndNormalizeFeeds('all');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentArticles = allArticles.filter(article => {
      if (!article.pubDate && !article.isoDate) {
        return true;
      }
      const articleDate = new Date(article.pubDate || article.isoDate);
      return isNaN(articleDate.getTime()) || articleDate >= sevenDaysAgo;
    });

    console.log(`[Regenerate] Processing interest: ${interest.smartTag || interest.topic}`);
    const update = await generateInterestUpdate(interest, recentArticles);

    if (!update) {
      return res.json({ update: null, message: "No relevant articles found" });
    }

    res.json({ update });

  } catch (error) {
    console.error('Error regenerating update:', error);
    res.status(500).json({ error: 'Failed to regenerate update' });
  }
});

// Helper function to generate update for a single interest
async function generateInterestUpdate(interest, recentArticles) {
  // Find articles matching this interest using AI
  const interestContext = `${interest.smartTag || interest.topic} - ${interest.description}`;

  // Use AI to find relevant articles (max 5 per interest)
  let relevantArticles = [];

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
    relevantArticles = recentArticles.slice(0, 3);
  } else {
    const articleTitles = recentArticles.slice(0, 50).map(a => ({ title: a.title, link: a.link }));

    try {
      const matchCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an article relevance analyzer. Given a user interest and a list of article titles, identify the most relevant articles. Return JSON with 'matches' array containing 'link' for each relevant article (max 5).`
          },
          {
            role: "user",
            content: `Interest: ${interestContext}\n\nArticles:\n${JSON.stringify(articleTitles)}\n\nFind up to 5 most relevant articles.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const matchResult = JSON.parse(matchCompletion.choices[0].message.content);
      const matchedLinks = matchResult.matches?.map(m => m.link) || [];
      relevantArticles = recentArticles.filter(a => matchedLinks.includes(a.link));
    } catch (err) {
      console.error("Error matching articles:", err);
      relevantArticles = recentArticles.slice(0, 3); // Fallback
    }
  }

  console.log(`[Weekly Update] Found ${relevantArticles.length} relevant articles for ${interest.smartTag || interest.topic}`);

  if (relevantArticles.length === 0) return null;

  // Generate AI summaries for each article
  const articlesWithSummaries = [];

  for (const article of relevantArticles.slice(0, 5)) {
    // console.log(`[Weekly Update] Generating summary for: ${article.title}`);
    let aiSummaryData = {};

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_api_key_here') {
      // Mock summary
      aiSummaryData = {
        summary: ["Key insight about industry trends.", "Emerging opportunities in this sector.", "Impact on current market dynamics."],
        relevance: `This article is directly relevant to ${interest.topic} as it covers new marketing strategies.`
      };
    } else {
      // Generate real summary using GPT
      try {
        const summaryCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert analyst. ${interest.customPrompt || "I am a weekly content summarizer focused on your interests. For each article, I provide a clear bullet-point summary highlighting the key insights, along with a direct option to navigate to the full article. Additionally, I include a dedicated section explaining how the article relates to your prompt or area of interest, helping you quickly assess its relevance."}
                
                For the given article and user interest, provide a JSON response with:
                1. 'summary': An array of 3-5 concise bullet points summarizing the key insights.
                2. 'relevance': A short explanation (1-2 sentences) of how this article relates to the user's interest ("${interestContext}").`
            },
            {
              role: "user",
              content: `Article Title: ${article.title}\nContent: ${article.contentSnippet || article.summary || 'No content available'}`
            }
          ],
          response_format: { type: "json_object" },
        });

        aiSummaryData = JSON.parse(summaryCompletion.choices[0].message.content);
      } catch (err) {
        console.error("Error generating summary:", err);
        aiSummaryData = {
          summary: ["Summary generation failed, please try again."],
          relevance: "Relevance unavailable."
        };
      }
    }

    articlesWithSummaries.push({
      title: article.title,
      summary: aiSummaryData.summary || [], // Array of strings
      relevance: aiSummaryData.relevance || "",
      link: article.link,
      date: article.pubDate || article.isoDate,
      creator: article.creator
    });
  }

  if (articlesWithSummaries.length > 0) {
    return {
      interest: interest.smartTag || interest.topic,
      interestId: interest.id,
      customPrompt: interest.customPrompt, // Included for frontend editing
      articles: articlesWithSummaries
    };
  }

  return null;
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
