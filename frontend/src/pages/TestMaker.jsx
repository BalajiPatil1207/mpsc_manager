import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiCode, 
  FiFilm, 
  FiPlay, 
  FiCopy, 
  FiLayers, 
  FiUploadCloud, 
  FiDownload, 
  FiFileText, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiEye,
  FiExternalLink
} from 'react-icons/fi';
import { auth } from '../firebase';

// 1. CSV Parser with Full Quote and Comma Handling
export const parseCsvQuestions = (csvText) => {
  if (!csvText || !csvText.trim()) return [];
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const parseRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parsedQuestions = [];
  const startIndex = lines[0].toLowerCase().includes('question') || lines[0].toLowerCase().includes('प्रश्न') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length >= 5) {
      const question = cols[0];
      const optA = cols[1];
      const optB = cols[2];
      const optC = cols[3];
      const optD = cols[4];
      const rawAns = (cols[5] || '1').trim().toUpperCase();
      const explanation = cols[6] || '';

      let correctOption = 0;
      if (rawAns === 'A' || rawAns === '1' || rawAns === '१') correctOption = 0;
      else if (rawAns === 'B' || rawAns === '2' || rawAns === '२') correctOption = 1;
      else if (rawAns === 'C' || rawAns === '3' || rawAns === '३') correctOption = 2;
      else if (rawAns === 'D' || rawAns === '4' || rawAns === '४') correctOption = 3;
      else {
        const num = parseInt(rawAns, 10);
        if (!isNaN(num)) correctOption = Math.max(0, Math.min(3, num - 1));
      }

      const options = [optA, optB, optC, optD].filter(Boolean);
      if (question && options.length >= 2) {
        parsedQuestions.push({
          question,
          options,
          correctOption: Math.min(options.length - 1, Math.max(0, correctOption)),
          explanation
        });
      }
    }
  }
  return parsedQuestions;
};

// 2. Plain Text Natural MCQ Parser (e.g. from WhatsApp, PDFs, notes)
export const parseTextQuestions = (plainText) => {
  if (!plainText || !plainText.trim()) return [];

  // Split chunks by question numbers (1., २., Q1., Question 1:)
  const blocks = plainText.split(/(?=(?:^|\n)\s*(?:Q\s*\d+[\.:]|\d+[\.:\)]|[१-९][०-९]*[\.:\)]))\s*/i).filter(b => b.trim().length > 10);
  const questions = [];

  blocks.forEach(block => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) return;

    let qText = '';
    const options = [];
    let correctOption = 0;
    let explanation = '';

    let lineIdx = 0;
    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      const isOption = /^(?:[A-D\d१-४a-d][\.\)]|\([A-D\d१-४a-d]\))\s*/.test(line);
      const isAns = /^(?:Ans|Answer|उत्तर|योग्य पर्याय)[\s\.:]/i.test(line);
      const isExp = /^(?:Explanation|स्पष्टीकरण|Exp)[\s\.:]/i.test(line);

      if (isOption || isAns || isExp) break;
      qText += (qText ? ' ' : '') + line.replace(/^(?:Q\s*\d+[\.:]|\d+[\.:\)]|[१-९][०-९]*[\.:\)])\s*/i, '');
      lineIdx++;
    }

    while (lineIdx < lines.length) {
      const line = lines[lineIdx];
      const isAns = /^(?:Ans|Answer|उत्तर|योग्य पर्याय)[\s\.:]/i.test(line);
      const isExp = /^(?:Explanation|स्पष्टीकरण|Exp)[\s\.:]/i.test(line);

      if (isAns) {
        const ansRaw = line.replace(/^(?:Ans|Answer|उत्तर|योग्य पर्याय)[\s\.:]*/i, '').trim().toUpperCase();
        if (ansRaw.includes('A') || ansRaw.includes('1') || ansRaw.includes('१')) correctOption = 0;
        else if (ansRaw.includes('B') || ansRaw.includes('2') || ansRaw.includes('२')) correctOption = 1;
        else if (ansRaw.includes('C') || ansRaw.includes('3') || ansRaw.includes('३')) correctOption = 2;
        else if (ansRaw.includes('D') || ansRaw.includes('4') || ansRaw.includes('४')) correctOption = 3;
      } else if (isExp) {
        explanation = line.replace(/^(?:Explanation|स्पष्टीकरण|Exp)[\s\.:]*/i, '').trim();
      } else if (/^(?:[A-D\d१-४a-d][\.\)]|\([A-D\d१-४a-d]\))\s*/.test(line)) {
        const optText = line.replace(/^(?:[A-D\d१-४a-d][\.\)]|\([A-D\d१-४a-d]\))\s*/, '').trim();
        if (optText) options.push(optText);
      }
      lineIdx++;
    }

    if (qText && options.length >= 2) {
      questions.push({
        question: qText,
        options,
        correctOption: Math.min(options.length - 1, Math.max(0, correctOption)),
        explanation
      });
    }
  });

  return questions;
};

const defaultTestJson = `[
  {
    "question": "भारताची राज्यघटना केव्हा स्वीकृत करण्यात आली?",
    "options": ["२६ जानेवारी १९५०", "२६ नोव्हेंबर १९४९", "१५ ऑगस्ट १९४७", "२६ जानेवारी १९४९"],
    "correctOption": 1,
    "explanation": "२६ नोव्हेंबर १९४९ रोजी घटना समितीने राज्यघटना स्वीकृत केली, तर २६ जानेवारी १९५० पासून ती प्रत्यक्ष अंमलात आली."
  }
]`;

const defaultCsvSample = `Question,Option 1,Option 2,Option 3,Option 4,Correct Answer (1-4 or A-D),Explanation
"भारताची राज्यघटना केव्हा स्वीकृत करण्यात आली?","२६ जानेवारी १९५०","२६ नोव्हेंबर १९४९","१५ ऑगस्ट १९४७","२६ जानेवारी १९४९","2","२६ नोव्हेंबर १९४९ रोजी घटना समितीने राज्यघटना स्वीकृत केली."
"महाराष्ट्रातील सर्वोच्च शिखर कोणते आहे?","साल्हेर","महाबळेश्वर","कळसूबाई","त्र्यंबकेश्वर","3","कळसूबाई (१६४६ मीटर) हे महाराष्ट्रातील सर्वोच्च शिखर आहे."
"RBI ची स्थापना कोणत्या वर्षी झाली?","१९४७","१९३५","१९५०","१९४९","2","हिल्टन यंग कमिशनच्या शिफारशीनुसार १ एप्रिल १९३५ रोजी RBI ची स्थापना झाली."`;

const defaultTextSample = `१. भारताची राज्यघटना केव्हा स्वीकृत करण्यात आली?
A) २६ जानेवारी १९५०
B) २६ नोव्हेंबर १९४९
C) १५ ऑगस्ट १९४७
D) २६ जानेवारी १९४९
उत्तर: B
स्पष्टीकरण: २६ नोव्हेंबर १९४९ रोजी घटना समितीने राज्यघटना स्वीकृत केली.

२. महाराष्ट्रातील सर्वोच्च शिखर कोणते आहे?
A) साल्हेर
B) महाबळेश्वर
C) कळसूबाई
D) त्र्यंबकेश्वर
उत्तर: C
स्पष्टीकरण: कळसूबाई (१६४६ मीटर) हे महाराष्ट्रातील सर्वोच्च शिखर आहे.`;

const defaultReelJson = `[
  {
    "topic": "महाराष्ट्राचा भूगोल",
    "subtopic": "परीक्षेसाठी महत्त्वाचे मुद्दे",
    "points": [
      "राज्यप्राणी: शेकरू.",
      "राज्यपक्षी: हरियाल.",
      "राज्यवृक्ष: आंबा.",
      "राज्यफूल: ताम्हण."
    ]
  }
]`;

const TestMaker = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const defaultSub = location.state?.defaultSubject || 'Polity';

  const [activeTab, setActiveTab] = useState('test'); // 'test' | 'reel'
  const [inputMode, setInputMode] = useState('csv'); // 'csv' | 'text' | 'json'

  // Test Meta
  const [testTitle, setTestTitle] = useState('MPSC सराव चाचणी संच');
  const [testTopic, setTestTopic] = useState('राज्यघटना व महत्त्वाचे घटक');
  const [testSubject, setTestSubject] = useState(defaultSub);
  const [timeLimit, setTimeLimit] = useState(15);
  const [markingScheme, setMarkingScheme] = useState('rajyaseva'); // 'rajyaseva' | 'group_c'
  const [testLink, setTestLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inputs
  const [csvInput, setCsvInput] = useState(defaultCsvSample);
  const [textInput, setTextInput] = useState(defaultTextSample);
  const [testJsonInput, setTestJsonInput] = useState(defaultTestJson);

  // Reel State
  const [reelJsonInput, setReelJsonInput] = useState(defaultReelJson);
  const [reelTitle, setReelTitle] = useState('Super Quick Notes');
  const [reelTopic, setReelTopic] = useState('');
  const [reelSubject, setReelSubject] = useState(defaultSub);
  const [reelLink, setReelLink] = useState('');

  // Dynamically parsed questions based on active input mode
  const parsedQuestions = useMemo(() => {
    try {
      if (inputMode === 'csv') {
        return parseCsvQuestions(csvInput);
      } else if (inputMode === 'text') {
        return parseTextQuestions(textInput);
      } else if (inputMode === 'json') {
        const parsed = JSON.parse(testJsonInput);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      return [];
    }
    return [];
  }, [inputMode, csvInput, textInput, testJsonInput]);

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([defaultCsvSample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mpsc_sample_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("नमुना CSV टेम्पलेट डाऊनलोड झाले!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;

      if (file.name.endsWith('.csv')) {
        setInputMode('csv');
        setCsvInput(content);
      } else if (file.name.endsWith('.json')) {
        setInputMode('json');
        setTestJsonInput(content);
      } else {
        setInputMode('text');
        setTextInput(content);
      }
      toast.success(`फाइल '${file.name}' यशस्वीरीत्या लोड झाली!`);
    };
    reader.readAsText(file);
  };

  const handleCreateTest = async () => {
    if (parsedQuestions.length === 0) {
      return toast.error("कृपया किमान १ वैध प्रश्न प्रविष्ट करा!");
    }

    setIsSubmitting(true);
    const tId = toast.loading("नवीन टेस्ट तयार करत आहे...");

    try {
      const usr = auth.currentUser;
      const res = await axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
        title: testTitle, 
        topic: testTopic,
        subject: testSubject, 
        timeLimit: timeLimit,
        markingScheme,
        questions: parsedQuestions,
        createdBy: usr?.uid || 'anonymous',
        creatorName: usr?.displayName ? usr.displayName.split(' ')[0] : 'MPSC Candidate'
      });

      if (res.data.success) {
        const generatedTestId = res.data.testId;
        const fullLink = `${window.location.origin}/test/${generatedTestId}`;
        setTestLink(fullLink);

        // Immediate offline cache so student can open test at /test/:id without latency
        try {
          const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
          const newMock = {
            id: generatedTestId,
            _id: generatedTestId,
            title: testTitle,
            topic: testTopic,
            subject: testSubject,
            timeLimit,
            markingScheme,
            questions: parsedQuestions,
            createdAt: new Date().toISOString()
          };
          cachedMocks.unshift(newMock);
          localStorage.setItem('mpsc_cached_mocks', JSON.stringify(cachedMocks));
        } catch (e) {}

        toast.success(`🎉 टेस्ट यशस्वीरीत्या तयार झाली! (${parsedQuestions.length} प्रश्न)`, { id: tId });
      }
    } catch(err) {
      toast.error(err.response?.data?.message || 'टेस्ट तयार करण्यात अडचण आली!', { id: tId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateReel = async () => {
    try {
      const cleanedJson = reelJsonInput.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
      const parsedCards = JSON.parse(cleanedJson);
      if(!Array.isArray(parsedCards)) return toast.error("JSON must be an array of objects!");
      const tId = toast.loading("Creating Study Reel...");
      const usr = auth.currentUser;
      const res = await axios.post('https://mpsc-manager.onrender.com/api/reels', {
        title: reelTitle, 
        topic: reelTopic,
        subject: reelSubject, 
        cards: parsedCards,
        createdBy: usr?.uid || 'anonymous',
        creatorName: usr?.displayName ? usr.displayName.split(' ')[0] : 'A Student'
      });

      if(res.data.success) {
        setReelLink(`${window.location.origin}/reel/${res.data.reelId}`);
        toast.success('Study Reel Created!', { id: tId });
        setReelJsonInput(defaultReelJson);
        setReelTitle('Super Quick Notes');
        setReelTopic('');
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

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("लिंक कॉपी झाली! 📋");
  };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '50px' }}>
      {/* Header */}
      <div className="flex-row justify-between align-center flex-wrap gap-4">
        <div>
          <h1 className="heading-gradient" style={{ fontSize: '2.4rem', margin: 0 }}>Creator Studio</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            CSV, Plain Text किंवा JSON मधून एका क्लिकवर बल्क टेस्ट्स आणि रिव्हिजन रील्स तयार करा.
          </p>
        </div>
        <div className="flex-row gap-2">
          <button className="btn btn-primary" onClick={handleGenerateMegaTest} style={{ background: 'var(--success)' }}>
            <FiLayers className="inline mr-2" /> Auto Generate Mega Test
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('test')}
          className="btn"
          style={{
            background: activeTab === 'test' ? 'var(--accent-primary)' : 'var(--glass-bg)',
            color: activeTab === 'test' ? '#fff' : 'var(--text-primary)',
            padding: '8px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            borderRadius: '10px'
          }}
        >
          📝 बल्क टेस्ट क्रिएटर (Bulk Test Maker)
        </button>
        <button 
          onClick={() => setActiveTab('reel')}
          className="btn"
          style={{
            background: activeTab === 'reel' ? 'var(--accent-secondary)' : 'var(--glass-bg)',
            color: activeTab === 'reel' ? '#fff' : 'var(--text-primary)',
            padding: '8px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            borderRadius: '10px'
          }}
        >
          📱 स्टडी रील्स क्रिएटर (Study Reels)
        </button>
      </div>

      {activeTab === 'test' ? (
        <div className="flex-col gap-6">
          {/* Metadata Panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiCode color="var(--accent-primary)" /> टेस्ट तपशील (Test Metadata)
            </h2>

            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>चाचणीचे नाव (Test Title):</label>
                <input 
                  type="text" 
                  className="glass-card" 
                  style={{ width: '100%', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }} 
                  value={testTitle} 
                  onChange={(e) => setTestTitle(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>उपघटक (Topic):</label>
                <input 
                  type="text" 
                  className="glass-card" 
                  style={{ width: '100%', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }} 
                  value={testTopic} 
                  onChange={(e) => setTestTopic(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>विषय (Subject):</label>
                <select 
                  className="glass-card" 
                  value={testSubject} 
                  onChange={(e) => setTestSubject(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }}
                >
                  <option value="Polity">भारतीय राज्यव्यवस्था (Polity)</option>
                  <option value="Geography">भूगोल व पर्यावरण (Geography)</option>
                  <option value="History">इतिहास (History)</option>
                  <option value="Economics">अर्थव्यवस्था (Economics)</option>
                  <option value="Science">सामान्य विज्ञान (Science)</option>
                  <option value="Reasoning">बुद्धिमत्ता (Reasoning)</option>
                  <option value="Maths">गणित (Maths)</option>
                  <option value="Current Affairs">चालू घडामोडी (Current Affairs)</option>
                  <option value="GK/GS">GK / GS General</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>नियम पद्धत (Marking):</label>
                <select 
                  className="glass-card" 
                  value={markingScheme} 
                  onChange={(e) => setMarkingScheme(e.target.value)} 
                  style={{ width: '100%', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }}
                >
                  <option value="rajyaseva">राज्यसेवा (+२ / -०.६६)</option>
                  <option value="group_c">संयुक्त गट ब व क (+१ / -०.२५)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>वेळ मर्यादा (Minutes):</label>
                <input 
                  type="number" 
                  className="glass-card" 
                  style={{ width: '100%', padding: '10px 14px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }} 
                  value={timeLimit} 
                  onChange={(e) => setTimeLimit(Number(e.target.value) || 15)} 
                />
              </div>
            </div>
          </div>

          {/* Bulk Question Import Engine */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div className="flex-row justify-between align-center flex-wrap gap-3 mb-4" style={{ marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiUploadCloud color="var(--accent-primary)" /> बल्क प्रश्न इनपुट (Bulk Question Import)
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  CSV फाइल, व्हॉट्सॲप/PDF मधील मजकूर किंवा थेट JSON कोड पेस्ट करा
                </span>
              </div>

              <div className="flex-row gap-2 align-center flex-wrap">
                <button 
                  onClick={handleDownloadSampleCsv} 
                  className="btn"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FiDownload /> नमुना CSV डाउनलोड करा
                </button>
                <label 
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FiUploadCloud /> फाइल अपलोड करा (.csv / .txt / .json)
                  <input type="file" accept=".csv,.txt,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Input Mode Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[
                { id: 'csv', label: '📊 CSV / Excel Format' },
                { id: 'text', label: '📄 Plain Text MCQ Format' },
                { id: 'json', label: '⚙️ JSON Code Format' },
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => setInputMode(m.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: inputMode === m.id ? 'var(--accent-primary)' : 'var(--glass-bg)',
                    color: inputMode === m.id ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Input Editor Textarea */}
            {inputMode === 'csv' && (
              <div>
                <textarea 
                  className="glass-card" 
                  style={{ width: '100%', height: '220px', fontFamily: 'monospace', padding: '14px', outline: 'none', resize: 'vertical', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', fontSize: '0.88rem' }} 
                  value={csvInput} 
                  onChange={(e) => setCsvInput(e.target.value)} 
                  placeholder="Question, Option 1, Option 2, Option 3, Option 4, Correct (1-4), Explanation"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  💡 कॉमा किंवा कोट्समध्ये प्रश्न, ४ पर्याय, योग्य पर्याय क्रमांक (१ ते ४ किंवा A-D) आणि स्पष्टीकरण टाका.
                </span>
              </div>
            )}

            {inputMode === 'text' && (
              <div>
                <textarea 
                  className="glass-card" 
                  style={{ width: '100%', height: '220px', fontFamily: 'monospace', padding: '14px', outline: 'none', resize: 'vertical', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', fontSize: '0.88rem' }} 
                  value={textInput} 
                  onChange={(e) => setTextInput(e.target.value)} 
                  placeholder="१. प्रश्न...&#10;A) पर्याय १&#10;B) पर्याय २&#10;C) पर्याय ३&#10;D) पर्याय ४&#10;उत्तर: B&#10;स्पष्टीकरण: ..."
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  💡 प्रश्न क्रमांक, A/B/C/D पर्याय आणि उत्तर: X अशी रचना असलेला कोणताही मजकूर येथे थेट पेस्ट करा.
                </span>
              </div>
            )}

            {inputMode === 'json' && (
              <div>
                <textarea 
                  className="glass-card" 
                  style={{ width: '100%', height: '220px', fontFamily: 'monospace', padding: '14px', outline: 'none', resize: 'vertical', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', fontSize: '0.88rem' }} 
                  value={testJsonInput} 
                  onChange={(e) => setTestJsonInput(e.target.value)} 
                />
              </div>
            )}

            {/* Live Parsing Status & Questions Preview */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div className="flex-row justify-between align-center mb-3" style={{ marginBottom: '12px' }}>
                <div className="flex-row align-center gap-2">
                  <FiCheckCircle color={parsedQuestions.length > 0 ? 'var(--success)' : 'var(--warning)'} />
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    एकूण आढळलेले प्रश्न: {parsedQuestions.length}
                  </strong>
                </div>

                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  background: parsedQuestions.length > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: parsedQuestions.length > 0 ? 'var(--success)' : 'var(--danger)'
                }}>
                  {parsedQuestions.length > 0 ? 'वैध डेटा तयार 🟢' : 'प्रश्न आढळले नाहीत 🔴'}
                </span>
              </div>

              {/* Preview Cards */}
              {parsedQuestions.length > 0 && (
                <div className="flex-col gap-3" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {parsedQuestions.slice(0, 5).map((q, qIdx) => (
                    <div 
                      key={qIdx} 
                      className="glass-card" 
                      style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--accent-primary)' }}
                    >
                      <div className="flex-row justify-between align-center mb-1">
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                          प्रश्न #{qIdx + 1}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>
                          अचूक पर्याय: {String.fromCharCode(65 + (q.correctOption || 0))} (पर्याय {(q.correctOption || 0) + 1})
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {q.question}
                      </p>
                      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
                        {(q.options || []).map((opt, oIdx) => (
                          <div 
                            key={oIdx} 
                            style={{ 
                              padding: '6px 10px', 
                              borderRadius: '6px', 
                              fontSize: '0.8rem',
                              background: oIdx === q.correctOption ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                              border: oIdx === q.correctOption ? '1px solid var(--success)' : '1px solid var(--border-color)',
                              color: oIdx === q.correctOption ? 'var(--success)' : 'var(--text-secondary)'
                            }}
                          >
                            <strong>{String.fromCharCode(65 + oIdx)}) </strong>{opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          💡 <strong>स्पष्टीकरण:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                  {parsedQuestions.length > 5 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', display: 'block' }}>
                      + इतर {parsedQuestions.length - 5} प्रश्न देखील यशस्वीरीत्या समाविष्ट केले जातील...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div style={{ marginTop: '24px' }}>
              <button 
                onClick={handleCreateTest} 
                disabled={isSubmitting || parsedQuestions.length === 0}
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800 }} 
                className="btn btn-primary"
              >
                <FiPlay className="inline mr-2" /> 
                {isSubmitting ? 'तयार करत आहे...' : `🚀 ही चाचणी तयार करा (${parsedQuestions.length} प्रश्न)`}
              </button>
            </div>

            {/* Generated Link */}
            {testLink && (
              <div 
                className="glass-card flex-row align-center justify-between" 
                style={{ marginTop: '16px', padding: '14px', border: '1px dashed var(--accent-primary)', background: 'var(--accent-glow)', flexWrap: 'wrap', gap: '10px' }}
              >
                <div style={{ flex: '1 1 200px', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>चाचणी लिंक तयार झाली:</span>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)', display: 'block', fontSize: '0.9rem' }}>
                    {testLink}
                  </strong>
                </div>
                <div className="flex-row gap-2">
                  <button onClick={() => copyLink(testLink)} className="btn" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiCopy /> कॉपी करा
                  </button>
                  <button 
                    onClick={() => window.open(testLink, '_blank')} 
                    className="btn btn-primary" 
                    style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FiExternalLink /> चाचणी सोडवा
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Reel Creator */
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '700px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}><FiFilm className="inline mr-2" /> Create Study Reel</h2>
          
          <div className="flex-col gap-4">
            <input type="text" placeholder="Reel Title" className="glass-card" style={{ width: '100%', padding: '12px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }} value={reelTitle} onChange={(e) => setReelTitle(e.target.value)} />
            <input type="text" placeholder="Topic (e.g. Modern History)" className="glass-card" style={{ width: '100%', padding: '12px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }} value={reelTopic} onChange={(e) => setReelTopic(e.target.value)} />
            <select className="glass-card" value={reelSubject} onChange={(e) => setReelSubject(e.target.value)} style={{ width: '100%', padding: '12px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }}>
              <option value="Current Affairs">Current Affairs</option>
              <option value="Economics">Economics</option>
              <option value="Geography">Geography</option>
              <option value="History">History</option>
              <option value="Polity">Polity</option>
              <option value="Science">Science (विज्ञान)</option>
              <option value="GK/GS">GK / GS</option>
              <option value="Maths">Maths (गणित)</option>
              <option value="Reasoning">Reasoning (बुद्धिमत्ता)</option>
              <option value="Marathi">Marathi</option>
              <option value="English">English (इंग्रजी)</option>
              <option value="Mixed">Mixed</option>
            </select>
            <textarea className="glass-card" style={{ width: '100%', height: '220px', fontFamily: 'monospace', padding: '16px', outline: 'none', resize: 'vertical', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }} value={reelJsonInput} onChange={(e) => setReelJsonInput(e.target.value)} />

            <button onClick={handleCreateReel} style={{ width: '100%', background: 'var(--accent-secondary)' }} className="btn btn-primary"><FiPlay className="inline mr-2" /> Generate Study Reel</button>
            
            {reelLink && (
              <div className="glass-card flex-row align-center justify-between" style={{ padding: '12px', border: '1px dashed var(--accent-secondary)', background: 'rgba(255,107,107,0.1)' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{reelLink}</span>
                <button onClick={() => copyLink(reelLink)} className="btn"><FiCopy size={20} color="var(--text-primary)" /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestMaker;