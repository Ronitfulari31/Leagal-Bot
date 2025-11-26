import { Component, NgModule } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';  // Import FormsModule

@Component({
  selector: 'app-processing-status',
  templateUrl: './processing-status.component.html',
  styleUrls: ['./processing-status.component.scss'],
  standalone: true,
  imports: [NgIf,FormsModule]
})
export class ProcessingStatusComponent {
  processId: string = '';
  status: string | null = null;
  errorMessage: string = '';
  loading = false;

  constructor(private apiService: ApiService) {}

  checkStatus() {
    if (!this.processId.trim()) {
      this.errorMessage = 'Please enter process ID.';
      this.status = null;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.apiService.getProcessStatus(this.processId.trim()).subscribe({
      next: (res: any) => {
        this.status = res.status;
        this.errorMessage = '';
        this.loading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Failed to get status.';
        this.status = null;
        this.loading = false;
      }
    });
  }
}
