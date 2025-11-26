import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FileUploadComponent } from "../file-upload/file-upload.component";
import { AnalysisResultsComponent } from "../analysis-results/analysis-results.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ FileUploadComponent,],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

}
