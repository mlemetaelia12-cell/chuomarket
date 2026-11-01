import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],

  theme: {
    extend: {
      // =====================================================
      // CHUO MARKET — BLUE, WHITE, GREEN AND AMBER DESIGN TOKENS
      // =====================================================

      colors: {
        brand: {
          950: '#172B3A',
          900: '#123B5B',
          800: '#155487',
          700: '#1769AA',
          600: '#247DBB',
          500: '#398FC8',
          400: '#70AED7',
          300: '#A7CDE7',
          200: '#D3E6F3',
          100: '#EFF6FB',
          button: '#FFFFFF',
          buttonStart: '#1769AA',
          buttonEnd: '#12558C',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F7FA',
          elevated: '#FFFFFF',
        },
        canvas: {
          DEFAULT: '#F5F7FA',
          subtle: '#EDF2F7',
        },
        ink: {
          DEFAULT: '#172B3A',
          secondary: '#334155',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        violet: {
          DEFAULT: '#1769AA',
          dark: '#12558C',
          soft: '#E7F1F8',
          subtle: '#F1F7FB',
        },
        lime: {
          DEFAULT: '#239B62',
          light: '#D9F2E5',
          dark: '#187A4B',
          soft: '#EAF7EF',
        },
        orange: {
          DEFAULT: '#F39A32',
          soft: '#FFF3E3',
          dark: '#B96B12',
        },
        divider: {
          DEFAULT: '#E5EAF0',
          dark: '#D6DEE7',
        },
      },

      // =====================================================
      // TYPOGRAPHY
      // =====================================================

      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'sans-serif'],
      },

      // =====================================================
      // CINEMATIC SHADOWS
      // =====================================================

      boxShadow: {
        glow: '0 8px 32px rgba(23, 105, 170, 0.12)',

        'nav-glow': '0 12px 42px rgba(23, 43, 58, 0.25)',

        card: '0 8px 30px rgba(17, 24, 39, 0.06)',

        'card-hover': '0 14px 32px rgba(23, 43, 58, 0.10)',

        cinematic: '0 24px 80px rgba(23, 43, 58, 0.25)',

        'violet-glow': '0 8px 35px rgba(23, 105, 170, 0.18)',

        'lime-glow': '0 8px 28px rgba(35, 155, 98, 0.16)',
      },

      // =====================================================
      // BORDER RADIUS
      // =====================================================

      borderRadius: {
        card: '20px',
        panel: '28px',
      },

      // =====================================================
      // BACKGROUND GRADIENTS
      // =====================================================

      backgroundImage: {
        // Original cinematic brand background.
        'brand-gradient': 'linear-gradient(135deg, #1769AA 0%, #12558C 100%)',

        // Main lime CTA gradient.
        'button-gradient': 'linear-gradient(135deg, #247DBB 0%, #1769AA 100%)',

        // Premium cinematic hero.
        'cinematic-gradient': 'linear-gradient(135deg, #1769AA 0%, #12558C 100%)',

        // Primary blue action gradient.
        'violet-gradient': 'linear-gradient(135deg, #247DBB 0%, #1769AA 100%)',

        // Light shopping surface.
        'surface-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #F5F7FA 100%)',

        // Restrained blue and green page accents.
        'hero-glow':
          'radial-gradient(ellipse at 80% 20%, rgba(23,105,170,0.18) 0%, transparent 45%), radial-gradient(ellipse at 15% 85%, rgba(35,155,98,0.08) 0%, transparent 38%)',
      },

      // =====================================================
      // SUBTLE CINEMATIC ANIMATIONS
      // =====================================================

      keyframes: {
        'fade-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(14px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },

        'soft-pulse': {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.75',
          },
        },
      },

      animation: {
        'fade-up': 'fade-up 0.55s ease-out both',
        'soft-pulse': 'soft-pulse 2.8s ease-in-out infinite',
      },
    },
  },

  plugins: [],
};

export default config;
