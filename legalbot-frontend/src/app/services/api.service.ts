import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  // Base API URL (adjust if your backend uses a different host/port)
  private baseUrl = 'http://localhost:8010/api';

  // Upload two agreement files and get upload ID
  uploadAgreements(ownerFile: File, tenantFile: File): Observable<any> {
    const form = new FormData();
    form.append('owner_file', ownerFile);
    form.append('tenant_file', tenantFile);
    return this.http.post<any>(`${this.baseUrl}/upload/agreements`, form);
  }

  // Start processing for an uploadId
  startAnalysis(uploadId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/process/start`, { uploadId });
  }

  // Poll process status
  getProcessStatus(processId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/process/status/${processId}`);
  }

  // Fetch analysis results
  getAnalysisResults(processId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/results/${processId}`);
  }

  // Compare two files (used by ComparisonReportComponent)
  compareFiles(fileA: File, fileB: File) {
    const formData = new FormData();
    formData.append('owner_file', fileA,fileA.name);
    formData.append('tenant_file', fileB,fileB.name);
    
    return this.http.post(`${this.baseUrl}/compare`, formData);
  }

  // Persist user decision (accept / flag) - backend endpoint should be implemented
  submitDecision(processId: string, decision: 'accept' | 'flag'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/process/${processId}/decision`, { decision });
  }
}
