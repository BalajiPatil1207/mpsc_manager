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
