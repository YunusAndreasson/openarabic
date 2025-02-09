import React from 'react';

export default function MyDevToolsPlugin() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>My DevTools Plugin</h1>
      <p>This custom plugin is now available in Expo DevTools.</p>
      <button onClick={() => alert('Hello from My DevTools Plugin!')}>Click me</button>
    </div>
  );
}
