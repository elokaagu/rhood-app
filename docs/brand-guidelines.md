# R/HOOD Brand Guidelines

**Underground Music Platform Design System**

## 🎨 Brand Identity

### Core Concept

R/HOOD is an underground music platform with a **dark, premium aesthetic** inspired by nightclub culture and street art. The design emphasizes:

- Pure black backgrounds for maximum contrast
- Bright lime/yellow-green accents (signature brand color)
- Glowing effects and premium transitions
- Underground, edgy visual language

---

## 🎯 Color Palette

### Primary Colors (HSL Format)

```css
/* Core Brand Colors */
--background: 0 0% 0%; /* Pure black */
--foreground: 0 0% 100%; /* Pure white */
--primary: 75 100% 60%; /* R/HOOD signature yellow-green */
--primary-foreground: 0 0% 0%; /* Black text on primary */

/* UI Framework Colors */
--card: 0 0% 5%; /* Dark gray cards */
--card-foreground: 0 0% 100%; /* White text on cards */
--secondary: 0 0% 10%; /* Dark secondary */
--secondary-foreground: 0 0% 100%; /* White text */
--muted: 0 0% 15%; /* Muted backgrounds */
--muted-foreground: 0 0% 70%; /* Gray text */
--accent: 75 100% 60%; /* Same as primary */
--accent-foreground: 0 0% 0%; /* Black on accent */

/* Interactive Elements */
--border: 0 0% 15%; /* Subtle borders */
--input: 0 0% 10%; /* Input backgrounds */
--ring: 75 100% 60%; /* Focus rings */
--destructive: 0 100% 60%; /* Error red */
```

### Color Usage Rules

- **Primary (Lime/Yellow-Green)**: Buttons, CTAs, highlights, active states
- **Pure Black**: Main background, cards, overlays
- **Pure White**: Primary text, icons
- **Gray Variants**: Secondary text, borders, inactive states
- **Red**: Errors, destructive actions only

---

## 🌈 Gradients

### Brand Gradients

```css
--gradient-primary: linear-gradient(135deg, hsl(75 100% 60%), hsl(80 100% 65%));
--gradient-accent: linear-gradient(135deg, hsl(75 100% 60%), hsl(85 100% 70%));
--gradient-dark: linear-gradient(180deg, hsl(0 0% 5%), hsl(0 0% 0%));
--gradient-image-overlay: linear-gradient(
  180deg,
  transparent 0%,
  hsl(0 0% 0% / 0.9) 100%
);
```

### Gradient Usage

- **Primary Gradient**: Premium buttons, hero sections, highlights
- **Accent Gradient**: Hover states, secondary elements
- **Dark Gradient**: Background variations, cards
- **Image Overlay**: Text readability over images

---

## ✨ Visual Effects

### Glow Effects

```css
--glow-primary: 0 0 40px hsl(75 100% 60% / 0.4);
--glow-accent: 0 0 30px hsl(75 100% 60% / 0.3);
```

### Transitions

```css
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Border Radius

```css
--radius: 0.5rem; /* 8px */
```

---

## 🔤 Typography

### Font Stack

```css
font-family: {
  'display': ['TS-Block-Bold', 'Helvetica Neue', 'sans-serif'],
  'body': ['Helvetica Neue', 'Helvetica', 'sans-serif'],
  'brand': ['TS-Block-Bold', 'Helvetica Neue', 'sans-serif']
}
```

### Typography Hierarchy

- **Brand Text**: TS-Block-Bold for logos and main headings (smaller sizes)
- **Display Text**: TS-Block-Bold for section headings
- **Body Text**: Helvetica Neue for content and UI text

---

## 🧩 Component Patterns

### Button Variants

```tsx
// Primary Button (signature lime color)
variant = "default"; // Primary lime background

// Premium Button (gradient effect)
variant = "premium"; // Gradient background with glow

// Outline Button (transparent with lime border)
variant = "outline"; // Transparent with lime border

// Secondary Button (dark gray)
variant = "secondary"; // Dark gray background
```

### Card Components

- **Background**: `--card` (dark gray)
- **Border**: Subtle `--border` color
- **Backdrop Blur**: For overlays and modals
- **Border Radius**: Consistent `--radius`

### Input Fields

- **Background**: `--input` (dark)
- **Border**: `--border` (subtle)
- **Focus State**: `--ring` (lime outline)
- **Placeholder**: `--muted-foreground`

---

## 📱 Layout Principles

### Spacing System

Use Tailwind's spacing scale consistently:

- **xs**: 4px (gap-1, p-1)
- **sm**: 8px (gap-2, p-2)
- **md**: 16px (gap-4, p-4)
- **lg**: 24px (gap-6, p-6)
- **xl**: 32px (gap-8, p-8)

### Grid & Containers

- **Max Width**: 1280px for main content
- **Padding**: 2rem default container padding
- **Mobile First**: Always design mobile-first responsive

---

## 🎵 Brand Voice & Imagery

### Visual Style

- **High contrast**: Pure black/white with lime accents
- **Underground aesthetic**: Dark, edgy, street-culture inspired
- **Premium feel**: Glows, gradients, smooth animations
- **Music-focused**: DJ culture, club scenes, urban environments

### Image Treatment

- **Overlay Gradients**: Always use image overlays for text readability
- **High Contrast**: Maintain brand contrast standards
- **Aspect Ratios**: 16:9 for hero images, 1:1 for profiles

---

## 🔧 Technical Implementation

### CSS Variables Structure

All colors use HSL format for consistency and theming support.

### Component Architecture

- Use `class-variance-authority` for component variants
- Consistent prop interfaces across components
- Semantic color tokens (never hardcode colors)

### Responsive Design

- Mobile-first approach
- Consistent breakpoints
- Touch-friendly interactive elements (min 44px)

---

## 📋 Brand Checklist

When implementing R/HOOD design:

- ✅ Pure black backgrounds (#000000)
- ✅ Lime/yellow-green primary color (HSL: 75 100% 60%)
- ✅ High contrast text (white on black)
- ✅ Glow effects on interactive elements
- ✅ Smooth transitions (0.3s cubic-bezier)
- ✅ Consistent border radius (8px)
- ✅ Underground/music aesthetic
- ✅ Premium visual effects
- ✅ Mobile-first responsive design

---

## 🎨 Example Component Styles

### Primary Button

```css
background: hsl(75 100% 60%);
color: hsl(0 0% 0%);
border-radius: 0.5rem;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
box-shadow: 0 0 40px hsl(75 100% 60% / 0.4);
```

### Card Component

```css
background: hsl(0 0% 5%);
color: hsl(0 0% 100%);
border: 1px solid hsl(0 0% 15%);
border-radius: 0.5rem;
backdrop-filter: blur(12px);
```

### Input Field

```css
background: hsl(0 0% 10%);
border: 1px solid hsl(0 0% 15%);
color: hsl(0 0% 100%);
border-radius: 0.5rem;
focus: {
  outline: 2px solid hsl(75 100% 60%);
  outline-offset: 2px;
}
```

---

_This brand guide ensures consistent R/HOOD visual identity across all platforms and implementations._
