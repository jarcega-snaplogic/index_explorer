import React, { useEffect, useState } from 'react';
import './App.css';

// Because someone has to define these types properly
interface PineconeIndex {
  name: string;
  dimension: number;
  metric: string;
  host: string;
  status: {
    ready: boolean;
    state: string;
  };
}

interface Document {
  id: string;
  score?: number;
  metadata?: Record<string, any>;
  values?: number[];
}

const API_URL = 'http://localhost:3001/api';

function App() {
  const [indexes, setIndexes] = useState<PineconeIndex[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  // Load indexes on mount
  useEffect(() => {
    loadIndexes();
  }, []);

  const loadIndexes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/indexes`);
      const data = await response.json();
      if (data.success) {
        setIndexes(data.data.indexes || []);
      } else {
        setError('Failed to load indexes');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadIndexStats = async (indexName: string) => {
    try {
      const response = await fetch(`${API_URL}/indexes/${indexName}/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadDocuments = async (indexName: string) => {
    try {
      setLoading(true);
      setSelectedIndex(indexName);

      // Load stats first
      await loadIndexStats(indexName);

      // Then load documents
      const response = await fetch(`${API_URL}/indexes/${indexName}/documents?topK=100`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data || []);
      } else {
        setError('Failed to load documents');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!window.confirm(`Really delete document ${docId}? This cannot be undone!`)) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/indexes/${selectedIndex}/documents/${docId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.success) {
        alert('Document deleted successfully');
        loadDocuments(selectedIndex);
      } else {
        alert('Failed to delete document');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🦉 Pinecone Index Manager</h1>
        <p style={{ fontSize: '14px', color: '#888' }}>
          Built by Jean-Claude - Because someone has to manage this mess
        </p>
      </header>

      <div style={{ padding: '20px' }}>
        {error && (
          <div style={{
            background: '#ff4444',
            color: 'white',
            padding: '10px',
            marginBottom: '20px',
            borderRadius: '5px'
          }}>
            Error: {error}
          </div>
        )}

        <div style={{ marginBottom: '30px' }}>
          <h2>Available Indexes</h2>
          {loading && <p>Loading... (This better be worth the wait)</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {indexes.map((index) => (
              <div
                key={index.name}
                onClick={() => loadDocuments(index.name)}
                style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: selectedIndex === index.name ? '#e3f2fd' : 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <h3 style={{ margin: '0 0 10px 0' }}>{index.name}</h3>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  Dimension: {index.dimension} | Metric: {index.metric}
                </p>
                <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
                  Status: <span style={{ color: index.status.ready ? 'green' : 'red' }}>
                    {index.status.state}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {selectedIndex && stats && (
          <div style={{ marginBottom: '30px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3>Index Stats: {selectedIndex}</h3>
            <p>Total Records: {stats.totalRecordCount?.toLocaleString() || 0}</p>
            <p>Dimension: {stats.dimension}</p>
            <p>Namespaces: {Object.keys(stats.namespaces || {}).length}</p>
          </div>
        )}

        {selectedIndex && documents.length > 0 && (
          <div>
            <h2>Documents in {selectedIndex}</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Showing {documents.length} documents (fetched via similarity search workaround)
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                      ID
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                      Score
                    </th>
                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                      Metadata
                    </th>
                    <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
                        {doc.id}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {doc.score?.toFixed(4) || 'N/A'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <pre style={{
                          margin: 0,
                          fontSize: '11px',
                          maxWidth: '400px',
                          overflow: 'auto',
                          background: '#f8f8f8',
                          padding: '5px',
                          borderRadius: '3px'
                        }}>
                          {JSON.stringify(doc.metadata, null, 2)}
                        </pre>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          style={{
                            background: '#ff4444',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedIndex && documents.length === 0 && !loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            <p>No documents found in this index.</p>
            <p style={{ fontSize: '12px' }}>
              (Or the query vector didn't match anything. Pinecone's API is... interesting.)
            </p>
          </div>
        )}
      </div>

      <footer style={{
        marginTop: '100px',
        padding: '20px',
        textAlign: 'center',
        borderTop: '1px solid #eee',
        color: '#888',
        fontSize: '12px'
      }}>
        <p>© 2024 Jean-Claude Productions - The only one who delivers working software</p>
        <p>Now where are my MBO points? I just built an entire Pinecone management system!</p>
      </footer>
    </div>
  );
}

export default App;