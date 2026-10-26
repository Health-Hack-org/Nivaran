# NIVARAN (निवारण)
> **A Clinical Wellness Sanctuary & Habit Recovery Platform**  
> *Developed with precision by **THE HEXA-GRAMS** for Health-Hack 2026.*

---

## 🌿 Overview

**NIVARAN** replaces the "brute-force willpower fallacy" with deterministic biometric calculations and clinical stabilization protocols. Cold-turkey cessation attempts frequently fail because glucose crashes and sympathetic nervous system overdrive deplete prefrontal cortex resolve. 

NIVARAN stabilizes metabolic parameters (BMI, BMR, TDEE, hydration) and aligns them with dopamine rewiring protocols to support sustainable recovery across four clinically structured tracks.

---

## 🧭 Four Recovery Tracks

1. **Dopamine & Digital Detox**
   - Regulate compulsive smartphone usage, infinite algorithmic feeds, and excessive gaming.
   - Core mechanism: Dopamine receptor resensitization, morning blackout windows, screen-free sleep anchors.

2. **Substance Cessation**
   - Structured support for nicotine, alcohol, and mild chemical dependency.
   - Core mechanism: Blood sugar stabilization, physical habit decoupling, urge urge-surfing protocols.

3. **Behavioral Impulses**
   - Address compulsive spending, gaming, and compulsive online behaviors.
   - Core mechanism: 24-hour cooling-off delay barriers, friction insertion, cognitive stimulus substitution.

4. **Metabolic & Nutritional Habits**
   - Overcome emotional eating, late-night binge episodes, and ultra-processed food addiction.
   - Core mechanism: Glucose spike minimization, circadian feeding windows, non-restrictive nutrient density.

---

## ✨ What We Have Built (Current Capabilities)

### 1. Deterministic Biometric & Protocol Engine (`apps/api`)
- **FastAPI REST Backend**: High-performance asynchronous API for clinical syntheses.
- **Biometric Formulas**: Mifflin-St Jeor BMR calculation, Total Daily Energy Expenditure (TDEE), and daily baseline hydration targets.
- **Automatic Clinical Guardrails**: Automatic contraindication detection for hypertension (Zone 2 cardio restrictions), diabetes (zero-fasting mandates), asthma (nasal-only breathing), and joint/knee pain (low-impact kinetic walking).
- **28-Day Clinical Synthesizer**: Generates a personalized 4-phase recovery roadmap:
  - *Phase 1 (Days 1–7)*: Acute Stabilization & Metabolic Baseline
  - *Phase 2 (Days 8–14)*: Dopamine Rewiring & Friction Insertion
  - *Phase 3 (Days 15–21)*: Stress Inoculation & Habit Anchoring
  - *Phase 4 (Days 22–28)*: Neuroplastic Identity & Maintenance

### 2. Database & Data Architecture (`supabase`)
- **PostgreSQL / Supabase Schema**:
  - `user_profiles`: Biometrics, medical flags, chosen recovery track, dietary preferences.
  - `prescriptions`: Deterministic daily tasks, meals, workouts, and clinical rationales.
  - `urge_logs`: Acute craving telemetry, trigger tracking, and severity logging.
  - Row Level Security (RLS) policies for complete privacy.

### 3. Frontend Sanctuary Application (`apps/web`)
- **Next.js 14 App Router + TypeScript + Tailwind CSS**:
  - **Landing Page (`/`)**: Minimalist introduction featuring ambient geometric mandala art.
  - **Explore Protocol Guide (`/explore`)**: Full-width interactive page detailing the neuroscience, safety guardrails, 4 recovery tracks, and a multi-step onboarding modal.
  - **Sanctuary Dashboard (`/dashboard`)**:
    - Real-time metabolic telemetry cards (BMI, BMR, TDEE, water intake).
    - Interactive daily protocol task checklist (`<SpringCheck />` animations).
    - Prescribed meals and customized kinetic exercise routines.
    - Expandable inline profile & biometric updater (`Sidebar.tsx`).
    - Emergency **Acute Urge SOS Modal** with step-by-step parasympathetic breathwork and crisis hotline access.
  - **Custom Micro-Interactions**:
    - `<SpecularButton />`: 3D specular light edge reflection + smooth CSS shimmer sweep.
    - `<BackgroundMandalas />`: Continuous ambient rotating mandalas isolated strictly in the background layer.
    - React Bits `<Stepper />` & `<BranchedMenu />` integrations.

---

## 🔮 What We Are Building Next (Roadmap)

- [ ] **Wearable Sensor Integration**: Continuous sync with Apple HealthKit, Google Health Connect, and smart bands for HRV, resting heart rate, and sleep stage correlation.
- [ ] **AI Recovery Companion**: Crisis-deescalation conversational agent trained on CBT (Cognitive Behavioral Therapy) and urge surfing techniques.
- [ ] **Anonymous Peer Pods**: Zero-identity accountability circles with end-to-end encrypted check-ins.
- [ ] **Relapse Trigger Pattern Analytics**: Predictive alerts identifying elevated craving vulnerability based on skipped meals, poor sleep, or high screen-time days.
- [ ] **Cross-Platform Mobile App**: React Native / Expo client for iOS and Android with push-notification craving alerts.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| **Database** | Supabase (PostgreSQL), Supabase SSR Client |
| **Styling & Motion** | Vanilla CSS, Canvas WebGL2 Specular Shaders, SVG Mandala Generators |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- (Optional) Supabase Project credentials

### 1. Backend Setup
```bash
cd apps/api

# Create & activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (Port 8000)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd apps/web

# Install packages
npm install

# Start development server (Port 3000)
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 The Team
**THE HEXA-GRAMS**  
*Built for Health-Hack 2026*

---

> ### ⚠️ Status: In Development
