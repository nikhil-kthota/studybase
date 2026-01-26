import React from 'react';

// Simple component to test environment variable loading
const EnvironmentTest = () => {
  const apiKey = process.env.REACT_APP_HF_API_KEY;
  
  return (
    <div style={{ 
      padding: '1rem', 
      margin: '1rem', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Environment Variable Test</h3>
      <p><strong>REACT_APP_HF_API_KEY exists:</strong> {apiKey ? '✅ Yes' : '❌ No'}</p>
      <p><strong>API Key Length:</strong> {apiKey ? apiKey.length : 0}</p>
      <p><strong>Starts with 'hf_':</strong> {apiKey ? (apiKey.startsWith('hf_') ? '✅ Yes' : '❌ No') : 'N/A'}</p>
      <p><strong>API Key Preview:</strong> {apiKey ? apiKey.substring(0, 10) + '...' : 'Not found'}</p>
      
      {!apiKey && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.5rem', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px'
        }}>
          <strong>❌ API Key Not Found!</strong>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
            <li>Check if .env.local file exists in project root</li>
            <li>Verify REACT_APP_HF_API_KEY is set correctly</li>
            <li>Restart your development server</li>
            <li>Ensure no extra spaces around the API key</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default EnvironmentTest;
