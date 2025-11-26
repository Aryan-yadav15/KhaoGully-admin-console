import { useState, useEffect, useRef } from 'react';

export default function WebSocketTest() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [wsUrl, setWsUrl] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setMessages(prev => [...prev, { time: new Date().toISOString(), msg: 'ERROR: No admin token found' }]);
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const url = `${wsProtocol}//${wsHost}/api/v1/ws/admin?token=${token}`;
    setWsUrl(url);

    setMessages(prev => [...prev, { time: new Date().toISOString(), msg: `Connecting to: ${url}` }]);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setMessages(prev => [...prev, { time: new Date().toISOString(), msg: '✅ WebSocket Connected!' }]);
    };

    ws.onmessage = (event) => {
      setMessages(prev => [...prev, { 
        time: new Date().toISOString(), 
        msg: `📨 Message Received: ${event.data}` 
      }]);
    };

    ws.onclose = (event) => {
      setConnected(false);
      setMessages(prev => [...prev, { 
        time: new Date().toISOString(), 
        msg: `❌ WebSocket Closed. Code: ${event.code}, Reason: ${event.reason || 'None'}` 
      }]);
    };

    ws.onerror = (error) => {
      setMessages(prev => [...prev, { 
        time: new Date().toISOString(), 
        msg: `⚠️ WebSocket Error: ${error}` 
      }]);
    };

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const sendPing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
      setMessages(prev => [...prev, { time: new Date().toISOString(), msg: '📤 Sent: ping' }]);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">WebSocket Debugging Console</h1>
        <p className="text-slate-500">Real-time connection monitoring</p>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Connection Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${connected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {connected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
            </span>
          </div>
          
          <div>
            <span className="font-semibold">WebSocket URL:</span>
            <code className="block mt-2 p-2 bg-slate-100 rounded text-xs break-all">{wsUrl}</code>
          </div>

          <button
            onClick={sendPing}
            disabled={!connected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            Send Ping
          </button>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Message Log</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 mb-1">{new Date(msg.time).toLocaleTimeString()}</div>
              <div className="text-sm font-mono break-all">{msg.msg}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center py-8 text-slate-400">No messages yet...</div>
          )}
        </div>
      </div>
    </div>
  );
}
