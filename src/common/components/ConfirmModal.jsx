import { useEffect } from 'react'
import { X, AlertTriangle, AlertCircle, RotateCcw, Trash2 } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Megerősítés szükséges',
  message = 'Biztosan végrehajtod ezt a műveletet?',
  details = null,
  confirmText = 'Igen, végrehajtom',
  cancelText = 'Mégse',
  variant = 'danger',
  icon: CustomIcon = null
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Determine accent colors by variant
  const isDanger = variant === 'danger'
  const isWarning = variant === 'warning'
  const isSuccess = variant === 'success'

  const iconBg = isDanger
    ? 'rgba(220, 38, 38, 0.12)'
    : isWarning
    ? 'rgba(217, 119, 6, 0.12)'
    : isSuccess
    ? 'rgba(22, 163, 74, 0.12)'
    : 'rgba(37, 99, 235, 0.12)'

  const iconBorder = isDanger
    ? 'rgba(220, 38, 38, 0.25)'
    : isWarning
    ? 'rgba(217, 119, 6, 0.25)'
    : isSuccess
    ? 'rgba(22, 163, 74, 0.25)'
    : 'rgba(37, 99, 235, 0.25)'

  const iconColor = isDanger ? '#dc2626' : isWarning ? '#d97706' : isSuccess ? '#16a34a' : '#2563eb'

  const confirmBtnBg = isDanger ? '#dc2626' : isWarning ? '#d97706' : isSuccess ? '#059669' : 'var(--color-primary-600)'

  const IconComponent = CustomIcon || (isDanger ? AlertTriangle : isWarning ? AlertCircle : RotateCcw)

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 100,
        backgroundColor: 'rgba(6, 14, 32, 0.72)',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '100%',
          maxHeight: '90vh',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Top Header with Icon and Close Button */}
        <div
          style={{
            padding: '20px 24px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: iconBg,
                border: `1px solid ${iconBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <IconComponent size={22} color={iconColor} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)'
                }}
              >
                {title}
              </h2>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-muted)',
                  display: 'inline-block',
                  marginTop: '2px'
                }}
              >
                Közgyűlés Adminisztráció
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Bezárás"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body with Message & Details */}
        <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: '1 1 auto' }}>
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              color: 'var(--color-text-primary)',
              lineHeight: 1.5,
              fontWeight: 500
            }}
          >
            {message}
          </p>

          {details && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: isDanger ? 'var(--color-danger-bg)' : 'var(--color-surface-hover)',
                border: `1px solid ${isDanger ? 'var(--color-danger-border)' : 'var(--color-border)'}`,
                color: isDanger ? 'var(--color-danger-text)' : 'var(--color-text-secondary)',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>{details}</div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-hover)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ minWidth: '90px' }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="btn"
            style={{
              backgroundColor: confirmBtnBg,
              color: '#ffffff',
              border: 'none',
              boxShadow: 'var(--shadow-sm)',
              minWidth: '120px'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
