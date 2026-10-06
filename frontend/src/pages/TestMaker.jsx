import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiCode, FiShare2, FiPlay, FiCopy, FiLayers, FiFilter, FiRefreshCw, FiTrash2, FiEdit2 } from 'react-icons/fi';
import ConfirmModal from '../components/ConfirmModal';

const TestMaker = () => {
  const [jsonInput, setJsonInput] = useState('[\n  {\n    "question": "भारताची राजधानी कोणती?",\n    "options": ["मुंबई", "पुणे", "नवी दिल्ली", "नागपूर"],\n    "correctOption": 2\n  }\n]');
  const [title, setTitle] = useState('New Shareable Test');
  const [subject, setSubject] = useState('GK/GS');
  const [timeLimit, setTimeLimit] = useState(15);
  const [testLink, setTestLink] = useState('');
  
  const navigate = useNavigate();
  
  const [history, setHistory] = useState([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/custom-tests/all');
      if(res.data.success) {
        setHistory(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCreate = async () => {
    try {
      const parsedQuestions = JSON.parse(jsonInput);
      if(!Array.isArray(parsedQuestions)) return toast.error("JSON must be an array of objects!");
      
      const res = await axios.post('http://localhost:5000/api/custom-tests', {
        title,
        subject,
        timeLimit: timeLimit,
        questions: parsedQuestions
      });

      if(res.data.success) {
        const link = `${window.location.origin}/test/${res.data.testId}`;
        setTestLink(link);
        toast.success('Shareable Test Link Created!');
        fetchHistory(); // refresh library
      }
    } catch(err) {
      toast.error('Invalid JSON structure or server error!');
    }
  };

  const handleGenerateMegaTest = async () => {
    const tId = toast.loading('Aggregating rules for Mega Test...');
    try {
      const res = await axios.post('http://localhost:5000/api/custom-tests/mega-generate');
      if(res.data.success) {
        toast.success(res.data.message, { id: tId });
        fetchHistory();
      }
    } catch(err) {
       toast.error(err.response?.data?.message || 'Generation Failed!', { id: tId });
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Link Copied!");
  };

  const processDelete = async () => {
    if(!deleteTarget) return;
    try {
      await axios.delete(`http://localhost:5000/api/custom-tests/${deleteTarget}`);
      toast.success("Test deleted!");
      setDeleteTarget(null);
      fetchHistory();
    } catch(e) {
      toast.error("Failed to delete");
      setDeleteTarget(null);
    }
  };

  const handleEdit = async (test) => {
    const newTitle = window.prompt("Enter new Title:", test.title);
    if(newTitle && newTitle !== test.title) {
       try {
         await axios.put(`http://localhost:5000/api/custom-tests/${test.id}`, {
           title: newTitle, subject: test.subject, timeLimit: test.timeLimit
         });
         toast.success("Test updated!");
         fetchHistory();
       } catch(e) {
         toast.error("Failed to update");
       }
    }
  };

  const filteredHistory = history.filter(h => {
    const matchSubject = filterSubject ? h.subject.toLowerCase().includes(filterSubject.toLowerCase()) : true;
    const matchDate = filterDate ? h.createdAt.includes(filterDate) : true;
    return matchSubject && matchDate;
  });

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between align-center">
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Test Vault & Generator</h1>
        <button className="btn btn-primary" onClick={handleGenerateMegaTest} style={{ background: 'var(--success)' }}>
          <FiLayers className="inline mr-2" /> Auto Generate 100 Q Mega Test
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>Create tests instantly and build an automated repository of questions.</p>
      
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
               <div className="glass-card flex-row align-center justify-between" style={{ padding: '12px', border: '1px dashed var(--accent-primary)', width: '100%', background: 'rgba(99, 102, 241, 0.1)', marginTop: '8px' }}>
                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{testLink}</span>
                 <button onClick={() => copyLink(testLink)} style={{ background: 'transparent', border: 'none', color: 'white' }}><FiCopy size={20} /></button>
               </div>
            )}
          </div>
        </div>

        {/* History Library */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '650px', overflowY: 'auto' }}>
           <h2 style={{ fontSize: '1.25rem' }}>📚 Test Library & History</h2>
           <div className="flex-row gap-4" style={{ marginBottom: '8px' }}>
             <select className="glass-card" value={filterSubject} onChange={(e)=>setFilterSubject(e.target.value)} style={{ flex: 1, padding: '8px', color: '#000', fontSize: '0.875rem' }}>
                <option value="">All Subjects</option>
                <option value="GK">GK / GS</option>
                <option value="Math">Maths</option>
                <option value="Reasoning">Reasoning</option>
             </select>
             <input type="date" className="glass-card" style={{ flex: 1, padding: '8px', color: 'white', background: 'rgba(255,255,255,0.05)', fontSize: '0.875rem', colorScheme: 'dark' }} 
                    value={filterDate} onChange={(e)=>setFilterDate(e.target.value)} />
             <button onClick={()=> {setFilterDate(''); setFilterSubject('')}} className="glass-card" style={{ padding: '8px', background: 'transparent', color: 'white', border: '1px solid var(--border-color)'}}>
               Clear
             </button>
           </div>
           
           <div className="flex-col gap-4">
             {filteredHistory.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No tests found.</p> : null}
             {filteredHistory.map(test => (
               <div key={test.id} className="glass-card" style={{ padding: '16px', borderLeft: `4px solid ${(test.subject || '').includes('Mega') ? 'var(--success)' : 'var(--accent-primary)'}` }}>
                 <div className="flex-row justify-between align-center" style={{ marginBottom: '8px' }}>
                   <h3 style={{ fontSize: '1.125rem', margin: 0 }}>{test.title}</h3>
                   <span className="badge pending" style={{ background: (test.subject || '').includes('Mega') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)', color: (test.subject || '').includes('Mega') ? 'var(--success)' : 'var(--accent-primary)' }}>
                     {test.timeLimit} Mins
                   </span>
                 </div>
                 <div className="flex-row justify-between align-center">
                   <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                     {test.subject} • {test.questions.length} Qs • {new Date(test.createdAt).toLocaleDateString()}
                   </p>
                   <div className="flex-row gap-2">
                     <button title="Edit Test Title" onClick={() => handleEdit(test)} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor:'pointer' }}><FiEdit2 size={16} /></button>
                     <button title="Delete Test" onClick={() => setDeleteTarget(test.id)} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor:'pointer' }}><FiTrash2 size={16} /></button>
                     <button title="Copy Sharable Link" onClick={() => copyLink(`${window.location.origin}/test/${test.id}`)} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor:'pointer' }}><FiCopy size={16} /></button>
                     <button title="Take Test" className="btn btn-primary" onClick={() => navigate(`/test/${test.id}`)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Start</button>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={!!deleteTarget}
        title="Delete Custom Test"
        message="Are you sure you want to permanently delete this test? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={processDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default TestMaker;
