# Agreement Analysis Flow Documentation

## Overview
The LegalBot frontend now implements a streamlined, step-by-step agreement analysis flow that guides users through the entire process from file upload to final comparison report.

## User Flow

### Step 1: Upload Agreements 📁
- **Purpose**: Upload both owner and tenant agreement files
- **UI Elements**: 
  - Drag-and-drop file upload areas for both agreements
  - File type validation (PDF, DOCX only)
  - Visual feedback when files are selected
- **API Call**: `POST /api/upload/agreements`
- **Response**: Returns `uploadId` for tracking the uploaded file set

### Step 2: Start Analysis 🔍
- **Purpose**: Initiate the document analysis process
- **UI Elements**: 
  - Upload summary showing both files
  - "Start Analysis" button
- **API Call**: `POST /api/process/start`
- **Response**: Returns `processId` for tracking the analysis job

### Step 3: Processing Status ⚙️
- **Purpose**: Monitor the progress of document analysis
- **UI Elements**: 
  - Loading spinner and status indicator
  - Real-time status updates via polling
- **API Call**: `GET /api/process/status/{processId}` (polled every 2 seconds)
- **Response**: Returns current processing status (pending, processing, completed, failed)

### Step 4: Analysis Results 📊
- **Purpose**: Display detailed analysis of both agreements
- **UI Elements**: 
  - Side-by-side comparison cards
  - Risk level indicators with color coding
  - Summary, clauses, and keywords for each document
- **API Call**: `GET /api/results/{processId}`
- **Response**: Returns analysis data for both agreements

### Step 5: Run Comparison 🔄
- **Purpose**: Compare the two agreements and identify differences
- **UI Elements**: 
  - "Run Comparison" button
  - Loading indicator during comparison
- **API Call**: `POST /api/compare`
- **Response**: Returns comparison report data

### Step 6: Comparison Report 📋
- **Purpose**: Present final comparison results and recommendations
- **UI Elements**: 
  - Deal quality assessment with visual meter
  - Missing clauses and entities lists
  - Overall similarity score
  - Export and restart options

## Technical Implementation

### Component Structure
- **AgreementAnalysisComponent**: Main component managing the entire flow
- **Step Management**: Dynamic step progression with visual indicators
- **State Management**: Comprehensive state tracking for files, process IDs, and results
- **Error Handling**: User-friendly error messages and recovery options

### API Service Updates
- **New Methods**: `uploadAgreements()`, `startAnalysis()`, `getAnalysisResults()`, `runComparison()`
- **Legacy Support**: Maintains backward compatibility with existing endpoints
- **Error Handling**: Comprehensive error catching and user feedback

### UI/UX Features
- **Professional Design**: Modern gradient backgrounds and clean typography
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Visual Progress**: Step-by-step progress indicator with status colors
- **Loading States**: Spinners and progress bars for all async operations
- **File Validation**: Client-side validation with helpful error messages

### Styling
- **CSS Framework**: Custom SCSS with modern design patterns
- **Color Scheme**: Professional blue/purple gradient theme
- **Animations**: Smooth transitions and hover effects
- **Mobile-First**: Responsive design with mobile optimizations

## Backend Integration

### Required Backend Endpoints
1. `POST /api/upload/agreements` - Upload two files and get upload ID
2. `POST /api/process/start` - Start analysis with upload ID
3. `GET /api/process/status/{processId}` - Check processing status
4. `GET /api/results/{processId}` - Get analysis results
5. `POST /api/compare` - Run comparison with upload ID

### Data Flow
1. Frontend uploads files → Backend stores files and returns upload ID
2. Frontend starts analysis → Backend processes files and returns process ID
3. Frontend polls status → Backend returns current processing state
4. Frontend fetches results → Backend returns analysis data
5. Frontend runs comparison → Backend compares files and returns report

## Navigation
- **Primary Route**: `/analysis` - Main agreement analysis flow
- **Header Navigation**: Updated with new "Agreement Analysis" link
- **Active States**: Visual indication of current page in navigation
- **Responsive Menu**: Mobile-friendly navigation with proper spacing

## Error Handling
- **File Validation**: Checks file types and sizes before upload
- **Network Errors**: Graceful handling of API failures
- **User Feedback**: Clear error messages with suggested actions
- **Recovery Options**: Ability to restart the flow from any point

## Future Enhancements
- **File Preview**: Show file contents before upload
- **Progress Persistence**: Save progress in localStorage
- **Export Options**: PDF/Excel export of comparison reports
- **Advanced Filtering**: Filter results by risk level or clause type
- **Batch Processing**: Support for multiple agreement sets
