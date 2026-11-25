---
name: GasDirecto Industrial Telematics
colors:
  canvas: '#f4f7fa'
  background: '#f4f7fa'
  surface: '#ffffff'
  surface-dim: '#d6e2ea'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f7fa'
  surface-container: '#eaf4fa'
  surface-container-high: '#d6e2ea'
  surface-container-highest: '#c8ddef'
  on-surface: '#102d43'
  on-surface-variant: '#536777'
  inverse-surface: '#102d43'
  inverse-on-surface: '#f4f7fa'
  outline: '#7a8c99'
  outline-variant: '#d6e2ea'
  border-card: '#d6e2ea'
  border-input: '#7a8c99'
  focus-ring: '#0a86b8'
  primary: '#185686'
  on-primary: '#ffffff'
  primary-container: '#102d43'
  on-primary-container: '#9acbff'
  secondary: '#e78b47'
  on-secondary: '#102d43'
  secondary-container: '#fff2e4'
  on-secondary-container: '#8a4b0f'
  tertiary: '#09a0db'
  tertiary-ink: '#00739e'
  tertiary-container: '#eaf4fa'
  on-tertiary-container: '#00405b'
  error: '#b42336'
  on-error: '#ffffff'
  error-container: '#fdecea'
  on-error-container: '#93000a'
  warning: '#8a4b0f'
  warning-container: '#fff2e4'
  success: '#16734b'
  success-container: '#eaf4fa'
  on-background: '#102d43'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-telemetry:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
rounded:
  chip: 0.5rem
  control: 0.75rem
  card: 1rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 1rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system delivers an operational, high-legibility interface engineered specifically for GLP (liquefied petroleum gas) logistics, delivery dispatch, and vehicle-mounted cabin operations. 

The aesthetic marries **Industrial Functionalism** with **Modern Tactile Utility**:
- **Environment & Rigor:** Designed for in-cab tablet mounts operating under direct solar glare, vehicle vibration, and single-handed glove operation. Contrast ratios systematically exceed WCAG AAA standards on critical metrics.
- **Tone:** Methodical, unwavering, secure, and physically immediate. It eschews gratuitous decorative treatments in favor of heavy visual anchors, unmistakable semantic status indicators, and mechanical tap states.
- **Operational Focus:** Information is layered to eliminate confirmation errors during hazardous material transit and rapid delivery handoffs.

## Colors
The color hierarchy is purpose-built for split-second ambient cognition inside a moving or idling dispatch vehicle.

- **Primary Petroleum Matrix:** 
  - Main Brand / Action Base: `#185686` (Petrol Blue)
  - Deep Anchor / Cabin Night Fallback: `#102D43` (Deep Navy)
- **Secondary Flame / High-Priority Action:**
  - Active Dispatch / Primary CTA: `#E78B47` (Industrial Amber)
  - Primary CTA Foreground Text: `#102D43` (Deep Navy — contrast 5.53:1 WCAG AA compliant)
  - Amber Interactive Glow / Soft Hover: `#F7B76B` (contrast 8.08:1)
  - Amber Tint Base / Alert Pill Surface: `#FFF2E4`
- **Tertiary Cyan Eléctrico / GLP Matrix:**
  - Hydrocarbon Telemetry / Route Highlight: `#09A0DB`
  - Accessible Cyan Text / Ink: `#00739E` (contrast 5.32:1 against white)
  - Metric Accent: `#52C1EA`
  - Subdued Metric Surface: `#EAF4FA`
- **Operational Telemetry & Status:**
  - Success / Delivery Verified: `#16734B`
  - Critical Alert / Valve Lockout / Rejection: `#B42336`
  - Warning / Pressure Deviation / Replenishment Needed: `#8A4B0F`
- **Surfaces & Neutral Baseline:**
  - Canvas Surface: `#F4F7FA` (Anti-glare industrial off-white)
  - High-Readability Card: `#FFFFFF`
  - Card Division / Outline: `#D6E2EA`
  - Input Border: `#7A8C99` (contrast 3.48:1 WCAG 2.1 AA UI component boundary)
  - Focus Ring: `#0A86B8` (contrast 4.11:1)
  - Body Text / High Contrast: `#102D43`
  - Secondary Guidance / Metadata: `#536777`

## Typography
Typographic scale and font pairings are optimized for cabin display mounts viewed from 60 to 90 cm away.

- **Primary Heading (Plus Jakarta Sans):** Delivers distinct geometric apertures and weighted terminals that maintain structural clarity through polycarbonate screen protectors and windshield glare.
- **Operational Data & Body (Inter):** Uses tabular numeral OpenType settings (`tnum`, `cv05`) across all pressure readouts, batch weights, order sizes, and GPS distances. Numerical columns never jitter or shift horizontal alignment during live telemetry feeds.
- **Reading Distance Rule:** `label-telemetry` (32px, Bold, Tabular) must be utilized for live cylinder quantities, remaining tank percentages, and critical address street numbers.

## Layout & Spacing
The layout follows an enlarged touch-target model configured specifically for moving fleet dynamics:

- **Touch Bounds:** Absolute minimum tap zone is 56px by 56px across all mobile and in-cab views. High-frequency actions (e.g., "Confirmar Entrega", "Siguiente Parada") require a minimum touch block height of 64px.
- **Grid Structure:**
  - **In-Cab Tablet (Mounted Landscape):** 8-column layout with 24px gutters and persistent 320px left rail for dispatch routing and emergency stops.
  - **Handheld Courier Mobile (Portrait):** 4-column fluid layout with 16px margins, utilizing bottom-anchored single-hand navigation clusters.

## Elevation & Depth
Depth is expressed through crisp, mechanical separation rather than soft, diffuse blurs, ensuring maximum visibility in high-glare daytime conditions:

- **Surface Tiers:**
  - Level 0 (Base Canvas): `#F4F7FA` flat.
  - Level 1 (Work Surface / Cards): `#FFFFFF` bounded by a 1.5px solid outline (`#D6E2EA`).
  - Level 2 (Floating Action Trays / Persistent Sliders): `#FFFFFF` bounded by `#D6E2EA` accompanied by an ambient, low-blur anchoring shadow: `0 4px 12px rgba(16, 45, 67, 0.08)`.
  - Level 3 (Emergency Modals / Confirmation Sheets): Backdropped by `#102D43` with 65% opacity; card container framed with an active 2px border matching the operation context (Amber `#E78B47` or Rejection Red `#B42336`).
- **Antiglare Contrast:** No translucent glassmorphism or low-contrast decorative drop shadows are permitted on cabin operations screens.

## Shapes
A dual-radius framework balances mechanical stability with tactile ergonomics:

- **Outer Containers & Mission Cards:** 16px (`rounded-card` / `rounded-2xl` in standard Tailwind scale) to clearly delineate modules on rugged screens.
- **Controls & Internal Components:** 12px (`rounded-control` / `rounded-xl`) applied to input fields, list tiles, and secondary action triggers.
- **Anti-Error Tractor Sliders:** Pill-shaped (`rounded-full`) rail geometries with an oversized, 56px-60px circular tactile tractor handle.

## Components

### 1. Anti-Error Confirmation Slider (Tractor Slider)
- **Use Case:** High-consequence actions (e.g., "Confirmar Descarga de GLP", "Iniciar Ruta de Alto Riesgo", "Cerrar Válvula").
- **Specs:** Track height 64px, surface `#EAF4FA`, border 2px solid `#0A86B8`. Tractor puck size 56px with a physical thumb-grip icon in `#FFFFFF` on `#185686` base. Full slide distance requires deliberate drag with haptic detent upon 100% completion.

### 2. Operational Cards
- **Dispatch Order Card:** White `#FFFFFF` container with a 16px radius, 1.5px `#D6E2EA` border. Left-edge status indicator stripe (6px wide) colored dynamically: Amber `#E78B47` (Pending), Cyan `#09A0DB` (In Transit), Green `#16734B` (Delivered).
- **Telemetry Card:** Dark `#102D43` container with Cyan `#09A0DB` metric typography for valve pressure, tank percentage, and real-time flow rate.

### 3. Action Buttons
- **Primary Industrial CTA (Venta Rápida / Despacho / Login):** Amber background `#E78B47`, text `#102D43` (Deep Navy, 5.53:1 contrast), minimum height 56px (60px in cabin mode), radius 12px, font-weight 700. Pressed state shifts to `#F7B76B`.
- **Secondary Operations CTA:** Petrol Blue `#185686`, text `#FFFFFF`, minimum height 56px, radius 12px.
- **Critical Rejection / Abort CTA:** Surface `#FFF2E4`, border 2px solid `#B42336`, text `#B42336`.

### 4. Input Fields & Selectors
- **GLP Quantity & Meter Input:** Minimum height 56px. White `#FFFFFF` background with 1.5px border `#7A8C99`. Focus state transitions border to `#0A86B8` with a 3px outer ring at 20% opacity. Numeric input fields lock to `font-feature-settings: "tnum"` with increment steppers sized at 56px x 56px.

### 5. Cabin Status Chips & Badges
- **Dimensions:** Minimum height 36px, internal horizontal padding 14px, radius 8px.
- **Severity Semaphore:**
  - *Reposición Crítica / Fuga:* Surface `#B42336`, text `#FFFFFF`.
  - *Advertencia de Presión:* Surface `#FFF2E4`, border 1.5px solid `#8A4B0F`, text `#8A4B0F`.
  - *Entrega Conforme:* Surface `#EAF4FA`, border 1.5px solid `#16734B`, text `#16734B`.

### 6. Lists & Waypoints
- Grouped list rows separated by 1px solid `#D6E2EA` divider. Every row provides an explicit, right-anchored tap zone of 56px x 56px minimum for rapid route navigation and status toggling.