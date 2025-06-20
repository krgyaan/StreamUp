# 📁 StreamUp – Enterprise File Upload Platform

StreamUp is a robust, full-stack file upload platform designed for handling large-scale data file processing. Built with modern technologies, it provides a seamless experience for uploading and processing CSV/Excel files with enterprise-grade features.

## 🎯 Project Objectives

- Provide a secure and reliable platform for large file uploads
- Enable real-time progress tracking and validation
- Implement robust error handling and user feedback
- Ensure data integrity through server-side validation
- Support scalable file processing architecture
- Maintain high performance with large file sizes

## 🎯 Project Scope

### Core Features
- Multi-file upload support with drag & drop interface
- Real-time upload progress tracking
- File type validation (CSV, XLS, XLSX)
- File size validation (up to 50MB)
- Job tracking system with unique identifiers
- Server-side file processing
- Database integration for job status tracking

### Technical Scope
- Frontend: React + TypeScript application
- Backend: Node.js + Express API
- Database: PostgreSQL with Drizzle ORM
- File Processing: Server-side validation and processing
- Real-time Updates: Progress tracking and status updates

## 🧰 Tech Stack

| Layer       | Technology                      | Purpose                                |
|------------|----------------------------------|----------------------------------------|
| Frontend    | React, TypeScript, TailwindCSS   | Modern, type-safe UI development       |
| UI Lib      | Shadcn UI                       | Consistent, accessible components      |
| Icons       | Lucide Icons                    | Modern, consistent iconography         |
| Backend     | Node.js, Express, TypeScript     | Robust API development                 |
| File Handling| Multer                          | Efficient file upload processing       |
| ORM         | Drizzle ORM                     | Type-safe database operations          |
| Database    | PostgreSQL                      | Reliable data storage                  |
| Dev Tools   | Nodemon, ts-node-dev            | Enhanced development experience        |

## 📁 Project Architecture

```
streamup/
├── frontend/                    # React + TypeScript frontend
│   ├── src/                    # Source code
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Page components
│   │   └── utils/             # Utility functions
│   ├── public/                # Static assets
│   ├── index.html            # Entry HTML file
│   ├── vite.config.ts        # Vite configuration
│   └── tsconfig.json         # TypeScript configuration
│
├── backend/                    # Node.js + Express backend
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   │   └── multer.ts     # File upload configuration
│   │   ├── controllers/      # Route controllers
│   │   │   └── uploadController.ts
│   │   ├── db/              # Database related files
│   │   │   ├── index.ts     # Database connection
│   │   │   └── schema.ts    # Database schema
│   │   ├── queues/          # Queue configuration
│   │   │   └── config.ts    # Redis queue setup
│   │   ├── routes/          # API routes
│   │   │   └── uploadRoutes.ts
│   │   ├── services/        # Business logic
│   │   │   └── fileProcessor.ts
│   │   └── types/           # TypeScript type definitions
│   ├── uploads/             # Temporary file storage
│   ├── temp/               # Temporary processing files
│   ├── drizzle/           # Database migrations
│   ├── index.ts           # Application entry point
│   └── package.json       # Backend dependencies
│
└── readme.md              # Project documentation
```

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone https://github.com/krgyaan/StreamUp.git
cd StreamUp
```

### 2. Database Setup
1. Install PostgreSQL if not already installed
2. Create a new database:
```sql
CREATE DATABASE streamup;
```

### 3. Environment Configuration

#### Backend (.env)
```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/streamup
NODE_ENV=development
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000
```

### 4. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

## ▶️ Running the Application

### Development Mode

#### Backend
```bash
cd backend
npm run dev
```

#### Frontend
```bash
cd frontend
npm run dev
```

## 🧪 API Documentation

### File Upload Endpoints

#### 1. Upload File
```http
POST /api/upload
Content-Type: multipart/form-data

Request:
- file: File (CSV, XLS, XLSX, max 50MB)

Response:
{
  "message": "File uploaded and queued for processing",
  "fileUploadId": "string"
}
```

#### 2. Get Upload Status
```http
GET /api/status/:fileUploadId

Response:
{
  "status": "uploaded|processing|completed|failed",
  "totalRows": number,
  "processedRows": number,
  "errorCount": number,
  "progress": number
}
```

#### 3. Get Processing Errors
```http
GET /api/errors/:fileUploadId

Response:
[
  {
    "rowNumber": number,
    "errorMessage": string,
    "rowData": object
  }
]
```

#### 4. Get Job Summary
```http
GET /api/summary/:fileUploadId

Response:
{
  "jobId": string,
  "status": string,
  "totalRows": number,
  "successfulRows": number,
  "failedRows": number,
  "duration": number,
  "startTime": string,
  "endTime": string,
  "fileName": string,
  "fileSize": number,
  "errors": [
    {
      "row": number,
      "error": string,
      "data": object
    }
  ]
}
```

#### 5. Get All Job Summaries
```http
GET /api/jobs

Response:
[
  {
    "jobId": string,
    "status": string,
    "fileName": string,
    "fileSize": number,
    "totalRows": number,
    "successfulRows": number,
    "failedRows": number,
    "startTime": string,
    "endTime": string
  }
]
```

### File Processing Details

- **Supported File Types**: CSV, XLS, XLSX
- **Maximum File Size**: 50MB
- **Processing Queue**: Redis-based queue system
- **Storage**: Temporary file storage with automatic cleanup
- **Progress Tracking**: Real-time progress updates via status endpoint

## 🔒 Security Considerations

- File size limits enforced on both client and server
- File type validation using MIME types
- Secure file handling with temporary storage
- Input sanitization and validation
- Rate limiting for API endpoints
- CORS configuration for frontend access

## 📈 Performance Optimization

- Chunked file uploads for large files
- Efficient database queries using Drizzle ORM
- Optimized file processing pipeline
- Client-side caching strategies
- Server-side compression where applicable

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📜 Documentations
- [Project Documentation](docs/project-documentation.md) - Comprehensive documentation covering problem understanding, architecture, development approach, challenges, and learnings.
