---
name: Clarion Security
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434653'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#2259bf'
  primary: '#094cb2'
  on-primary: '#ffffff'
  primary-container: '#3366cc'
  on-primary-container: '#e7ebff'
  inverse-primary: '#b1c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#005880'
  on-tertiary: '#ffffff'
  tertiary-container: '#0072a3'
  on-tertiary-container: '#deefff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001946'
  on-primary-fixed-variant: '#00419d'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width-content: 800px
---

## Brand & Style
The design system is built on the principle of "Security through Clarity." It targets a professional audience that requires high-stakes communication tools where every interaction must feel intentional, verified, and permanent. 

The aesthetic is **Corporate Modern** with a strong **Editorial** influence. It rejects the playful softness often found in consumer apps in favor of a structured, industrial rigor. By combining the systematic efficiency of modern SaaS with the authoritative weight of traditional publishing, the design system evokes a sense of "digital paperwork"—precise, unalterable, and official. The emotional response should be one of calm confidence and total situational awareness.

## Colors
The palette is rooted in high-contrast clarity to minimize cognitive load. 
- **Primary Indigo (#3366cc):** Used exclusively for primary actions and "Verified" states. It represents the link between stability and action.
- **Slate Text (#0f172a):** Provides maximum legibility against light backgrounds, ensuring the content is the focal point.
- **Soft Grey Surfaces (#f8fafc):** Creates a subtle distinction between the application frame and the content canvas.
- **Systemic Accents:** Use Green (#10b981) for encrypted states and Amber (#f59e0b) for transient or self-destructing data.

## Typography
The typographic hierarchy utilizes two distinct families to separate "The Message" from "The System."
- **Noto Serif** is reserved for headlines, screen titles, and long-form message content. This gives the user’s communication an authoritative, permanent feel.
- **Inter** handles all UI scaffolding, labels, and metadata. It provides the neutral, systematic clarity required for complex navigation.
- **Monospaced Utility:** A secondary mono font is used strictly for encryption keys, checksums, and technical logs to signal data that is machine-verified.

## Layout & Spacing
This design system utilizes a **Fixed Grid** philosophy for content viewing to ensure readability is never compromised by ultra-wide displays.
- **Grid:** A 12-column system for desktop (1440px+) and a 4-column system for mobile.
- **Rhythm:** An 8px base unit drives all padding and margins, ensuring vertical alignment across adjacent columns of text.
- **Message Density:** Provide a "Comfortable" (16px) and "Compact" (8px) toggle for message list density to accommodate different user workflows.
- **Reading Rail:** In desktop view, the primary thread is centered with a max-width of 800px to maintain optimal line lengths for the Serif body text.

## Elevation & Depth
Depth is expressed through **Tonal Layers** rather than heavy shadows, reinforcing the industrial "flat" aesthetic.
- **Surface 0 (Background):** #f8fafc. The lowest layer.
- **Surface 1 (Cards/Panels):** #ffffff. Used for the primary content area with a subtle 1px border (#e2e8f0).
- **Surface 2 (Overlays/Popovers):** #ffffff with a crisp, low-diffusion shadow (0 4px 12px rgba(15, 23, 42, 0.08)).
- **The "Verification" Layer:** Any element requiring user authentication or security confirmation uses a subtle indigo inner-stroke to denote its protected status.

## Shapes
The shape language is conservative and disciplined.
- **Base Corner Radius:** 4px for small components (inputs, tags).
- **Large Corner Radius:** 8px for containers and cards.
- **Functional Sharpness:** Buttons use the 4px radius to feel precise. Avoid circular "pills" as they appear too casual for a high-security environment.
- **Strokes:** Use consistent 1px strokes for all borders. Avoid 2px+ strokes unless highlighting a focused input field.

## Components
- **Buttons:** Primary buttons are Indigo with white text. Secondary buttons use a Slate ghost style (transparent background, 1px slate border). No gradients.
- **Inputs:** High-contrast fields with #ffffff backgrounds and #e2e8f0 borders. Focus states use a 2px Indigo border. Error states use #dc2626.
- **Message Bubbles:** Unlike consumer apps, use "Block Styles." Messages do not have heavy rounding; they appear as clean white blocks with a left-edge accent color to denote the sender.
- **Status Chips:** Small, rectangular chips with 2px radius. Use #f1f5f9 background with #475569 text for neutral metadata (e.g., "Delivered").
- **Security Indicator:** A persistent "Shield" icon in the header that, when clicked, reveals a drawer containing the session's encryption fingerprint in monospaced type.
- **Thread Header:** Uses Noto Serif for the contact name to provide a premium, editorial feel at the start of every conversation.