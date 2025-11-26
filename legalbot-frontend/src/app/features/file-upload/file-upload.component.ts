import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: true,
  imports: [CommonModule, JsonPipe]
})
export class FileUploadComponent {
  ownerFile: File | null = null;
  tenantFile: File | null = null;
  uploadId: string | null = null;
  processId: string | null = null;
  
  loading = false;
  analysisStage = '';
  errorMessage = '';
  successMessage = '';
  
  ownerResult: any = null;
  tenantResult: any = null;
  comparisonResult: any = null;
  
  @Output() uploaded = new EventEmitter<string>();

  constructor(private api: ApiService) {}

  onDropFile(event: DragEvent, fileType: 'owner' | 'tenant') {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      if (fileType === 'owner') {
        this.ownerFile = files[0];
      } else {
        this.tenantFile = files[0];
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileSelected(event: Event, fileType: 'owner' | 'tenant') {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (fileType === 'owner') {
      this.ownerFile = file;
    } else {
      this.tenantFile = file;
    }
  }

  upload() {
    if (!this.ownerFile || !this.tenantFile) {
      this.errorMessage = 'Please select both files.';
      return;
    }
    this.loading = true;
    this.analysisStage = 'Uploading files...';
    this.errorMessage = '';
    this.successMessage = '';

    this.api.uploadAgreements(this.ownerFile, this.tenantFile).subscribe({
      next: (res: any) => {
        this.uploadId = res.upload_id ?? res.id ?? res.uploadId ?? null;
        this.successMessage = 'Files uploaded successfully!';
        this.loading = false;
        this.uploaded.emit(this.uploadId ?? '');
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Upload failed.';
        this.loading = false;
      }
    });
  }

  // Alias for template compatibility
  onUpload() {
    this.upload();
  }

  startAnalysis() {
    if (!this.uploadId) {
      this.errorMessage = 'No upload ID found.';
      return;
    }
    this.loading = true;
    this.analysisStage = 'Starting analysis...';
    this.errorMessage = '';

    this.api.startAnalysis(this.uploadId).subscribe({
      next: (res: any) => {
        this.processId = res.process_id ?? res.id ?? res.processId ?? null;
        this.analysisStage = 'Analysis in progress...';
        this.pollAnalysisStatus();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Start analysis failed.';
        this.loading = false;
      }
    });
  }

  pollAnalysisStatus() {
    if (!this.processId) return;
    
    const pollInterval = setInterval(() => {
      this.api.getProcessStatus(this.processId!).subscribe({
        next: (res: any) => {
          this.analysisStage = res.stage ?? 'Processing...';
          if (res.status === 'completed' || res.status === 'done') {
            clearInterval(pollInterval);
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
    if (!this.processId) return;
    this.analysisStage = 'Fetching results...';

    this.api.getAnalysisResults(this.processId).subscribe({
      next: (res: any) => {
        this.ownerResult = res.owner_analysis ?? res.doc_a ?? null;
        this.tenantResult = res.tenant_analysis ?? res.doc_b ?? null;
        this.successMessage = 'Analysis completed!';
        this.loading = false;
        this.startComparison();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Failed to fetch results.';
        this.loading = false;
      }
    });
  }

  startComparison() {
    if (!this.ownerFile || !this.tenantFile) return;
    
    this.api.compareFiles(this.ownerFile, this.tenantFile).subscribe({
      next: (res: any) => {
        this.comparisonResult = res;
      },
      error: (err: any) => {
        console.error('Comparison failed', err);
      }
    });
  }

  getProgress(): number {
    if (this.loading && this.analysisStage === 'Uploading files...') return 25;
    if (this.loading && this.analysisStage === 'Starting analysis...') return 50;
    if (this.loading && this.analysisStage === 'Analysis in progress...') return 75;
    if (this.ownerResult && this.tenantResult) return 90;
    if (this.comparisonResult) return 100;
    return 0;
  }
}
