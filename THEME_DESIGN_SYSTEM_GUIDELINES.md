# 🎨 NIVARAN Design System & Theme Accessibility Guidelines

> **Standard:** WCAG 2.1 AA Compliance ($\ge 4.5:1$ Normal Text, $\ge 3.0:1$ UI Components/Large Text)  
> **Architecture:** CSS Custom Properties + Tailwind CSS Semantic Token Utilities  
> **Scope:** Monorepo (`apps/web`) – Light Sanctuary & Obsidian Dark Modes  

---

## 📌 1. The Core Problem & Motivation

Jab multiple developers dark/light mode par kaam karte hain ya remote commits pull karte hain, toh text visibility issues aane ke 3 main reasons hote hain:

1. **Hardcoded Hex Values:** E.g., `text-[#2A1503]` ya `text-[#35291F]` bina kisi `dark:` override ke likhna. Yeh dark mode me black-on-black ho jata hai.
2. **Global CSS Overrides Leaking:** E.g., `html.dark h3 { color: #FFFFFF !important; }` kisi light modal ke andar leak hokar white-on-white text bana deta hai.
3. **Arbitrary Opacities:** E.g., `text-[#2A1503]/50` ya `text-white/40` kisi low-contrast background par render hokar washed out aur unreadable ho jata hai.

Is problem ko permanent solve karne ke liye, **NIVARAN Design System Tokens** implement kiye gaye hain.

---

## 🏛️ 2. Semantic Token Dictionary

Sabhi UI components ko ab se **inhi semantic classes** ka use karna hai. Yeh classes Tailwind config (`tailwind.config.ts`) aur CSS variables (`globals.css`) me mapped hain aur **theme switch hone par automatically adapt ho jati hain (zero extra code needed)**:

| Semantic Class | Description | Light Mode Value | Dark Mode Value | WCAG AA Contrast |
| :--- | :--- | :--- | :--- | :--- |
| `bg-background` | Page canvas background | `#F8F7F4` | `#161310` | — |
| `text-foreground` | Primary body text & headings | `#2D221A` | `#F5EFEB` | **14.5:1** (Pass) |
| `text-foreground-muted` | Supporting text & descriptions | `#6E5D52` | `#DDD4CA` | **5.9:1** (Pass) |
| `text-foreground-faint` | Captions & inactive tabs | `#8C7B70` | `#A8988B` | **4.6:1** (Pass) |
| `bg-card` | Surface cards & containers | `#FFFFFF` | `#221C17` | — |
| `text-card-foreground` | Content inside cards | `#2D221A` | `#F5EFEB` | **15.5:1** (Pass) |
| `bg-card-elevated` | Inset boxes, chips, secondary cards | `#F0ECE7` | `#2B231D` | — |
| `bg-modal` | Modal dialog cards (SOS, Bio edit) | `#FFFDF9` | `#1F1915` | — |
| `text-modal-foreground`| Text inside modal dialogs | `#2D221A` | `#FAF6F0` | **15.3:1** (Pass) |
| `bg-primary` | Primary action buttons | `#8C6A4F` | `#C69A70` | — |
| `text-primary-foreground`| Text on primary buttons | `#FFFFFF` | `#161310` | **4.9:1** (Pass) |
| `bg-secondary` | Secondary brand elements | `#66350F` | `#D8AA80` | — |
| `text-secondary-foreground`| Text on secondary elements | `#FFFFFF` | `#161310` | **10.1:1** (Pass) |
| `bg-destructive` | Danger, crisis, SOS elements | `#962D2D` | `#FDA4AF` | — |
| `text-destructive-foreground`| Text on danger buttons | `#FFFFFF` | `#161310` | **7.8:1** (Pass) |
| `border-border` | Subtle component borders | `#EAE5DE` | `rgba(255,255,255,0.12)` | — |
| `border-input` | Input borders & checkboxes | `#EAE5DE` | `rgba(255,255,255,0.16)` | — |

---

## ⚡ 3. The 5 Golden Rules of Theme Safety

### ❌ Rule 1: Never Hardcode Hex Colors for Text
```tsx
// ❌ WRONG (Invisible in Dark Mode):
<h3 className="text-[#2A1503] font-bold">Protocol Title</h3>

// ❌ WRONG (Invisible in Light Mode):
<p className="text-white font-medium">Daily summary</p>

// ✅ CORRECT (Automatically adapts to Light & Dark):
<h3 className="text-foreground font-bold">Protocol Title</h3>
<p className="text-foreground-muted font-medium">Daily summary</p>
```

---

### 🛡️ Rule 2: Always Pair Backgrounds with their Semantic Foreground
Jab bhi aap kisi element par background class lagate hain, text color hamesha uske matching foreground token se hona chahiye:

```tsx
// ✅ Correct Pairings:
<div className="bg-card text-card-foreground"> ... </div>
<div className="bg-modal text-modal-foreground"> ... </div>
<button className="bg-primary text-primary-foreground"> ... </button>
<button className="bg-destructive text-destructive-foreground"> ... </button>
```

---

### 🚫 Rule 3: Avoid Low-Opacity Text Modifiers on Dynamic Surfaces
Tailwind ke `/50` ya `/60` opacity modifiers dynamic backgrounds par unreadable ho jate hain.
```tsx
// ❌ WRONG (Washed out and unreadable):
<span className="text-[#2A1503]/50">Step 1 of 4</span>

// ✅ CORRECT (WCAG AA Compliant):
<span className="text-foreground-muted">Step 1 of 4</span>
```

---

### 🪟 Rule 4: Modals Must Explicitly Declare Surface Tokens
Modal overlays ke peeche backdrop blur hota hai. Modal card container par hamesha `bg-modal text-modal-foreground` hona zaroori hai taaki global rules uske andar leak na karein:

```tsx
// ✅ Guaranteed Modal Card Structure:
<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center">
  <div className="bg-modal text-modal-foreground border border-border rounded-3xl shadow-2xl p-6">
    <h2 className="text-modal-foreground font-black text-xl">Title</h2>
    <p className="text-foreground-muted text-sm">Description...</p>
  </div>
</div>
```

---

### 🔄 Rule 5: Run Pre-Merge Automated Audit Before Every Commit
Har commit ya pull ke baad automated contrast auditor run karein:

```bash
npm --prefix apps/web run audit:theme
```

---

## 🤖 4. Automated Contrast & Anti-Pattern Audit Tool

Humne ek dedicated automated audit script banaya hai:
📁 [`apps/web/scripts/audit-theme-contrast.mjs`](file:///c:/Users/adity/OneDrive/Desktop/Projects/HEALTH-HACK--NIVARAN/Nivaran/apps/web/scripts/audit-theme-contrast.mjs)

Yeh script do vital tests perform karta hai:
1. **WCAG 2.1 AA Mathematical Contrast Ratio Calculation:**
   $$\text{Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}$$
   Sare light aur dark token pairs ka luminance calculate karke verify karta hai ki normal text $\ge 4.5:1$ aur button text $\ge 3.0:1$ standard meet kar rahe hain ya nahi.
2. **Codebase AST Anti-Pattern Scanner:**
   `src/app` aur `src/components` ke sabhi files ko scan karta hai aur unpaired `text-white` ya hardcoded `text-[#2A1503]` jaise risky patterns ko line number ke sath flag karta hai.

### Kaise chalayein:
```bash
npm --prefix apps/web run audit:theme
```

---

## 📋 5. Pre-Merge Pull Request (PR) Checklist

Kisi bhi teammate ka code merge karne se pehle yeh checklist verify karein:

- [ ] **No Hardcoded Hex Colors:** Kya PR me koi `text-[#...]` bina dark variant ke use hua hai?
- [ ] **Semantic Tokens Used:** Kya cards me `bg-card text-card-foreground` aur modals me `bg-modal text-modal-foreground` use hua hai?
- [ ] **Dual-Theme Visual Inspection:**
  - [ ] Light Mode (`html.light`) me check kiya (all text crisp and readable).
  - [ ] Dark Mode (`html.dark`) me check kiya (no black-on-black or washed-out white text).
  - [ ] SOS Modal open karke teeno tabs check kiye.
  - [ ] Sanctuary Drawer / Sidebar open karke sign out button aur profile labels check kiye.
- [ ] **Automated Script Passed:** `npm --prefix apps/web run audit:theme` zero errors ke sath pass hua.
- [ ] **TypeScript Check Passed:** `npx --prefix apps/web tsc --noEmit` cleanly exit 0 hua.

---

## 🚀 6. GitHub Actions CI Automation (Optional Setup)

Agar aap team repository me automated GitHub Action lagana chahte hain jo har PR par automatically contrast test kare, toh `.github/workflows/theme-check.yml` create karein:

```yaml
name: Theme & Accessibility Contrast Check

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  contrast-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: npm --prefix apps/web install
      - name: TypeScript Validation
        run: npx --prefix apps/web tsc --noEmit
      - name: Run WCAG Contrast Audit
        run: npm --prefix apps/web run audit:theme
```

---
*Created for **THE HEXA-GRAMS** · NIVARAN Sanctuary System.*

