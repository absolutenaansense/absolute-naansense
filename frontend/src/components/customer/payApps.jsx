// Shared UPI apps + clean app-icon logos for the checkout payment screens.
export const UPI_PAYEE = '8299018895@okbizaxis'

// Build a UPI deep link for an app. `tn` (note) is included for a legitimate
// merchant-style payment.
export const upiLink = (app, amount) =>
  `${app.scheme}://${app.path}?pa=${UPI_PAYEE}&am=${Number(amount).toFixed(2)}&cu=INR&tn=Absolute%20Naansense%20order`

const Box = ({ fill, stroke, children }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" className="flex-shrink-0">
    <rect width="24" height="24" rx="6" fill={fill} stroke={stroke || 'none'} />
    {children}
  </svg>
)

export const GPayLogo = () => (
  <Box fill="#fff" stroke="#eaeaea">
    <g transform="translate(3.5 3.5) scale(0.354)">
      <path fill="#4285F4" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.8C34.5 3.5 29.7 1 24 1 14.8 1 7 6.8 3.9 14.9l7 5.4C12.6 14 17.8 9.5 24 9.5z" />
      <path fill="#34A853" d="M46.1 24.5c0-1.6-.1-2.8-.4-4H24v7.7h12.5c-.5 2.9-2.2 5.4-4.7 7l7.2 5.6c4.2-3.9 6.6-9.6 6.6-16.3z" />
      <path fill="#FBBC05" d="M10.9 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.7-4.6l-7-5.4A23.1 23.1 0 0 0 .9 24c0 3.7.9 7.2 2.4 10.3l7.6-5.7z" />
      <path fill="#EA4335" d="M24 47c5.7 0 10.5-1.9 14-5.1l-7.2-5.6c-1.9 1.3-4.3 2.1-6.8 2.1-6.2 0-11.4-4.2-13.1-9.8l-7.6 5.7C7 41.2 14.9 47 24 47z" />
    </g>
  </Box>
)

export const PhonePeLogo = () => (
  <Box fill="#5f259f">
    <circle cx="14" cy="11" r="5" fill="#ffffff" opacity="0.16" />
    <text x="12" y="16" fontSize="10.5" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">Pe</text>
  </Box>
)

export const PaytmLogo = () => (
  <Box fill="#fff" stroke="#eaeaea">
    <text x="12" y="15.4" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="Arial, sans-serif">
      <tspan fill="#002970">pay</tspan><tspan fill="#00baf2">tm</tspan>
    </text>
  </Box>
)

export const CredLogo = () => (
  <Box fill="#0b0b0b">
    <text x="12" y="15.2" fontSize="6.8" fontWeight="800" letterSpacing="0.6" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">CRED</text>
  </Box>
)

export const UpiLogo = () => (
  <Box fill="#fff" stroke="#eaeaea">
    <path d="M9 5l3.4 7L9 19h2.6L15 12 11.6 5z" fill="#0b8a3e" />
    <path d="M12.6 5L16 12l-3.4 7h2.6L18.6 12 15.2 5z" fill="#ec1c24" />
  </Box>
)

export const UPI_APPS = [
  { name: 'Google Pay', scheme: 'gpay', path: 'upi/pay', Logo: GPayLogo },
  { name: 'PhonePe', scheme: 'phonepe', path: 'pay', Logo: PhonePeLogo },
  { name: 'Paytm', scheme: 'paytmmp', path: 'pay', Logo: PaytmLogo },
  { name: 'CRED', scheme: 'credpay', path: 'upi/pay', Logo: CredLogo },
  { name: 'Any UPI app', scheme: 'upi', path: 'pay', Logo: UpiLogo },
]
