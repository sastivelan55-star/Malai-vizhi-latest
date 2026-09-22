import React, { useState } from 'react';
import { Route } from 'lucide-react';
import { DemoPanel } from '../UI/DemoPanel';

interface Phase6WidgetProps {
    startLat: number;
    startLon: number;
    locationName?: string;
}

export const Phase6Widget: React.FC<Phase6WidgetProps> = ({ startLat, startLon, locationName }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        setLoading(true);
        setError('');
        try {
            const endLat = startLat + 0.1; // Simple synthetic offset for demo
            const endLon = startLon + 0.1;
            
            // Using fetch directly as we might not have it in api.ts yet
            const response = await fetch('/api/route-risk/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start: { lat: startLat, lon: startLon },
                    end: { lat: endLat, lon: endLon }
                })
            });
            
            if (!response.ok) throw new Error("Failed to analyze route");
            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mt-4">
            <DemoPanel
                title="Exposure & Impact"
                description="See how hazard and exposure combine to identify priority locations."
            />
            <div className="flex items-center gap-2 mb-3 mt-3">
                <Route size={16} className="text-[#14B8A6]" />
                <h3 className="text-xs font-bold text-[#102A43]">Phase 6: Route Risk Analysis</h3>
            </div>
            <p className="text-[10px] text-slate-500 mb-3">
                Analyze a synthetic demo route starting from {locationName || 'this point'}.
            </p>
            
            {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
            
            {result ? (
                <div className="text-xs bg-slate-50 p-2 rounded border border-slate-100">
                    <div className="font-semibold text-slate-700 mb-1">Results (DEMO / LIMITED DATA)</div>
                    <div>Overall Risk: <span className="font-bold">{result.risk_info.overall_route_level}</span> ({result.risk_info.overall_route_score})</div>
                    <div className="text-[10px] text-slate-500 mt-1">Data Quality: {result.data_quality}</div>
                    <div className="text-[10px] text-slate-500">Route Geometry: {result.route_info.status}</div>
                </div>
            ) : (
                <button 
                    onClick={handleAnalyze} 
                    disabled={loading}
                    className="w-full bg-[#102A43] text-white text-xs font-medium py-2 rounded flex items-center justify-center gap-2 hover:bg-[#0A1D30] transition-colors"
                >
                    {loading ? "Analyzing..." : "Run Demo Route Analysis"}
                </button>
            )}
        </div>
    );
};
