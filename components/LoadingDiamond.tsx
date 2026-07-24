export default function LoadingDiamond({ size = 34 }: { size?: number }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span
        style={{
          display: 'inline-block', width: size, height: size, borderRadius: 8,
          background: 'linear-gradient(150deg, #8E80E0, #7C6BD6)',
          boxShadow: '0 8px 20px rgba(124,107,214,.35)',
          animation: 'loading-diamond-spin 1.2s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes loading-diamond-spin {
          0%   { transform: rotate(45deg) scale(1); opacity: 1; }
          50%  { transform: rotate(225deg) scale(.72); opacity: .5; }
          100% { transform: rotate(405deg) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
