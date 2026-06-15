const API_BASE = "http://127.0.0.1:8000";

export const api = {
  getProfile: () => fetch(`${API_BASE}/profile`).then(res => res.json()),
  updateProfile: (data: any) => fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  getScholarships: () => fetch(`${API_BASE}/scholarships`).then(res => res.json()),
  scanScholarships: () => fetch(`${API_BASE}/scholarships/scan`, { method: 'POST' }).then(res => res.json()),
  draftEssay: (id: number) => fetch(`${API_BASE}/scholarships/${id}/draft`, { method: 'POST' }).then(res => res.json()),
  uploadDocument: (docType: string, file: File) => {
    const formData = new FormData();
    formData.append('doc_type', docType);
    formData.append('file', file);
    return fetch(`${API_BASE}/profile/upload`, {
      method: 'POST',
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    });
  },
  parseDocument: (docType: string) => fetch(`${API_BASE}/profile/parse-doc/${docType}`, {
    method: 'POST'
  }).then(res => {
    if (!res.ok) throw new Error("Parsing failed");
    return res.json();
  })
};
