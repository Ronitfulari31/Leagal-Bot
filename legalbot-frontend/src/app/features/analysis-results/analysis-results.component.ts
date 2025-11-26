import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-analysis-results',
  templateUrl: './analysis-results.component.html',
  styleUrls: ['./analysis-results.component.scss'],
  standalone: true,
  imports: [FormsModule,NgIf]
})
export class AnalysisResultsComponent {
  processId: string = '';
  results: any = null;
  loading = false;
  errorMessage = '';

  constructor(private apiService: ApiService) {}

  fetchResults() {
    if (!this.processId.trim()) {
      this.errorMessage = 'Please enter a process ID.';
      this.results = null;
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.apiService.getAnalysisResults(this.processId.trim()).subscribe({
      next: (res: any) => {
        this.results = res;
        this.errorMessage = '';
        this.loading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Failed to fetch results.';
        this.results = null;
        this.loading = false;
      }
    });
  }
}
