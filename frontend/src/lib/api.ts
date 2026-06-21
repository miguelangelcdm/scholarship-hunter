export const API_BASE = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:8000`
  : "http://127.0.0.1:8000";

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export const api = {
  getProfile: () => fetch(`${API_BASE}/profile`).then(handleResponse),
  updateProfile: (data: any) => fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  getScholarships: () => fetch(`${API_BASE}/scholarships`).then(handleResponse),
  getPrograms: () => fetch(`${API_BASE}/programs`).then(handleResponse),
  discardProgram: (id: number) => fetch(`${API_BASE}/programs/${id}/discard`, { method: 'PATCH' }).then(handleResponse),
  discardScholarship: (id: number) => fetch(`${API_BASE}/scholarships/${id}/discard`, { method: 'PATCH' }).then(handleResponse),
  getLastScan: () => fetch(`${API_BASE}/scholarships/last-scan`).then(handleResponse),
  scanScholarships: () => fetch(`${API_BASE}/scholarships/scan`, { method: 'POST' }).then(handleResponse),
  findFunding: (programId: number) => fetch(`${API_BASE}/programs/${programId}/find-funding`, { method: 'POST' }),
  deepScanProgram: (programId: number) => fetch(`${API_BASE}/programs/${programId}/deep-scan`, { method: 'POST' }).then(handleResponse),
  getUniversityDeepDive: (universityName: string) => fetch(`${API_BASE}/universities/${encodeURIComponent(universityName)}/deep-dive`).then(handleResponse),
  draftEssay: (id: number) => fetch(`${API_BASE}/scholarships/${id}/draft`, { method: 'POST' }).then(handleResponse),
  draftOutreach: (id: number) => fetch(`${API_BASE}/scholarships/${id}/outreach`, { method: 'POST' }).then(handleResponse),
  uploadDocument: (docType: string, file: File) => {
    const formData = new FormData();
    formData.append('doc_type', docType);
    formData.append('file', file);
    return fetch(`${API_BASE}/profile/upload`, {
      method: 'POST',
      body: formData
    }).then(handleResponse);
  },
  parseDocument: (docType: string) => fetch(`${API_BASE}/profile/parse-doc/${docType}`, {
    method: 'POST'
  }).then(handleResponse)
};
