import { Routes } from '@angular/router';

import { AgreementAnalysisComponent } from './features/agreement-analysis/agreement-analysis.component';
import { ProcessingStatusComponent } from './features/processing-status/processing-status.component';
import { ComparisonReportComponent } from './features/comparison-report/comparison-report.component';
import { AnalysisResultsComponent } from './features/analysis-results/analysis-results.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: AgreementAnalysisComponent },
  { path: 'analysis', component: AgreementAnalysisComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'processing-status', component: ProcessingStatusComponent },
  { path: 'compare-report', component: ComparisonReportComponent },
  { path: 'analysis-results', component: AnalysisResultsComponent },
  // Wildcard redirect or 404 can be added here
  { path: '**', redirectTo: 'analysis' }
];
