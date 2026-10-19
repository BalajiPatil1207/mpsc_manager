import React, { useState, useEffect } from 'react';
import { FiCalendar, FiSettings, FiCheck, FiCpu, FiList, FiClock, FiRotateCcw } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';
import MicroSyllabusChecklist from '../components/MicroSyllabusChecklist';
import FocusTimerModal from '../components/FocusTimerModal';
import SrsReviewModal from '../components/SrsReviewModal';

const StudyPlanner = ({ user }) => {
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'ai_plan'
  const [profiles, setProfiles] = useState([]);
  const [exam, setExam] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState(6);
  const [planGenerated, setPlanGenerated] = useState(false);

  // Focus & SRS Modals state
  const [focusTask, setFocusTask] = useState(null);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isSrsModalOpen, setIsSrsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await axios.get('https://mpsc-manager.onrender.com/api/exams/profiles');
        if (res.data.success) {
          setProfiles(res.data.data);
        }
      } catch (e) {
        console.error("Error fetching profiles");
      }
    };
    const fetchPlan = async () => {
      try {
        if(user?.uid) {
          const res = await axios.get(`https://mpsc-manager.onrender.com/api/plans/user/${user.uid}`);
          if (res.data.success && res.data.hasPlan) {
            setPlanGenerated(true);
            setExam(res.data.plan.examId);
            setDate(res.data.plan.targetDate);
            if(res.data.plan.dailyStudyHours) setHours(res.data.plan.dailyStudyHours);
          }
        }
      } catch (e) {
        console.error("Error fetching plan");
      }
    };
    fetchProfiles();
    fetchPlan();
  }, [user]);

  const handleGeneratePlan = async () => {
    if (!exam || !date) {
      return toast.error("Please select an exam and target date!");
    }
    
    // Simulate generation time to give a premium OS feel
    const toastId = toast.loading('🧠 Analyzing syllabus & computing optimal plan...');
    
    try {
      const payload = {
        userId: user?.uid,
        examId: exam,
        syllabusKey: exam, 
        targetDate: date,
        dailyStudyHours: hours
      };
      
      const res = await axios.post('https://mpsc-manager.onrender.com/api/plans/generate', payload);
      
      if (res.data.success) {
        setTimeout(() => {
          toast.success("Master Plan Ready!", { id: toastId });
          setPlanGenerated(true);
        }, 1500);
      }
    } catch (e) {
      toast.error("Failed to generate plan.", { id: toastId });
    }
  };

  const handleStartFocusFromSyllabus = (taskItem) => {
    setFocusTask(taskItem);
    setIsFocusModalOpen(true);
  };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      
      {/* Top Header & Mode Navigation */}
      <div className="flex-row justify-between align-center" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="flex-col gap-1">
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>
            MPSC 2027 Syllabus & Planner
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            सूक्ष्म अभ्यासक्रम ट्रॅकर व AI आधारित 120-दिवसीय मास्टर नियोजन
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '4px',
          gap: '4px'
        }}>
          <button 
            onClick={() => setActiveTab('checklist')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'checklist' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'checklist' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            <FiList size={16} /> मायक्रो-अभ्यासक्रम ट्रॅकर
          </button>

          <button 
            onClick={() => setActiveTab('ai_plan')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'ai_plan' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'ai_plan' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            <FiCpu size={16} /> AI 120-Day मास्टर प्लॅन
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'checklist' ? (
        <MicroSyllabusChecklist 
          onStartFocus={handleStartFocusFromSyllabus}
          onOpenSrs={() => setIsSrsModalOpen(true)}
        />
      ) : (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
          {/* Setup Engine */}
          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>
              <FiSettings className="inline mr-2" style={{ verticalAlign: 'middle' }} /> Exam Engine
            </h2>
            <div className="flex-col gap-4">
              <div className="flex-col gap-2">
                <label style={{ color: 'var(--text-secondary)' }}>Which exam are you preparing for?</label>
                <select 
                  className="glass-card" 
                  style={{ padding: '12px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
                  value={exam} onChange={(e) => setExam(e.target.value)}
                >
                  <option value="" disabled style={{ background: 'var(--bg-primary)' }}>Select Target Exam</option>
                  {profiles.map(p => (
                    <option key={p.syllabus_key} value={p.syllabus_key} style={{ background: 'var(--bg-primary)' }}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-col gap-2">
                <label style={{ color: 'var(--text-secondary)' }}>Target Exam Date</label>
                <input 
                  type="date" 
                  className="glass-card date-input-theme" 
                  style={{ padding: '12px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', outline: 'none' }}
                  value={date} onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="flex-col gap-2">
                <label style={{ color: 'var(--text-secondary)' }}>Available Study Time (hrs/day)</label>
                <input 
                  type="number" 
                  min="1" max="16"
                  className="glass-card" 
                  style={{ padding: '12px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', outline: 'none' }}
                  value={hours} onChange={(e) => setHours(e.target.value)}
                />
              </div>

              <button onClick={handleGeneratePlan} className="btn btn-primary" style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <FiCpu /> Generate Smart Plan
              </button>
            </div>
          </div>

          {/* Generated Plan */}
          <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-primary)', opacity: '0.1', borderRadius: '50%', filter: 'blur(40px)' }}></div>
            
            {!planGenerated ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '16px' }}>
                <FiCpu size={48} opacity={0.5} />
                <p>Setup your exam on the left to generate the phase-wise master plan.</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>📅 Generated 120 Days Master Plan</h2>
                
                <div className="flex-col gap-4">
                  <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)', animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="flex-row justify-between">
                      <div>
                        <h3 style={{ fontSize: '1.125rem' }}>Phase 1: Foundation</h3>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Day 1 - 30 • Basics & NCERTs / State Board</span>
                      </div>
                      <span className="badge done">Today's Focus</span>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--info)', opacity: '0.9', animation: 'fadeIn 0.8s ease-out' }}>
                    <div className="flex-row justify-between">
                      <div>
                        <h3 style={{ fontSize: '1.125rem' }}>Phase 2: Core Topics</h3>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Day 31 - 60 • Deep Dive into Syllabus</span>
                      </div>
                      <span className="badge pending">Upcoming</span>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--warning)', opacity: '0.8', animation: 'fadeIn 1.1s ease-out' }}>
                    <div className="flex-row justify-between">
                      <div>
                        <h3 style={{ fontSize: '1.125rem' }}>Phase 3: Advanced Level</h3>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Day 61 - 90 • High Weightage Topics</span>
                      </div>
                      <span className="badge pending">Locked</span>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--success)', opacity: '0.6', animation: 'fadeIn 1.4s ease-out' }}>
                    <div className="flex-row justify-between">
                      <div>
                        <h3 style={{ fontSize: '1.125rem' }}>Phase 4: Revision & Mocks</h3>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Day 91 - Target • 15+ Full Mocks & SRS</span>
                      </div>
                      <span className="badge pending">Locked</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setPlanGenerated(false)} 
                  className="btn" 
                  style={{ marginTop: '24px', background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
                  Reset & Create New Plan
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Focus Timer Modal Integration */}
      <FocusTimerModal 
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        task={focusTask}
        dailyTasks={focusTask ? [focusTask] : []}
        onSelectTask={(selected) => setFocusTask(selected)}
        onCompleteTask={(taskId) => {
          toast.success("डीप वर्क पूर्ण! मायक्रो-घटक अभ्यास नोंदवला गेला.");
          setIsFocusModalOpen(false);
        }}
      />

      {/* Spaced Repetition Modal Integration */}
      <SrsReviewModal 
        isOpen={isSrsModalOpen}
        onClose={() => setIsSrsModalOpen(false)}
      />
    </div>
  );
};

export default StudyPlanner;
