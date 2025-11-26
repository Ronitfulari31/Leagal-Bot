import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { interval, Subscription, firstValueFrom } from 'rxjs';

export interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error' | 'loading';
  icon: string;
}

export interface AnalysisData {
  uploadId: string;
  processId: string;
  fileA: File | null;
  fileB: File | null;
  status?: string;
  ownerResults?: any;
  tenantResults?: any;
  comparisonResults?: any;
}

interface ComparisonResponse {
  comparison_report?: any;
  [key: string]: any;
}


@Component({
  selector: 'app-agreement-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agreement-analysis.component.html',
  styleUrls: ['./agreement-analysis.component.scss']
})
export class AgreementAnalysisComponent implements OnInit, OnDestroy {
  analysisData: AnalysisData = {
    uploadId: '',
    processId: '',
    fileA: null,
    fileB: null
  };

  // File upload
  ownerFile: File | null = null;
  tenantFile: File | null = null;
  
  
  // UI state
  currentStep = 0;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // UI stage used by template
  stage: 'upload' | 'analysis' | 'processing' | 'results' | 'comparison' | 'report' = 'upload';
  
  // Loading Progress Properties
  uploadProgress = 0;
  processingProgress = 0;
  processingStep = 0;
  
  // Status polling
  private statusPollingSubscription?: Subscription;
  
  // Analysis steps
  steps: AnalysisStep[] = [
    {
      id: 'upload',
      title: 'Upload Agreements',
      description: 'Select and upload both owner and tenant agreement files',
      status: 'active',
      icon: '📁'
    },
    {
      id: 'analysis',
      title: 'Start Analysis',
      description: 'Begin processing and analyzing the uploaded documents',
      status: 'pending',
      icon: '🔍'
    },
    {
      id: 'processing',
      title: 'Processing Status',
      description: 'Monitor the progress of document analysis',
      status: 'pending',
      icon: '⚙️'
    },
    {
      id: 'results',
      title: 'Analysis Results',
      description: 'Review extracted text, clauses, and risk assessment',
      status: 'pending',
      icon: '📊'
    },
    {
      id: 'comparison',
      title: 'Auto Comparison',
      description: 'Automatically comparing agreements and identifying differences',
      status: 'pending',
      icon: '🔄'
    },
    {
      id: 'report',
      title: 'Comparison Report',
      description: 'View detailed comparison results and recommendations',
      status: 'pending',
      icon: '📋'
    }
  ];

  private apiService = inject(ApiService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    // Reset if needed
    this.analysisData = {
      uploadId: '',
      processId: '',
      fileA: null,
      fileB: null
    };
  }

  ngOnDestroy() {
    this.stopStatusPolling();
  }

  // File upload handlers
  onOwnerFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.isValidFile(file)) {
      this.ownerFile = file;
      this.clearMessages();
      this.updateStepStatus('upload', 'active');
    } else {
      this.errorMessage = 'Please select a valid PDF or DOCX file for the owner agreement.';
    }
  }

  onTenantFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.isValidFile(file)) {
      this.tenantFile = file;
      this.clearMessages();
      this.updateStepStatus('upload', 'active');
    } else {
      this.errorMessage = 'Please select a valid PDF or DOCX file for the tenant agreement.';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDropFile(event: DragEvent, type: 'owner' | 'tenant') {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && this.isValidFile(file)) {
      if (type === 'owner') {
        this.ownerFile = file;
      } else {
        this.tenantFile = file;
      }
      this.clearMessages();
      this.updateStepStatus('upload', 'active');
    } else {
      this.errorMessage = 'Please drop a valid PDF or DOCX file.';
    }
  }

  // Clear file methods
  clearOwnerFile() {
    this.ownerFile = null;
    this.clearMessages();
    this.updateStepStatus('upload', 'active');
    // Reset file input
    const ownerFileInput = document.getElementById('ownerFile') as HTMLInputElement;
    if (ownerFileInput) {
      ownerFileInput.value = '';
    }
  }

  clearTenantFile() {
    this.tenantFile = null;
    this.clearMessages();
    this.updateStepStatus('upload', 'active');
    // Reset file input
    const tenantFileInput = document.getElementById('tenantFile') as HTMLInputElement;
    if (tenantFileInput) {
      tenantFileInput.value = '';
    }
  }

  clearAllFiles() {
    this.ownerFile = null;
    this.tenantFile = null;
    this.clearMessages();
    this.updateStepStatus('upload', 'active');
    // Reset file inputs
    const ownerFileInput = document.getElementById('ownerFile') as HTMLInputElement;
    const tenantFileInput = document.getElementById('tenantFile') as HTMLInputElement;
    if (ownerFileInput) ownerFileInput.value = '';
    if (tenantFileInput) tenantFileInput.value = '';
  }

  // Main flow methods
  async uploadAgreements() {
    if (!this.ownerFile || !this.tenantFile) {
      this.errorMessage = 'Please select both owner and tenant agreement files.';
      return;
    }

    // Ensure files are kept for later comparison
    this.analysisData.fileA = this.ownerFile!;
    this.analysisData.fileB = this.tenantFile!;

    this.isLoading = true;
    this.errorMessage = '';
    this.updateStepStatus('upload', 'loading');
    
    try {
      // Simulate upload progress
      await this.simulateUploadProgress();
      
      const response = await firstValueFrom(this.apiService.uploadAgreements(this.ownerFile!, this.tenantFile!));
      this.analysisData.uploadId = response.uploadId ?? response.upload_id ?? response.id;
      this.successMessage = 'Agreements uploaded successfully!';
      this.completeStep('upload');

      // set stage for template
      this.stage = 'analysis';

      // Add transition delay before starting analysis
      await this.delay(1000); // 1 second delay
      this.activateStep('analysis');
    } catch (error: any) {
      this.errorMessage = error.error?.detail || 'Upload failed. Please try again.';
      this.updateStepStatus('upload', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  async startAnalysis() {
    if (!this.analysisData.uploadId) {
      this.errorMessage = 'No upload ID found. Please upload agreements first.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.updateStepStatus('analysis', 'loading');

    try {
      // Add delay before starting analysis
      await this.delay(1500); // 1.5 second delay
      
      const response = await firstValueFrom(this.apiService.startAnalysis(this.analysisData.uploadId));
      this.analysisData.processId = response.processId ?? response.process_id ?? response.id;
      this.analysisData.status = response.status;
      this.successMessage = 'Analysis started successfully!';
      this.completeStep('analysis');

      // set stage for template
      this.stage = 'processing';

      // Add transition delay before starting processing
      await this.delay(800); // 0.8 second delay
      this.activateStep('processing');
      this.startStatusPolling();
    } catch (error: any) {
      this.errorMessage = error.error?.detail || 'Failed to start analysis.';
      this.updateStepStatus('analysis', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  private startStatusPolling() {
    if (!this.analysisData.processId) return;

    // Start processing progress simulation
    this.simulateProcessingProgress();

    // Start with a longer initial delay for better UX
    setTimeout(() => {
      this.statusPollingSubscription = interval(3000).subscribe(() => {
        this.checkProcessingStatus();
      });
    }, 2000); // 2 second initial delay
  }

  private stopStatusPolling() {
    if (this.statusPollingSubscription) {
      this.statusPollingSubscription.unsubscribe();
    }
  }

  private async checkProcessingStatus() {
    if (!this.analysisData.processId) return;

    try {
      // Add a small delay to simulate network request
      await this.delay(500);
      
      const response = await this.apiService.getProcessStatus(this.analysisData.processId).toPromise();
      this.analysisData.status = response.status;

      if (response.status === 'completed') {
        this.stopStatusPolling();
        this.completeStep('processing');
        
        // set stage for template
        this.stage = 'results';

        // Add delay before showing results
        await this.delay(1200);
        this.activateStep('results');
        await this.fetchAnalysisResults();
      } else if (response.status === 'failed') {
        this.stopStatusPolling();
        this.errorMessage = 'Processing failed. Please try again.';
        this.updateStepStatus('processing', 'error');
      }
    } catch (error: any) {
      console.error('Status check failed:', error);
    }
  }

  private async fetchAnalysisResults() {
    if (!this.analysisData.processId) return;

    try {
      // Add loading delay for better UX
      this.updateStepStatus('results', 'loading');
      await this.delay(2000); // 2 second delay
      
      const response = await this.apiService.getAnalysisResults(this.analysisData.processId).toPromise();
      this.analysisData.ownerResults = response.ownerResults;
      this.analysisData.tenantResults = response.tenantResults;
      this.completeStep('results');
      
      // set stage for template
      this.stage = 'comparison';

      // Add transition delay before starting comparison
      await this.delay(1500); // 1.5 second delay
      this.activateStep('comparison');
      
      // Automatically start comparison after getting results
      await this.runComparison();
    } catch (error: any) {
      this.errorMessage = error.error?.detail || 'Failed to fetch analysis results.';
      this.updateStepStatus('results', 'error');
    }
  }

  private async uploadFiles(fileA: File, fileB: File) {
    // Store files
    this.analysisData.fileA = fileA;
    this.analysisData.fileB = fileB;
  }
  async runComparison() {
    if (!this.analysisData.fileA || !this.analysisData.fileB) {
      this.errorMessage = 'Files are missing for comparison.';
      this.updateStepStatus('comparison', 'error');
      return;
    }

    this.isLoading = true;
    this.updateStepStatus('comparison', 'loading');

    this.apiService.compareFiles(this.analysisData.fileA!, this.analysisData.fileB!).subscribe({
      next: (res: any) => {
        // mark comparison step completed
        const comparisonIndex = this.steps.findIndex(s => s.id === 'comparison' || (s.title && s.title.toLowerCase().includes('auto comparison')));
        if (comparisonIndex >= 0) this.steps[comparisonIndex].status = 'completed';

        // mark report step completed (final step)
        const reportIndex = this.steps.findIndex(s => s.id === 'report' || (s.title && s.title.toLowerCase().includes('comparison report')));
        if (reportIndex >= 0) this.steps[reportIndex].status = 'completed';

        // only after final step is completed assign results and update UI
        this.analysisData.comparisonResults = res?.comparison_report ?? res;
        this.stage = 'report';
        this.isLoading = false;
        this.successMessage = 'Comparison completed!';
        this.cdr.detectChanges();

        console.log('Comparison result (saved to analysisData):', this.analysisData.comparisonResults);
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.detail || 'Comparison failed';
        this.updateStepStatus('comparison', 'error');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Helper methods
  private isValidFile(file: File): boolean {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    return allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx');
  }

  private updateStepStatus(stepId: string, status: 'pending' | 'active' | 'completed' | 'error' | 'loading') {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
    }
  }

  private completeStep(stepId: string) {
    this.updateStepStatus(stepId, 'completed');
  }

  private activateStep(stepId: string) {
    this.updateStepStatus(stepId, 'active');
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  resetFlow() {
    this.ownerFile = null;
    this.tenantFile = null;
    this.analysisData = {
      uploadId: '',
      processId: '',
      fileA: null,
      fileB: null
    };
    this.currentStep = 0;
    this.isLoading = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.stopStatusPolling();
    
    // Reset all steps
    this.steps.forEach(step => {
      step.status = step.id === 'upload' ? 'active' : 'pending';
    });
  }

  getStepClass(step: AnalysisStep): string {
    const baseClass = 'step';
    return `${baseClass} ${baseClass}--${step.status}`;
  }

  getProgressPercentage(): number {
    // Weighted progress across steps to provide smoother and more accurate progress bar.
    // Assign weights (must sum to 100).
    const weights: { [id: string]: number } = {
      upload: 10,
      analysis: 10,
      processing: 50,
      results: 15,
      comparison: 15
    };

    let percent = 0;

    for (const step of this.steps) {
      const w = weights[step.id] ?? 0;
      if (step.status === 'completed') {
        percent += w;
      } else if (step.status === 'active' || step.status === 'loading') {
        // provide partial progress based on finer-grained progress properties
        if (step.id === 'upload') {
          percent += (this.uploadProgress / 100) * w;
        } else if (step.id === 'processing') {
          percent += (this.processingProgress / 100) * w;
        } else {
          // for other active steps without dedicated progress, count half of weight
          percent += w * 0.5;
        }
      }
    }

    // If final 'done' state present, ensure 100%
    if (this.steps.some(s => s.id === 'report' && s.status === 'completed') || this.steps.every(s => s.status === 'completed')) {
      return 100;
    }

    return Math.min(100, Math.round(percent));
  }

  canProceedToNext(stepId: string): boolean {
    switch (stepId) {
      case 'upload':
        return !!(this.ownerFile && this.tenantFile);
      case 'analysis':
        return !!this.analysisData.uploadId;
      case 'processing':
        return this.analysisData.status === 'completed';
      case 'results':
        return !!(this.analysisData.ownerResults && this.analysisData.tenantResults);
      case 'comparison':
        return !!this.analysisData.uploadId;
      case 'report':
        return !!this.analysisData.comparisonResults;
      default:
        return false;
    }
  }

  // Helper methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Progress simulation methods
  private async simulateUploadProgress(): Promise<void> {
    for (let i = 0; i <= 100; i += 10) {
      this.uploadProgress = i;
      await this.delay(150);
    }
  }

  getStepStatus(stepId: string): 'pending' | 'active' | 'completed' | 'error' | 'loading' | undefined {
  const step = this.steps.find(s => s.id === stepId);
  return step?.status;
}

  private async simulateProcessingProgress(): Promise<void> {
    const steps = [
      { progress: 25, step: 1, delay: 800 },
      { progress: 50, step: 2, delay: 1000 },
      { progress: 75, step: 3, delay: 900 },
      { progress: 100, step: 4, delay: 600 }
    ];

    for (const stepData of steps) {
      await this.delay(stepData.delay);
      this.processingProgress = stepData.progress;
      this.processingStep = stepData.step;
    }
  }

  // Export report functionality
  exportReport() {
    if (!this.analysisData.comparisonResults) {
      this.errorMessage = 'No comparison results available to export.';
      return;
    }

    const reportData = this.generateReportData();
    const reportContent = this.formatReportForExport(reportData);
    
    // Create and download the report file
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agreement-analysis-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    this.successMessage = 'Report exported successfully!';
    setTimeout(() => this.clearMessages(), 3000);
  }

  private generateReportData() {
    return {
      timestamp: new Date().toISOString(),
      uploadedFiles: {
        owner: this.ownerFile?.name || 'Not available',
        tenant: this.tenantFile?.name || 'Not available'
      },
      analysisResults: {
        owner: this.analysisData.ownerResults,
        tenant: this.analysisData.tenantResults
      },
      comparisonResults: this.analysisData.comparisonResults,
      overallSimilarity: this.analysisData.comparisonResults?.overall_similarity,
      recommendation: this.getRecommendation(),
      dealQuality: this.getDealQuality()
    };
  }

  // Add this new method to determine recommendation based on similarity and risk
  public getRecommendation(): string {
    const results = this.analysisData.comparisonResults;
    if (!results) return 'UNKNOWN';
    
    const similarity = results.similarity_percent ?? 0;
    const riskA = results.risk_a?.level || 'Low';
    const riskB = results.risk_b?.level || 'Low';
    
    // If both agreements are nearly identical and risks are low
    if (similarity >= 95 && riskA !== 'High' && riskB !== 'High') {
      return 'GOOD DEAL - PROCEED';
    }
    // If high similarity with acceptable risks
    else if (similarity >= 85 && riskA !== 'High' && riskB !== 'High') {
      return 'ACCEPTABLE - MINOR REVIEW';
    }
    // If moderate similarity
    else if (similarity >= 75) {
      return 'NEEDS REVIEW - CHECK DIFFERENCES';
    }
    // Low similarity or high risk
    else {
      return 'NEEDS REVIEW - SIGNIFICANT ISSUES';
    }
  }

  // Add this new method to get deal quality assessment
  private getDealQuality(): { status: string; color: string; icon: string } {
    const results = this.analysisData.comparisonResults;
    if (!results) return { status: 'UNKNOWN', color: 'gray', icon: '❓' };
    
    const similarity = results.similarity_percent?? 0;
    const riskA = results.risk_a?.level || 'Low';
    const riskB = results.risk_b?.level || 'Low';
    const hasHighRisk = riskA === 'High' || riskB === 'High';
    console.log('Calculating deal quality with similarity:', similarity, 'riskA:', riskA, 'riskB:', riskB);
    
    if (similarity >= 90 && !hasHighRisk) {
      return { status: 'EXCELLENT', color: 'green', icon: '✓' };
    } else if (similarity >= 80 && !hasHighRisk) {
      return { status: 'GOOD', color: 'lightgreen', icon: '✓' };
    } else if (similarity >= 70) {
      return { status: 'FAIR', color: 'orange', icon: '⚠' };
    } else {
      return { status: 'POOR', color: 'red', icon: '✕' };
    }
    
  }

  // Update generateReportData to use new recommendation
  private formatReportForExport(data: any): string {
    let report = '';
    report += '='.repeat(80) + '\n';
    report += '                    AGREEMENT ANALYSIS REPORT\n';
    report += '='.repeat(80) + '\n';
    report += `Generated: ${new Date(data.timestamp).toLocaleString()}\n\n`;
    
    report += 'UPLOADED FILES:\n';
    report += '-'.repeat(40) + '\n';
    report += `Owner Agreement: ${data.uploadedFiles.owner}\n`;
    report += `Tenant Agreement: ${data.uploadedFiles.tenant}\n\n`;
    
    report += 'DEAL QUALITY ASSESSMENT:\n';
    report += '-'.repeat(40) + '\n';
    report += `Overall Similarity: ${(data.overallSimilarity * 100).toFixed(2)}%\n`;
    report += `Recommendation: ${data.recommendation}\n`;
    report += `Deal Quality: ${data.dealQuality.status}\n\n`;

    report += 'ANALYSIS RESULTS:\n';
    report += '-'.repeat(40) + '\n';
    
    if (data.analysisResults.owner) {
      report += '\nOWNER AGREEMENT:\n';
      report += `Risk Level: ${data.analysisResults.owner.risk_level}\n`;
      report += `Summary: ${data.analysisResults.owner.summary}\n`;
      report += `Key Clauses: ${data.analysisResults.owner.clauses}\n`;
      report += `Keywords: ${data.analysisResults.owner.keywords}\n`;
    }
    
    if (data.analysisResults.tenant) {
      report += '\nTENANT AGREEMENT:\n';
      report += `Risk Level: ${data.analysisResults.tenant.risk_level}\n`;
      report += `Summary: ${data.analysisResults.tenant.summary}\n`;
      report += `Key Clauses: ${data.analysisResults.tenant.clauses}\n`;
      report += `Keywords: ${data.analysisResults.tenant.keywords}\n`;
    }
    
    if (data.comparisonResults) {
      report += '\nCOMPARISON ANALYSIS:\n';
      report += '-'.repeat(40) + '\n';
      report += `Overall Similarity: ${(data.overallSimilarity * 100).toFixed(1)}%\n`;
      report += `Recommendation: ${data.recommendation}\n\n`;
      
      if (data.comparisonResults.missing_clauses_in_b?.length) {
        report += 'Clauses Missing in Tenant Agreement:\n';
        data.comparisonResults.missing_clauses_in_b.forEach((clause: string) => {
          report += `- ${clause}\n`;
        });
        report += '\n';
      }
      
      if (data.comparisonResults.missing_clauses_in_a?.length) {
        report += 'Clauses Missing in Owner Agreement:\n';
        data.comparisonResults.missing_clauses_in_a.forEach((clause: string) => {
          report += `- ${clause}\n`;
        });
        report += '\n';
      }
      
      if (data.comparisonResults.entities_only_in_a?.length) {
        report += 'Entities Only in Owner Agreement:\n';
        data.comparisonResults.entities_only_in_a.forEach((entity: string) => {
          report += `- ${entity}\n`;
        });
        report += '\n';
      }
      
      if (data.comparisonResults.entities_only_in_b?.length) {
        report += 'Entities Only in Tenant Agreement:\n';
        data.comparisonResults.entities_only_in_b.forEach((entity: string) => {
          report += `- ${entity}\n`;
        });
        report += '\n';
      }
      
      if (data.comparisonResults.risk_a) {
        report += `Owner Agreement Risk Assessment:\n`;
        report += `Level: ${data.comparisonResults.risk_a.level} (Score: ${data.comparisonResults.risk_a.score})\n`;
        if (data.comparisonResults.risk_a.found?.length) {
          report += 'Risk Factors:\n';
          data.comparisonResults.risk_a.found.forEach((factor: string) => {
            report += `- ${factor}\n`;
          });
        }
        report += '\n';
      }
      
      if (data.comparisonResults.risk_b) {
        report += `Tenant Agreement Risk Assessment:\n`;
        report += `Level: ${data.comparisonResults.risk_b.level} (Score: ${data.comparisonResults.risk_b.score})\n`;
        if (data.comparisonResults.risk_b.found?.length) {
          report += 'Risk Factors:\n';
          data.comparisonResults.risk_b.found.forEach((factor: string) => {
            report += `- ${factor}\n`;
          });
        }
        report += '\n';
      }
      
      if (data.comparisonResults.dates_only_in_a?.length) {
        report += 'Dates Only in Owner Agreement:\n';
        data.comparisonResults.dates_only_in_a.forEach((date: string) => {
          report += `- ${date}\n`;
        });
        report += '\n';
      }
      
      if (data.comparisonResults.dates_only_in_b?.length) {
        report += 'Dates Only in Tenant Agreement:\n';
        data.comparisonResults.dates_only_in_b.forEach((date: string) => {
          report += `- ${date}\n`;
        });
        report += '\n';
      }
    }
    
    report += '='.repeat(80) + '\n';
    report += 'End of Report\n';
    report += '='.repeat(80) + '\n';
    
    return report;
  }
}
