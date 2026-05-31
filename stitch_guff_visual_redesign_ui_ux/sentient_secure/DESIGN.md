---
name: Sentient Secure
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#bcc7de'
  on-tertiary: '#263143'
  tertiary-container: '#566175'
  on-tertiary-container: '#d1dcf4'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-sm: 16px
  margin-md: 32px
  container-max: 1200px
---

## Brand & Style

The design system is engineered for a high-stakes enterprise messaging environment where security and professional rigour are paramount. The brand personality is disciplined, precise, and authoritative, moving away from casual or "funky" aesthetics toward a high-fidelity, technical aesthetic.

The design style is **Corporate Modern with a Minimalist focus**. It draws inspiration from developer-centric tools like Linear and Vercel, prioritizing functional clarity and purposeful whitespace. Visual interest is generated through perfect alignment, micro-interactions, and a sophisticated use of depth rather than decorative elements. The emotional response should be one of absolute reliability, calm focus, and architectural integrity.

## Colors

The palette is rooted in a "Secure Enterprise" spectrum. The primary color is a deep, high-contrast Indigo, utilized sparingly for intent and primary actions. The background architecture relies on a "Slate" scale, creating a layered dark mode that feels expansive and professional.

- **Primary:** #4F46E5 (Indigo 600) for key brand moments and active states.
- **Surface & Backgrounds:** We use a range of Slates from #020617 (Deep Black-Blue) for the base layer to #1E293B for containers.
- **Accents:** Sophisticated neutrals and muted teals for system status (success/warning) to maintain the serious tone.
- **Borders:** Subtle #334155 (Slate 700) for defining structural boundaries without adding visual noise.

## Typography

This design system utilizes **Inter** for all primary interface elements to ensure maximum legibility and a systematic, neutral feel. We introduce **JetBrains Mono** for secondary labels, metadata, and timestamps to lean into the technical "Secure Enterprise" narrative.

The hierarchy is strictly enforced. Headlines use tighter letter-spacing and heavier weights to anchor sections, while body text maintains a generous line height for long-form reading in message threads. All type is rendered with optimized anti-aliasing to maintain sharpness against deep background hues.

## Layout & Spacing

The layout is governed by a **fixed-fluid hybrid grid**. Main application shells use a 4-column layout for mobile and a 12-column layout for desktop. 

We utilize a rigorous 4px base-unit for all spacing. 
- **Message Threads:** Use a 16px gutter between messages to ensure distinct separation.
- **Sidebars:** Fixed-width (280px) to provide a stable anchor for navigation.
- **Information Density:** High. We prioritize visibility of data and message history over decorative "breathing room," though margins remain consistent at 24px-32px to prevent claustrophobia.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Subtle Outlines** rather than aggressive shadows. 

1. **Base Layer:** The deepest neutral color, used for the main application background.
2. **Surface Layer:** One shade lighter, used for sidebars and navigation panels.
3. **Container Layer:** Used for the active chat window or focused cards, featuring a 1px solid border (#334155).
4. **Floating Layer:** Only used for tooltips and dropdown menus. These feature a soft, 15% opacity black shadow with a 12px blur to separate them from the interface.

Avoid "Glow" effects or vibrant blurs; the depth should feel physical and structured.

## Shapes

The shape language is precise and geometric. We have moved away from "squircles" to tighter, more professional radii.

- **Standard Elements (Buttons, Inputs, Cards):** 8px corner radius.
- **Large Containers:** 12px corner radius.
- **System Tags/Avatars:** Circular (full-pill) to provide a soft counterpoint to the rigid grid.

Everything else should follow a strict rectangular logic to reinforce the sense of security and architectural stability.

## Components

- **Buttons:** Primary buttons use a solid Indigo fill with white text. Secondary buttons use a subtle Slate-800 fill with a 1px border. No gradients.
- **Input Fields:** Darker than the container background to create a "well" effect. 1px border that shifts to Indigo on focus. Labels use JetBrains Mono for a technical feel.
- **Message Bubbles:** Not traditional bubbles. Use slightly rounded rectangles (8px). Sent messages use the primary Indigo; received messages use a Slate-800 grey.
- **Chips:** Monospace text, 4px radius, low-contrast background. Used for metadata like "Encrypted" or "Verified."
- **Scrollbars:** Custom, ultra-thin Slate-700 bars that only appear on hover to minimize visual clutter.
- **Status Indicators:** Small, crisp 8px dots. Use "Live" pulse animations only for critical real-time connectivity states.