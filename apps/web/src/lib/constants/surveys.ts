import { TrackType } from "@/types";

export interface SurveyOption {
  label: string;
  score: number; // 0, 1, 2, 3
  description: string;
}

export interface SurveyQuestion {
  id: number;
  dimension: string;
  question: string;
  triggerCategory: string;
}

export const SURVEY_OPTIONS: SurveyOption[] = [
  { label: "Never / Rarely", score: 0, description: "Infrequent or negligible impact" },
  { label: "Sometimes", score: 1, description: "Occasional mild pull or occurrence" },
  { label: "Often", score: 2, description: "Frequent routine habit or friction" },
  { label: "Almost Always", score: 3, description: "Dominant compulsion or acute reflex" },
];

export const TRACK_DIAGNOSTIC_SURVEYS: Record<TrackType, { title: string; subtitle: string; questions: SurveyQuestion[] }> = {
  sm: {
    title: "Mobile & Screen Time Diagnostic",
    subtitle: "Clinical baseline assessment of digital dopamine dependency and attention fragmentation.",
    questions: [
      {
        id: 1,
        dimension: "Morning Reflex",
        question: "Do you reach for your phone or scroll social feeds within the first 15 minutes of waking up?",
        triggerCategory: "Morning Screen Urge",
      },
      {
        id: 2,
        dimension: "Loss of Boundaries",
        question: "Do you intend to check notifications for a minute and end up scrolling feeds for 30+ minutes?",
        triggerCategory: "Time Distortion & Infinite Scrolls",
      },
      {
        id: 3,
        dimension: "Stress Escapism",
        question: "Do you automatically unlock your phone whenever you experience boredom, work stress, or anxiety?",
        triggerCategory: "Emotional / Stress Escapism",
      },
      {
        id: 4,
        dimension: "Sleep Interference",
        question: "Does bedtime screen usage delay your intended sleep schedule or disrupt your sleep quality?",
        triggerCategory: "Late-Night Screen Exposure",
      },
      {
        id: 5,
        dimension: "Withdrawal Friction",
        question: "Do you feel uneasy, restless, or check phantom vibrations when your phone is away or out of battery?",
        triggerCategory: "Digital Separation Anxiety",
      },
      {
        id: 6,
        dimension: "Task Neglect",
        question: "Have social apps or video feeds caused you to postpone, rush, or miss important responsibilities?",
        triggerCategory: "Productivity & Focus Procrastination",
      },
      {
        id: 7,
        dimension: "Failed Restraint",
        question: "Have you attempted screen timers or app restrictions only to override, ignore, or delete them?",
        triggerCategory: "Boundary Override Loops",
      },
      {
        id: 8,
        dimension: "Physical Strain",
        question: "Do you experience dry eyes, neck tension, postural aches, or cognitive fog after long screen sessions?",
        triggerCategory: "Somatic Screen Fatigue",
      },
      {
        id: 9,
        dimension: "Guilt & Regret",
        question: "Do you feel remorse or dissatisfaction after closing apps and reviewing your daily screen hours?",
        triggerCategory: "Post-Scroll Remorse",
      },
      {
        id: 10,
        dimension: "Dopamine Baseline",
        question: "Do offline, non-digital activities (reading, conversations, walking) feel bland or under-stimulating?",
        triggerCategory: "Low Dopamine Basal Sensitivity",
      },
    ],
  },
  sa: {
    title: "Smoking & Alcohol Cessation Diagnostic",
    subtitle: "Clinical baseline assessment of neurochemical reliance, oral habit loops, and withdrawal friction.",
    questions: [
      {
        id: 1,
        dimension: "Morning Reflex",
        question: "Do you experience an acute craving for a smoke or drink shortly after waking up in the morning?",
        triggerCategory: "Morning Nicotine / Substance Spike",
      },
      {
        id: 2,
        dimension: "Loss of Boundaries",
        question: "Once you start smoking or drinking, do you find it difficult to stop at your intended limit?",
        triggerCategory: "Compulsive Consumption Runaway",
      },
      {
        id: 3,
        dimension: "Stress Escapism",
        question: "Is smoking or alcohol your automatic go-to reflex whenever facing social pressure, anger, or stress?",
        triggerCategory: "Stress & Anxiety Coping Loop",
      },
      {
        id: 4,
        dimension: "Sleep Interference",
        question: "Do evening drinks or late smokes impair your restorative deep sleep, heart rate, or morning energy?",
        triggerCategory: "Autonomic Sleep Disturbance",
      },
      {
        id: 5,
        dimension: "Withdrawal Friction",
        question: "Do you become noticeably irritable, anxious, or unable to concentrate when unable to consume?",
        triggerCategory: "Acute Withdrawal Agitation",
      },
      {
        id: 6,
        dimension: "Task Neglect",
        question: "Has smoking or drinking compromised your physical workouts, work appointments, or domestic duties?",
        triggerCategory: "Physical & Functional Lethargy",
      },
      {
        id: 7,
        dimension: "Failed Restraint",
        question: "Have you set quit dates or promised yourself a detox period only to relapse during craving waves?",
        triggerCategory: "Craving Wave Vulnerability",
      },
      {
        id: 8,
        dimension: "Physical Strain",
        question: "Do you experience pulmonary tightness, coughing, morning nausea, or physical fatigue?",
        triggerCategory: "Pulmonary & Somatic Burden",
      },
      {
        id: 9,
        dimension: "Guilt & Regret",
        question: "Do you conceal the amount or frequency from close family and friends, or feel self-reproach afterward?",
        triggerCategory: "Concealment & Moral Distress",
      },
      {
        id: 10,
        dimension: "Dopamine Baseline",
        question: "Do you feel that celebrations, unwinding, or social gatherings are incomplete without a smoke or drink?",
        triggerCategory: "Conditioned Social Reward Association",
      },
    ],
  },
  gm: {
    title: "Compulsive Gaming Reset Diagnostic",
    subtitle: "Clinical baseline assessment of hyper-stimulatory reward loops and virtual escapism.",
    questions: [
      {
        id: 1,
        dimension: "Morning Reflex",
        question: "Is checking daily game rewards, leaderboards, or starting a session one of your first morning thoughts?",
        triggerCategory: "Early Virtual Hook",
      },
      {
        id: 2,
        dimension: "Loss of Boundaries",
        question: "Do 'one quick game' or 'just 20 minutes' sessions consistently morph into multiple hours?",
        triggerCategory: "Flow-State Entrapment",
      },
      {
        id: 3,
        dimension: "Stress Escapism",
        question: "Do you turn to competitive or immersive gaming primarily to avoid facing real-life challenges or emotions?",
        triggerCategory: "Virtual Achievement Escape",
      },
      {
        id: 4,
        dimension: "Sleep Interference",
        question: "Do late-night gaming sessions frequently cause you to stay up past 2:00 AM and wake up depleted?",
        triggerCategory: "Circadian Circulatory Disruption",
      },
      {
        id: 5,
        dimension: "Withdrawal Friction",
        question: "Do you feel agitated, angry, or empty when disconnected, lagging, or prevented from playing?",
        triggerCategory: "Disconnection Dysphoria",
      },
      {
        id: 6,
        dimension: "Task Neglect",
        question: "Have career study, professional work, meals, or hygiene been postponed for in-game quests?",
        triggerCategory: "Real-World Responsibility Deferral",
      },
      {
        id: 7,
        dimension: "Failed Restraint",
        question: "Have you uninstalled games or set account blockers only to reinstall or seek alternative games?",
        triggerCategory: "Reinstallation & Relapse Cycle",
      },
      {
        id: 8,
        dimension: "Physical Strain",
        question: "Do you suffer from wrist pain, tension headaches, postural strain, or depleted physical fitness?",
        triggerCategory: "Musculoskeletal & Ocular Strain",
      },
      {
        id: 9,
        dimension: "Guilt & Regret",
        question: "Do you experience remorse when looking at your total playtime counter or in-game spending?",
        triggerCategory: "Playtime Sunk-Cost Regret",
      },
      {
        id: 10,
        dimension: "Dopamine Baseline",
        question: "Does real life seem dull, slow-paced, and lacking the instant gratification of video games?",
        triggerCategory: "Hypo-Dopaminergic Real-World Apathy",
      },
    ],
  },
  jf: {
    title: "Junk Food & Sugar Deconditioning Diagnostic",
    subtitle: "Clinical baseline assessment of metabolic reward conditioning and emotional hunger spikes.",
    questions: [
      {
        id: 1,
        dimension: "Morning Reflex",
        question: "Do you start your morning craving sugary drinks, refined pastries, or ultra-processed breakfast items?",
        triggerCategory: "Morning Hyperglycemic Spike",
      },
      {
        id: 2,
        dimension: "Loss of Boundaries",
        question: "Once you take a small bite of snacks or sweets, do you end up finishing the entire packet or container?",
        triggerCategory: "Hyper-Palatable Binge Loop",
      },
      {
        id: 3,
        dimension: "Stress Escapism",
        question: "Do you order fast food, takeout, or high-sugar snacks as a psychological reward or emotional comfort?",
        triggerCategory: "Emotional & Stress Eating",
      },
      {
        id: 4,
        dimension: "Sleep Interference",
        question: "Do late-night snacks or heavy processed dinners cause heartburn, restless sleep, or morning grogginess?",
        triggerCategory: "Nocturnal Metabolic Distress",
      },
      {
        id: 5,
        dimension: "Withdrawal Friction",
        question: "Do you experience shakiness, intense mood swings, or severe brain fog when sugar or fast food is absent?",
        triggerCategory: "Sugar Dip Withdrawal Agitation",
      },
      {
        id: 6,
        dimension: "Task Neglect",
        question: "Do heavy post-meal food comas cause severe afternoon lethargy, brain fog, and lost work momentum?",
        triggerCategory: "Postprandial Fatigue",
      },
      {
        id: 7,
        dimension: "Failed Restraint",
        question: "Have you attempted structured clean eating plans only to abandon them when sudden cravings hit?",
        triggerCategory: "Craving Surrender Pattern",
      },
      {
        id: 8,
        dimension: "Physical Strain",
        question: "Do you suffer from chronic bloating, acid reflux, skin flare-ups, or systemic inflammation?",
        triggerCategory: "Gastrointestinal & Metabolic Inflammation",
      },
      {
        id: 9,
        dimension: "Guilt & Regret",
        question: "Do you hide snacks from family members or experience intense guilt and self-criticism after eating?",
        triggerCategory: "Secretive Snacking & Food Guilt",
      },
      {
        id: 10,
        dimension: "Dopamine Baseline",
        question: "Do whole, natural foods (salads, plain fruits, lentils) taste unrewarding and bland without added seasoning/sugar?",
        triggerCategory: "Blunted Taste & Reward Palate",
      },
    ],
  },
};

export interface DiagnosticResult {
  rawScore: number;
  severityScore: number; // 1.0 to 10.0
  severityLevel: "minor" | "moderate" | "severe";
  targetDays: 21 | 35 | 54;
  classificationTitle: string;
  timelineName: string;
  topTriggers: { dimension: string; triggerCategory: string; score: number }[];
  surveyResponses: { questionId: number; question: string; score: number; answerLabel: string }[];
}

/**
 * Deterministic Clinical Diagnostic Calculation:
 * Raw Score = Sum of 10 questions (0 to 30)
 * Severity Score = max(1.0, round((Raw Score / 30) * 10, 1))
 * - 1.0 to 3.5: minor -> target_days = 21 (21-Day Rapid Habit Reset)
 * - 3.6 to 7.0: moderate -> target_days = 35 (35-Day Neuroplastic Rewiring)
 * - 7.1 to 10.0: severe -> target_days = 54 (54-Day Deep Stabilization & Tapering Protocol)
 */
export function calculateDiagnosticScore(
  track: TrackType,
  answers: Record<number, number>
): DiagnosticResult {
  const survey = TRACK_DIAGNOSTIC_SURVEYS[track] || TRACK_DIAGNOSTIC_SURVEYS.sm;
  let rawScore = 0;
  const surveyResponses: DiagnosticResult["surveyResponses"] = [];
  const triggerList: { dimension: string; triggerCategory: string; score: number }[] = [];

  survey.questions.forEach((q) => {
    const score = answers[q.id] ?? 0;
    rawScore += score;
    const option = SURVEY_OPTIONS.find((o) => o.score === score) || SURVEY_OPTIONS[0];

    surveyResponses.push({
      questionId: q.id,
      question: q.question,
      score,
      answerLabel: option.label,
    });

    if (score >= 2) {
      triggerList.push({
        dimension: q.dimension,
        triggerCategory: q.triggerCategory,
        score,
      });
    }
  });

  // Calculate normalized 1.0 - 10.0 scale
  const normalized = (rawScore / 30) * 10;
  const severityScore = Number(Math.max(1.0, Math.round(normalized * 10) / 10).toFixed(1));

  let severityLevel: "minor" | "moderate" | "severe" = "moderate";
  let targetDays: 21 | 35 | 54 = 35;
  let classificationTitle = "Moderate Compulsive Loop";
  let timelineName = "35-Day Neuroplastic Rewiring";

  if (severityScore <= 3.5) {
    severityLevel = "minor";
    targetDays = 21;
    classificationTitle = "Minor Habitual Dependency";
    timelineName = "21-Day Rapid Habit Reset";
  } else if (severityScore <= 7.0) {
    severityLevel = "moderate";
    targetDays = 35;
    classificationTitle = "Moderate Compulsive Loop";
    timelineName = "35-Day Neuroplastic Rewiring";
  } else {
    severityLevel = "severe";
    targetDays = 54;
    classificationTitle = "High Neurological Dependency";
    timelineName = "54-Day Deep Stabilization & Tapering Protocol";
  }

  // Sort triggers by score descending and take top 2-3
  triggerList.sort((a, b) => b.score - a.score);
  const topTriggers = triggerList.slice(0, 3);

  // If user scored low on everything, provide general focus areas
  if (topTriggers.length === 0) {
    topTriggers.push(
      { dimension: survey.questions[0].dimension, triggerCategory: survey.questions[0].triggerCategory, score: answers[1] ?? 1 },
      { dimension: survey.questions[1].dimension, triggerCategory: survey.questions[1].triggerCategory, score: answers[2] ?? 1 }
    );
  }

  return {
    rawScore,
    severityScore,
    severityLevel,
    targetDays,
    classificationTitle,
    timelineName,
    topTriggers,
    surveyResponses,
  };
}

