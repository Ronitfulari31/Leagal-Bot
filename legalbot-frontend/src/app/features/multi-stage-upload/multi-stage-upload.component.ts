import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-multi-stage-upload',
  templateUrl: './multi-stage-upload.component.html',
  styleUrls: ['./multi-stage-upload.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MultiStageUploadComponent {
  fileA: File | null = null;
  fileB: File | null = null;
  uploadId: string | null = null;
  processIdA: string | null = null;
  
  stage: 'upload' | 'processing' | 'results' | 'status' | 'comparison' | 'done' = 'upload';
  loading = false;
  errorMessage = '';
  successMessage = '';
  progress = 0;
  
  fileAName = '';
  fileBName = '';
  
  resultA: any = null;
  resultB: any = null;
  comparisonResult: any = null;

  constructor(private api: ApiService) {}

  onFileASelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fileA = input.files && input.files[0] ? input.files[0] : null;
    this.fileAName = this.fileA?.name ?? '';
  }

  onFileBSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fileB = input.files && input.files[0] ? input.files[0] : null;
    this.fileBName = this.fileB?.name ?? '';
  }

  onFileSelected(event: Event, fileType?: string) {
    // Generic handler that accepts optional fileType parameter
    const input = event.target as HTMLInputElement;
    if (fileType === 'A') {
      this.onFileASelected(event);
    } else if (fileType === 'B') {
      this.onFileBSelected(event);
    } else {
      // Fallback: determine from input name
      if (input.name === 'fileA') {
        this.onFileASelected(event);
      } else if (input.name === 'fileB') {
        this.onFileBSelected(event);
      }
    }
  }

  uploadFiles() {
    if (!this.fileA || !this.fileB) {
      this.errorMessage = 'Please select both files.';
      return;
    }
    this.loading = true;
    this.stage = 'processing';
    this.progress = 25;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.uploadAgreements(this.fileA, this.fileB).subscribe({
      next: (resA: any) => {
        this.uploadId = resA.upload_id ?? resA.id ?? resA.uploadId ?? null;
        this.successMessage = 'Files uploaded successfully!';
        this.progress = 50;
        this.startProcessing();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Upload failed.';
        this.loading = false;
        this.stage = 'upload';
        this.progress = 0;
      }
    });
  }

  startProcessing() {
    if (!this.uploadId) {
      this.errorMessage = 'No upload ID found.';
      return;
    }

    this.api.startAnalysis(this.uploadId).subscribe({
      next: (resA: any) => {
        this.processIdA = resA.process_id ?? resA.id ?? resA.processId ?? null;
        this.progress = 60;
        this.pollProcessStatus();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Start processing failed.';
        this.loading = false;
        this.stage = 'upload';
        this.progress = 0;
      }
    });
  }

  pollProcessStatus() {
    if (!this.processIdA) return;
    
    const pollInterval = setInterval(() => {
      this.api.getProcessStatus(this.processIdA!).subscribe({
        next: (res: any) => {
          if (res.status === 'completed' || res.status === 'done') {
            clearInterval(pollInterval);
            this.progress = 80;
            this.fetchResults();
          }
        },
        error: (err: any) => {
          clearInterval(pollInterval);
          this.errorMessage = 'Status check failed.';
        }
      });
    }, 2000);
  }

  fetchResults() {
    if (!this.processIdA) return;

    this.api.getAnalysisResults(this.processIdA).subscribe({
      next: (resA: any) => {
        this.resultA = resA.owner_analysis ?? resA.doc_a ?? null;
        this.resultB = resA.tenant_analysis ?? resA.doc_b ?? null;
        this.progress = 90;
        this.compareAgreements();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Failed to fetch results.';
        this.loading = false;
        this.stage = 'upload';
        this.progress = 0;
      }
    });
  }

  compareAgreements() {
    if (!this.fileA || !this.fileB) return;

    this.api.compareFiles(this.fileA, this.fileB).subscribe({
      next: (res: any) => {
        this.comparisonResult = res;
        this.progress = 100;
        this.stage = 'results';
        this.loading = false;
        this.successMessage = 'Comparison completed!';
      },
      error: (err: any) => {
        this.errorMessage = 'Comparison failed: ' + (err.error?.detail || err.message);
        this.loading = false;
      }
    });
  }
}
