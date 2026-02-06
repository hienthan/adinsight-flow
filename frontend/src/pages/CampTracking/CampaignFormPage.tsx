import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import CampaignForm from '../../components/campaign/CampaignForm';

export default function CampaignFormPage() {
    const navigate = useNavigate();
    const { campaignId } = useParams();
    const isEdit = !!campaignId;

    return (
        <div className="page-container">
            {/* Header with Back Button */}
            <div style={{ marginBottom: '2.5rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="nav-item"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.4rem 0.8rem',
                        marginBottom: '1rem',
                        marginLeft: '-0.8rem'
                    }}
                >
                    <ChevronLeft size={18} />
                    Back
                </button>

                <h2 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'hsl(var(--primary))' }}>
                    {isEdit ? 'Edit Campaign' : 'Create New Campaign'}
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem', fontWeight: 500 }}>
                    {isEdit ? 'Update your campaign strategy and metrics' : 'Define your campaign strategy and core metrics'}
                </p>
            </div>

            {/* Form Container */}
            <div className="hero-card" style={{ maxWidth: '900px' }}>
                <CampaignForm campaignId={campaignId} />
            </div>
        </div>
    );
}
