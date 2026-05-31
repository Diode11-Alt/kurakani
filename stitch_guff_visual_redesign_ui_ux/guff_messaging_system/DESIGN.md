---
name: GUFF Secure
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#1e00a9'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#b1afff'
  inverse-primary: '#c3c0ff'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#754900'
  tertiary: '#1202ab'
  on-tertiary: '#ffffff'
  tertiary-container: '#302fbf'
  on-tertiary-container: '#aeb0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#fdb965'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2dbe'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  chat-text:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  chat-gap: 2px
  chat-group-gap: 12px
---

## Brand & Style

GUFF is a high-fidelity secure messaging platform that balances military-grade security with a sophisticated corporate aesthetic. The brand personality is **authoritative, tranquil, and technologically advanced**. 

The design style is **Modern Corporate with Glassmorphic accents**. It utilizes a "Safety through Clarity" approach: clean, structured layouts that leverage high-contrast typography and subtle depth to convey reliability. The emotional response should be one of "Protected Transparency"—the user feels the weight of the security (encrypted badges, lock icons) while enjoying a fluid, premium consumer experience.

## Colors

The palette is anchored by **Deep Indigo (#3525cd)**, representing digital trust and stability. This is supported by a sophisticated range of cool grays and slate neutrals that define the interface's structure. 

- **Primary:** Used for brand identity, active navigation states, and primary actions.
- **Secondary (Amber/Gold):** Reserved for specific attention-driven elements like community hubs or status indicators.
- **Surface Strategy:** The system uses a multi-tier neutral palette. `surface-container-lowest` (Pure White) is used for elevated cards, while `surface-container-low` provides a subtle base for background sections.
- **Semantic Accents:** An error red is used sparingly for destructive actions (logout, notifications).

## Typography

The system uses **Inter** exclusively, leaning on its utilitarian and systematic nature. The hierarchy is established through dramatic shifts in weight and letter spacing:

- **Display & Headlines:** Use Extra Bold (800) or Bold (700) with negative letter-spacing to create a "locked-in," secure feel.
- **Body & Chat:** Optimized for legibility at 15px/16px to ensure long-form encrypted conversations are comfortable to read.
- **Functional Labels:** High tracking (0.05em) and semi-bold weights distinguish metadata from content.

## Layout & Spacing

The system uses a **Bento-style Grid** and a **Fixed Sidebar** model.

- **Grid:** On desktop, use a 3-column layout where the main feed spans 2 columns and the utility sidebar spans 1.
- **Margins:** Standard page margins are `xl` (32px), with internal component spacing following an 8px rhythm.
- **Mobile Adaptivity:** The sidebar collapses into a floating bottom navigation bar. A "Center-Action" model is used for the mobile nav, placing a large primary action (+) in the center of the viewport.
- **Glassmorphism:** Navigation bars (Top and Bottom) on mobile use a 12px backdrop blur to maintain context with the content scrolling beneath.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering and Border Refinement** rather than heavy shadows.

- **Level 0 (Background):** `bg-background` (#f7f9fb).
- **Level 1 (Sub-containers):** `surface-container-low` with a very subtle `outline-variant/20`.
- **Level 2 (Featured Cards):** `surface-container-lowest` (White) with a `shadow-sm` and a 10% opacity border.
- **Overlay Elements:** Mobile navigation and floating buttons use `shadow-xl` to appear distinctly above the content plane.
- **Contextual Depth:** Semi-transparent overlays (e.g., gradients over images) are used to maintain text contrast on rich media.

## Shapes

The shape language is **Modern Rounded**. 

- **Primary Containers:** 12px to 16px (rounded-xl) for cards and sections.
- **Interactive Elements:** Buttons use 12px (rounded-xl) for a "squircle" feel that is friendly yet precise.
- **Navigation Items:** Active states use 8px (rounded-lg).
- **Avatars:** Strictly `rounded-xl` (squircles) to distinguish from generic round social media profiles, reinforcing the "node" metaphor.

## Components

- **Buttons:** Primary buttons are high-contrast (Primary/White) with bold text. Secondary buttons use ghost styling with the primary color as an outline.
- **Encrypted Badges:** Small, pill-shaped indicators (`label-md`) with a lock icon. Use `primary-fixed/30` background for a subtle "verified" look.
- **Sidebar Nav:** Vertical items with 16px horizontal padding. Active state is indicated by a primary color right-border and bold text.
- **User Cards:** Integrated into the sidebar with a `surface-container-low` background, featuring a profile photo, status label, and an integrated logout action.
- **Input/Progress Bars:** Clean, horizontal tracks using `on-primary-container/20` for the background and solid `on-primary-container` for the progress fill.
- **Bento Cards:** Integrated media (aspect-video) at the top, followed by a title section and a footer action row.