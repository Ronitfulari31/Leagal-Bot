import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { JsonPipe, NgIf, NgForOf, NgClass } from '@angular/common';

@Component({
  selector: 'app-comparison-report',
  templateUrl: './comparison-report.component.html',
  styleUrls: ['./comparison-report.component.scss'],
  standalone: true,
  imports: [NgIf, NgForOf, NgClass, JsonPipe]
})
export class ComparisonReportComponent implements AfterViewInit {
  fileA: File | null = null;
  fileB: File | null = null;
  comparisonReport: any = null;
  loading = false;
  errorMessage = '';
  dealScore = 0;

  @ViewChild('leftPane') leftPane!: ElementRef<HTMLDivElement>;
  @ViewChild('rightPane') rightPane!: ElementRef<HTMLDivElement>;

  constructor(private apiService: ApiService) {}

  ngAfterViewInit(): void {
    // synced scrolling (guard for template presence)
    setTimeout(() => {
      const l = this.leftPane?.nativeElement;
      const r = this.rightPane?.nativeElement;
      if (l && r) {
        l.addEventListener('scroll', () => { if (Math.abs(r.scrollTop - l.scrollTop) > 2) r.scrollTop = l.scrollTop; });
        r.addEventListener('scroll', () => { if (Math.abs(l.scrollTop - r.scrollTop) > 2) l.scrollTop = r.scrollTop; });
      }
    }, 300);
  }

  onFileASelected(event: any) {
    this.fileA = event.target.files[0] ?? null;
    this.comparisonReport = null;
    this.errorMessage = '';
    this.dealScore = 0;
  }

  onFileBSelected(event: any) {
    this.fileB = event.target.files[0] ?? null;
    this.comparisonReport = null;
    this.errorMessage = '';
    this.dealScore = 0;
  }

  compareFiles() {
    if (!this.fileA || !this.fileB) {
      this.errorMessage = 'Please select both files to compare.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.comparisonReport = null;

    this.apiService.compareFiles(this.fileA, this.fileB).subscribe({
      next: (res: any) => {
        // backend now returns full report at top-level
        this.comparisonReport = res;
        // prefer adjusted score if available
        this.dealScore = res.adjusted_similarity_percent ?? res.similarity_percent ?? Math.round((res.overall_similarity || 0) * 100);
        this.loading = false;
        this.errorMessage = '';
      },
      error: (err: any) => {
        this.errorMessage = err.error?.detail || 'Comparison failed.';
        this.comparisonReport = null;
        this.loading = false;
      }
    });
  }

  async downloadPdf() {
    if (!document) return;
    try {
      const html2canvasModule: any = await import('html2canvas');
      const jspdfModule: any = await import('jspdf');
      const html2canvas = html2canvasModule.default ?? html2canvasModule;
      const jsPDF = jspdfModule.jsPDF ?? jspdfModule.default ?? jspdfModule;

      const el = document.getElementById('comparison-root')!;
      if (!el) return;
      const canvas: any = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgProps = (doc as any).getImageProperties(imgData);
      const pdfWidth = 190;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      (doc as any).addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight);
      doc.save('comparison-report.pdf');
    } catch (e) {
      console.error('PDF export failed', e);
    }
  }

  acceptAgreement() {
    // TODO: implement backend call to persist acceptance; placeholder for now
    console.log('Accept clicked for report', this.comparisonReport);
    // example: this.apiService.submitDecision(processId, 'accept').subscribe(...)
  }

  flagAgreement() {
    // TODO: implement backend call to create a flag/issue
    console.log('Flag clicked for report', this.comparisonReport);
    // example: this.apiService.submitDecision(processId, 'flag').subscribe(...)
  }
}
