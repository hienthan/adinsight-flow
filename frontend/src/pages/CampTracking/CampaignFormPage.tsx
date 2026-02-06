import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import CampaignForm from '../../components/campaign/CampaignForm';

export default function CampaignFormPage() {
    const navigate = useNavigate();

    return (
        <div className="page-container">
            {/* Header with Back Button */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0',
                        marginBottom: '1rem'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                >
                    <ChevronLeft size={18} />
                    Back to Overview
                </button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Create New Campaign</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    Define your campaign strategy and core metrics
                </p>
            </div>

            {/* Form Container */}
            <div style={{
                maxWidth: '800px',
                background: 'var(--bg-card)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}>
                <CampaignForm />
            </div>
        </div>
    );
}
