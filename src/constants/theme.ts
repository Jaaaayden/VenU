// Design tokens. `Colors`, `Spacing`, `Radius` and `Type` are sampled from the
// VenU mockups (VenU_Mockups_Readable.pdf); swap the values for the hi-fi Figma
// tokens when they land and every screen follows.

export const Colors = {
  primary: '#1B47A8',     // buttons, selected chips, links
  primarySoft: '#E8EEFB', // selected chip fill, info banners
  accent: '#C2410C',      // the "U" in VenU, Get help
  accentSoft: '#FDEDE6',
  success: '#15803D',
  successSoft: '#E7F5EC',
  danger: '#B91C1C',
  dangerSoft: '#FDECEC',
  bg: '#F4F5F7',          // page background
  surface: '#FFFFFF',     // cards, inputs
  border: '#E3E5EA',
  divider: '#EEF0F3',
  text: '#16181D',
  textMuted: '#5F6673',
  textFaint: '#9AA0AB',   // placeholders, chevrons
  onPrimary: '#FFFFFF',
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, gutter: 20, xl: 24, xxl: 32 } as const;

export const Radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const Type = {
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700', color: Colors.text },
  body: { fontSize: 15, fontWeight: '400', color: Colors.text },
  bodyStrong: { fontSize: 15, fontWeight: '600', color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  caption: { fontSize: 12, fontWeight: '400', color: Colors.textMuted },
  overline: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
} as const;

// Original tokens from the XR navigation bar Figma component.
export const FigmaColors = {
  darkGray: 'rgba(36, 34, 34, 1)',
  lightBlue: 'rgba(223, 235, 253, 1)',
  white: 'rgba(255, 255, 255, 1)',
} as const;

export const FigmaTypography = {
  label: {
    fontFamily: 'Albert Sans',
    fontWeight: '700' as const,
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
  },
  subtitle: {
    fontFamily: 'Albert Sans',
    fontWeight: '400' as const,
    fontSize: 11,
    lineHeight: 11,
    letterSpacing: 0,
  },
} as const;

export const FigmaShadows = {
  iconContainer: {
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  navigationBar: {
    shadowColor: 'rgba(0,0,0,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
} as const;
