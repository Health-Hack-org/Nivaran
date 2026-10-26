import {
  BiometricInput,
  PrescriptionResponse,
  UrgeLogRequest,
  UrgeLogResponse
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generate a personalized daily recovery prescription based on user biometrics.
 */
export async function generatePrescription(payload: BiometricInput): Promise<PrescriptionResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/prescriptions/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Unknown error occurred" }));
    throw new Error(errorData.detail || `Failed to generate prescription (${res.status})`);
  }

  return res.json();
}

/**
 * Recalculate profile and regenerate current day prescription.
 */
export async function recalculateProfilePrescription(payload: BiometricInput): Promise<PrescriptionResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/prescriptions/recalculate-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Unknown error occurred" }));
    throw new Error(errorData.detail || `Failed to recalculate prescription (${res.status})`);
  }

  return res.json();
}

/**
 * Log an emergency urge or craving surfing event.
 */
export async function logUrgeEvent(payload: UrgeLogRequest): Promise<UrgeLogResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/urges/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Unknown error occurred" }));
    throw new Error(errorData.detail || `Failed to log urge event (${res.status})`);
  }

  return res.json();
}
