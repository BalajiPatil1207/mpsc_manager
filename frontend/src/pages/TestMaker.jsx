import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCode, FiFilm, FiPlay, FiCopy, FiLayers } from 'react-icons/fi';

const TestMaker = () => {
  // Test State
  const [testJsonInput, setTestJsonInput] = useState('[\n  {\n    "question": "भारताची राजधानी कोणती?",\n    "options": ["मुंबई", "पुणे", "नवी दिल्ली", "नागपूर"],\n    "correctOption": 2\n  }\n]');
  const [testTitle, setTestTitle] = useState('New Shareable Test');
  const [testSubject, setTestSubject] = useState('GK/GS');
  const [timeLimit, setTimeLimit] = useState(15);
  const [testLink, setTestLink] = useState('');

  // Reel State
  const [reelJsonInput, setReelJsonInput] = useState('[\n  {\n    "topic": "Geography",\n    "subtopic": "Physical Geo",\n    "content": "The Earth has 3 main layers: crust, mantle, and core."\n  }\n]');
  const [reelTitle, setReelTitle] = useState('Super Quick Notes');
  const [reelSubject, setReelSubject] = useState('Mixed');
  const [reelLink, setReelLink] = useState('');

  const handleCreateTest = async () => {
    try {
      const parsedQuestions = JSON.parse(testJsonInput);
      if(!Array.isArray(parsedQuestions)) return toast.error("JSON must be an array of objects!");
      
      const res = await axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
        title: testTitle, subject: testSubject, timeLimit: timeLimit, questions: parsedQuestions
      });

      if(res.data.success) {
        setTestLink(`${window.location.origin}/test/${res.data.testId}`);
        toast.success('Shareable Test Created!');
      }
    } catch(err) {
      toast.error('Invalid Test JSON or server error!');
    }
  };

  const handleCreateReel = async () => {
    try {
      const cleanedJson = reelJsonInput.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
      const parsedCards = JSON.parse(cleanedJson);
      if(!Array.isArray(parsedCards)) return toast.error("JSON must be an array of objects!");
      
      const tId = toast.loading("Creating Study Reel...");
      const res = await axios.post('https://mpsc-manager.onrender.com/api/reels', {
        title: reelTitle, subject: reelSubject, cards: parsedCards
      });

      if(res.data.success) {
        setReelLink(`${window.location.origin}/reel/${res.data.reelId}`);
        toast.success('Study Reel Created!', { id: tId });
      }
    } catch(err) {
      toast.error('Invalid Reel JSON or server error!');
    }
  };

  const handleGenerateMegaTest = async () => {
    const tId = toast.loading('Aggregating rules for Mega Test...');
    try {
      const res = await axios.post('https://mpsc-manager.onrender.com/api/custom-tests/mega-generate');
      if(res.data.success) toast.success(res.data.message, { id: tId });
    } catch(err) {
       toast.error(err.response?.data?.message || 'Generation Failed!', { id: tId });
    }
  };

  const copyLink = (link) => { navigator.clipboard.writeText(link); toast.success("Link Copied!"); };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between align-center flex-wrap gap-4">
        <div>
           <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Creator Studio</h1>
           <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Create custom tests or flashcard reels.</p>
        </div>
        <button className="btn btn-primary" onClick={handleGenerateMegaTest} style={{ background: 'var(--success)' }}>
          <FiLayers className="inline mr-2" /> Auto Generate Mega Test
        </button>
      </div>
      
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* Test Creator */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}><FiCode className="inline mr-2" /> Create Custom Test</h2>
          
          <div className="flex-col gap-4">
            <input type="text" placeholder="Test Title" className="glass-card" style={{ padding: '12px', outline: 'none' }} value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            <div className="flex-row gap-4">
              <select className="glass-card" value={testSubject} onChange={(e) => setTestSubject(e.target.value)} style={{ flex: 1, padding: '12px', outline: 'none' }}>
                 <option style={{color:'#000'}} value="GK/GS">GK / GS</option>
                 <option style={{color:'#000'}} value="Maths">Maths</option>
                 <option style={{color:'#000'}} value="Reasoning">Reasoning</option>
                 <option style={{color:'#000'}} value="Marathi">Marathi</option>
                 <option style={{color:'#000'}} value="Mixed">Mixed</option>
              </select>
              <input type="number" placeholder="Mins" className="glass-card" style={{ width: '80px', padding: '12px', outline: 'none' }} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </div>
            <textarea className="glass-card" style={{ width: '100%', height: '220px', fontFamily: 'monospace', padding: '16px', outline: 'none', resize: 'none' }} value={testJsonInput} onChange={(e) => setTestJsonInput(e.target.value)} />

            <button onClick={handleCreateTest} className="btn btn-primary"><FiPlay className="inline mr-2" /> Generate Test</button>
            
            {testLink && (
               <div className="glass-card flex-row align-center justify-between" style={{ padding: '12px', border: '1px dashed var(--accent-primary)', width: '100%', background: 'var(--accent-glow)' }}>
                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{testLink}</span>
                 <button onClick={() => copyLink(testLink)} className="btn"><FiCopy size={20} /></button>
               </div>
            )}
          </div>
        </div>

        {/* Reel Creator */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}><FiFilm className="inline mr-2" /> Create Study Reel</h2>
          
          <div className="flex-col gap-4">
            <input type="text" placeholder="Reel Title" className="glass-card" style={{ padding: '12px', outline: 'none' }} value={reelTitle} onChange={(e) => setReelTitle(e.target.value)} />
            <select className="glass-card" value={reelSubject} onChange={(e) => setReelSubject(e.target.value)} style={{ padding: '12px', outline: 'none' }}>
                 <option style={{color:'#000'}} value="GK/GS">GK / GS</option>
                 <option style={{color:'#000'}} value="Maths">Maths</option>
                 <option style={{color:'#000'}} value="Reasoning">Reasoning</option>
                 <option style={{color:'#000'}} value="Marathi">Marathi</option>
                 <option style={{color:'#000'}} value="Mixed">Mixed</option>
            </select>
            <textarea className="glass-card" style={{ width: '100%', height: '220px', fontFamily: 'monospace', padding: '16px', outline: 'none', resize: 'none' }} value={reelJsonInput} onChange={(e) => setReelJsonInput(e.target.value)} />

            <button onClick={handleCreateReel} className="btn btn-primary" style={{ background: 'var(--accent-secondary)' }}><FiPlay className="inline mr-2" /> Generate Study Reel</button>
            
            {reelLink && (
               <div className="glass-card flex-row align-center justify-between" style={{ padding: '12px', border: '1px dashed var(--accent-secondary)', width: '100%', background: 'rgba(255,107,107,0.1)' }}>
                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reelLink}</span>
                 <button onClick={() => copyLink(reelLink)} className="btn"><FiCopy size={20} /></button>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default TestMaker;
