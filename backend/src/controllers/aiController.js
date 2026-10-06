exports.getCoachAdvice = async (req, res) => {
  const { weakTopics, mockScore } = req.body;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: "API Key missing" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `Act as an expert competitive exam coach for MPSC/Talathi. 
    The student recently scored ${mockScore}% in their mock test. 
    Their current weak topics are: ${weakTopics.join(", ")}. 
    Provide a very short, encouraging 2-sentence advice on what they should focus on studying today. 
    Keep it under 30 words. Give the output strictly in Marathi language.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const advice = data.candidates[0].content.parts[0].text;
    res.json({ success: true, advice });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ success: false, error: 'AI Generation Failed' });
  }
};
