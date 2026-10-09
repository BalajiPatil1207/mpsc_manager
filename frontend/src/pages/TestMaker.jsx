import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCode, FiShare2, FiPlay, FiCopy, FiLayers } from 'react-icons/fi';

const TestMaker = () => {
  const [jsonInput, setJsonInput] = useState('[\n  {\n    "question": "भारताची राजधानी कोणती?",\n    "options": ["मुंबई", "पुणे", "नवी दिल्ली", "नागपूर"],\n    "correctOption": 2\n  }\n]');
  const [title, setTitle] = useState('New Shareable Test');
  const [subject, setSubject] = useState('GK/GS');
  const [timeLimit, setTimeLimit] = useState(15);
  const [testLink, setTestLink] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    try {
      const parsedQuestions = JSON.parse(jsonInput);
      if(!Array.isArray(parsedQuestions)) return toast.error("JSON must be an array of objects!");
      
      const res = await axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
        title,
        subject,
        timeLimit: timeLimit,
        questions: parsedQuestions
      });

      if(res.data.success) {
        const link = `${window.location.origin}/test/${res.data.testId}`;
        setTestLink(link);
        toast.success('Shareable Test Link Created!');
      }
    } catch(err) {
      toast.error('Invalid JSON structure or server error!');
    }
  };

  const handleGenerateMegaTest = async () => {
    const tId = toast.loading('Aggregating rules for Mega Test...');
    try {
      const res = await axios.post('https://mpsc-manager.onrender.com/api/custom-tests/mega-generate');
      if(res.data.success) {
        toast.success(res.data.message, { id: tId });
      }
    } catch(err) {
       toast.error(err.response?.data?.message || 'Generation Failed!', { id: tId });
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Link Copied!");
  };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between align-center">
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Test Vault & Generator</h1>
        <button className="btn btn-primary" onClick={handleGenerateMegaTest} style={{ background: 'var(--success)' }}>
          <FiLayers className="inline mr-2" /> Auto Generate 100 Q Mega Test
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>Create tests instantly and build an automated repository of questions.</p>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}><FiCode className="inline mr-2" /> Create New Test</h2>
          
          <div className="flex-col gap-4">
            <input 
               type="text" 
               placeholder="Test Title"
               className="glass-card" 
               style={{ padding: '12px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', outline: 'none' }}
               value={title} onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex-row gap-4">
              <select className="glass-card" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ flex: 1, padding: '12px', color: '#000', outline: 'none' }}>
                 <option value="GK/GS">GK / GS</option>
                 <option value="Maths (गणित)">Maths (गणित)</option>
                 <option value="Reasoning (बुद्धिमत्ता)">Reasoning (बुद्धिमत्ता)</option>
                 <option value="Marathi">Marathi</option>
                 <option value="Mixed">Mixed</option>
              </select>
              <input 
                type="number" 
                placeholder="Minutes"
                className="glass-card" 
                style={{ width: '100px', padding: '12px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', outline: 'none' }}
                value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)}
              />
            </div>
            <textarea 
              className="glass-card"
              style={{ width: '100%', height: '220px', fontFamily: 'monospace', padding: '16px', color: 'white', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', outline: 'none', resize: 'none' }}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />

            <button onClick={handleCreate} className="btn btn-primary" style={{ marginTop: '8px' }}>
              <FiPlay className="inline mr-2" /> Generate & Save Test
            </button>
            
            {testLink && (
               <div className="glass-card flex-row align-center justify-between" style={{ padding: '12px', border: '1px dashed var(--accent-primary)', width: '100%', background: 'var(--accent-glow)', marginTop: '8px' }}>
                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{testLink}</span>
                 <button onClick={() => copyLink(testLink)} style={{ background: 'transparent', border: 'none', color: 'white' }}><FiCopy size={20} /></button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMaker;
