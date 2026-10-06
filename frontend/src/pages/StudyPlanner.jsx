import React, { useState, useEffect } from 'react';
import { FiCalendar, FiSettings, FiCheck, FiCpu } from 'react-icons/fi';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudyPlanner = ({ user }) => {
  const [profiles, setProfiles] = useState([]);
  const [exam, setExam] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState(6);
  const [planGenerated, setPlanGenerated] = useState(false);

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

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between">
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Smart Study Planner</h1>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Setup Engine */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}><FiSettings className="inline mr-2" style={{ verticalAlign: 'middle' }} /> Exam Engine</h2>
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
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Day 1 - 30 • Basics & NCERTs</span>
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
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Day 91 - Target • 15+ Full Mocks</span>
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
    </div>
  );
};

export default StudyPlanner;
