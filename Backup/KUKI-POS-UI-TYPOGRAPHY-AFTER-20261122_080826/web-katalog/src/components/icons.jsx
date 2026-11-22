const iconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function SearchIcon(props) {
  return (
    <svg {...iconProps} width="18" height="18" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg {...iconProps} width="14" height="14" aria-hidden="true" {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function ArrowRightIcon(props) {
  return (
    <svg {...iconProps} width="18" height="18" aria-hidden="true" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowLeftIcon(props) {
  return (
    <svg {...iconProps} width="18" height="18" aria-hidden="true" {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function QuoteIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9.5 6C6.5 7.5 5 10.2 5 14v4h6v-6H8.2c.2-1.8 1.2-3.2 3-4.2L9.5 6Zm9 0C15.5 7.5 14 10.2 14 14v4h6v-6h-2.8c.2-1.8 1.2-3.2 3-4.2L18.5 6Z" />
    </svg>
  )
}

export function PhoneIcon(props) {
  return (
    <svg {...iconProps} width="18" height="18" aria-hidden="true" {...props}>
      <path d="M15.5 21A12.5 12.5 0 0 1 3 8.5 3.5 3.5 0 0 1 6.5 5h1.1a1 1 0 0 1 1 .8l.6 2.4a1 1 0 0 1-.5 1.1L7.6 10a10.5 10.5 0 0 0 4.4 4.4l.7-1.1a1 1 0 0 1 1.1-.5l2.4.6a1 1 0 0 1 .8 1v1.1A3.5 3.5 0 0 1 15.5 21Z" />
    </svg>
  )
}

export function MapPinIcon(props) {
  return (
    <svg {...iconProps} width="18" height="18" aria-hidden="true" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function MailIcon(props) {
  return (
    <svg {...iconProps} width="18" height="18" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

export function ClockIcon(props) {
  return (
    <svg {...iconProps} width="18" height="18" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

export function UploadIcon(props) {
  return (
    <svg {...iconProps} width="24" height="24" aria-hidden="true" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

export function XIcon(props) {
  return (
    <svg {...iconProps} width="16" height="16" aria-hidden="true" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function RotateCcwIcon(props) {
  return (
    <svg {...iconProps} width="16" height="16" aria-hidden="true" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

export function LoaderIcon(props) {
  return (
    <svg {...iconProps} width="20" height="20" aria-hidden="true" {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg {...iconProps} width="20" height="20" aria-hidden="true" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function SendIcon(props) {
  return (
    <svg {...iconProps} width="16" height="16" aria-hidden="true" {...props}>
      <line x1="2" y1="22" x2="22" y2="2" />
      <path d="M22 2l-7 7-7-7" />
    </svg>
  )
}

export function AlertCircleIcon(props) {
  return (
    <svg {...iconProps} width="14" height="14" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export function HeadphonesIcon(props) {
  return (
    <svg {...iconProps} width="16" height="16" aria-hidden="true" {...props}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}
