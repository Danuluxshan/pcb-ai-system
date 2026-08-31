// frontend/src/components/Logo.jsx
export default function Logo({ size = 40, showText = true, textColor = '#0f172a', dark = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 4,
        background: dark ? 'linear-gradient(135deg, #fbfcfd, #fafafa)' : 'linear-gradient(135deg, #fbfcfd, #ecf814)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: dark ? '0 8px 24px rgba(30,58,95,0.5)' : '0 8px 24px rgba(30,58,95,0.5)',
      }}>
      <img
        src="/logo/PCB_Smart_Assist_Logo.png"
        alt="PCB SmartAssist"
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
      </div>
      {showText && (
        <span style={{
          fontSize: size * 0.42, fontWeight: 800, letterSpacing: -0.3,
          color: dark ? '#ffffff' : textColor, whiteSpace: 'nowrap',
        }}>
          PCB SmartAssist
        </span>
      )}
    </div>
  );
}
