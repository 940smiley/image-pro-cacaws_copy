import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react';

interface PricePoint {
  date: string;
  avg_price: number;
  item_type: string;
}

export default function PriceDashboard() {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPriceHistory() {
      const { data, error } = await supabase
        .from('price_history') // Note: User needs this table in Supabase
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (!error && data) {
        setHistory(data);
      }
      setLoading(false);
    }
    fetchPriceHistory();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Market Price Insights</h2>
          <p className="text-sm text-gray-500">Historical data across your collections</p>
        </div>
        <div className="bg-blue-50 p-2 rounded-lg">
          <TrendingUp className="w-6 h-6 text-blue-600" />
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No historical data yet. Start processing items!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((point, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-sm">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{point.item_type}</p>
                      <p className="text-[10px] text-gray-500">{new Date(point.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">$\${point.avg_price.toFixed(2)}</p>
                    <div className="flex items-center gap-1 text-[10px] text-green-600">
                      <TrendingUp className="w-3 h-3" />
                      +2.4%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-6 border-t">
        <button className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors">
          <FileText className="w-4 h-4" />
          View Full Report
        </button>
      </div>
    </div>
  );
}
