const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.getCoachAdvice = async (req, res) => {
  const { weakTopics, mockScore } = req.body;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "API Key missing" });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let topicsSnippet = "General Studies";
    if (Array.isArray(weakTopics) && weakTopics.length > 0) {
       topicsSnippet = weakTopics.join(", ");
    }
    
    const prompt = `Act as an expert competitive exam coach for MPSC/Talathi. 
    The student recently scored ${mockScore}% in their mock test. 
    Their current weak topics are: ${topicsSnippet}. 
    Provide a very short, encouraging 2-sentence advice on what they should focus on studying today. 
    Keep it under 30 words. Give the output strictly in Marathi language.`;

    const result = await model.generateContent(prompt);
    const advice = result.response.text();
    
    res.json({ success: true, advice });
  } catch (error) {
    console.error('AI Error:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'AI Generation Failed' });
  }
};

exports.explainQuestion = async (req, res) => {
  const { question, options, correctOption, subject } = req.body;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "API Key missing" });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const correctText = (options && options[correctOption] !== undefined) ? options[correctOption] : '';
    const prompt = `Act as an expert MPSC exam mentor and educator.
Question: "${question}"
Options: ${JSON.stringify(options || [])}
Correct Answer: "${correctText}"
Subject: ${subject || 'General Studies'}

Provide a clear, accurate, and concise explanation in Marathi for why this is the correct answer. 
Include key facts, relevant constitutional articles, historical dates, or MPSC reference points if applicable.
Keep the explanation between 2 to 4 sentences (under 60 words).
Respond ONLY with the explanation text in Marathi.`;

    const result = await model.generateContent(prompt);
    const explanation = result.response.text().trim();
    
    res.json({ success: true, explanation });
  } catch (error) {
    console.error('AI Explanation Error:', error.message || error);
    res.status(500).json({ success: false, error: error.message || 'AI Explanation Failed' });
  }
};

