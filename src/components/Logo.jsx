

export function Logo({ className = '' }) {
    return (
        <svg viewBox="35 45 410 120" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Background */}
            <rect width="100%" height="100%" fill="transparent" />

            {/* Gradient for Setu */}
            <defs>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff7a18" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ff3d00" stopOpacity={1} />
                </linearGradient>

                {/* Glow effect */}
                <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Brand Name */}
            <text
                x="50"
                y="110"
                fontFamily="Inter, Arial, sans-serif"
                fontSize="64"
                fontWeight="700"
                fill="#005681ff"
            >
                Vyapar
            </text>

            <text
                x="270"
                y="110"
                fontFamily="Inter, Arial, sans-serif"
                fontSize="64"
                fontWeight="700"
                fill="url(#orangeGradient)"
                filter="url(#glow)"
            >
                Setu
            </text>

            {/* Tagline */}
            <text
                x="55"
                y="150"
                fontFamily="Inter, Arial, sans-serif"
                fontSize="18"
                fill="#ff5a1f"
                letterSpacing="3"
            >
                CONNECT • TRADE • GROW
            </text>
        </svg>
    );
}

export default Logo;
