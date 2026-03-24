import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ 
      padding: '50px', 
      textAlign: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h1>🎵 Spotify Tier List App</h1>
      <p>Welcome! Your app is live!</p>
      
      <Link 
        href="/dashboard"
        style={{
          display: 'inline-block',
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#1DB954',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px'
        }}
      >
        Go to Dashboard
      </Link>
    </main>
  )
}