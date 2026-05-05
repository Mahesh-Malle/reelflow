import React from 'react';
import { useNavigate } from 'react-router-dom';
import IdeaForm from './IdeaForm';
import { ArrowLeft } from 'lucide-react';

const CreateIdea = () => {
  const navigate = useNavigate();

  return (
    <div className="create-idea-page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ margin: 0 }}>Create New Idea</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Capture your next viral content idea</p>
        </div>
      </div>
      <IdeaForm
        onSuccess={() => navigate('/planner')}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
};

export default CreateIdea;
