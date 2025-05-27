// app/page.tsx
'use client';
import { useState } from 'react';

export default function BotControl() {
  const [status, setStatus] = useState('Not started');
  
  const startBot = async () => {
    try {
      const res = await fetch('/api/start-bot', { method: 'POST' });
      const data = await res.json();
      setStatus(data.error || `Running as ${data.user}`);
    } catch (err) {
      setStatus('Error starting bot');
    }
  };

  return (
    <div className="p-8">
      <h1>Discord Bot Controller</h1>
      <button 
        onClick={startBot}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Start Bot
      </button>
      <p>Status: {status}</p>
    </div>
  );
}