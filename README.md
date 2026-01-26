# StudyBase 📚

A comprehensive study management platform built with React.js and Supabase.

This project was started off as an assignment to build a fully functional, responsive web app that helps school students revise from their coursebooks.

## 🌟 Features

### Core Functionality
- **Base Management**: Create, organize, and manage study bases
- **File Management**: Upload, view, and organize PDFs and images
- **AI Chat Assistant**: Interactive chat with PDF content using Hugging Face LLM
- **Quiz Generation**: Automated quiz creation from PDF content
- **Dashboard Analytics**: Track quiz performance and study progress

### Advanced Features
- **PDF Text Extraction**: Automatic text extraction and storage
- **Multi-Chat Sessions**: Create and manage multiple chat conversations per base
- **Quiz Types**: Multiple Choice Questions (MCQs), Short Answer Questions (SAQs), and Long Answer Questions (LAQs)
- **Intelligent Evaluation**: AI-powered answer evaluation with similarity scoring
- **Responsive Design**: Glassmorphic UI with dark/light theme support

## 🏗️ Architecture

### Frontend Stack
- **React.js 18**: Modern React with hooks and functional components
- **React Router DOM**: Client-side routing and navigation
- **CSS3**: Custom styling with glassmorphic design and animations
- **PDF.js**: PDF rendering and text extraction

### Backend Stack
- **Supabase**: Backend-as-a-Service for database, authentication, and storage
- **PostgreSQL**: Relational database with Row Level Security (RLS)
- **Supabase Storage**: File storage and management
- **Hugging Face API**: Large Language Model integration

### AI Integration
- **Model**: `meta-llama/Llama-3.1-8B-Instruct:fireworks-ai`
- **Model API**: Hugging Face Router API
- **Features**: Chat completions, text similarity evaluation, quiz generation

## 📁 Project Structure

```
src/
├── components/
│   ├── AuthForm.css          # Authentication form styling
│   ├── BaseView.js/.css      # Base viewing and file management
│   ├── Dashboard.js/.css     # Analytics and performance tracking
│   ├── EditBase.js/.css      # Base editing functionality
│   ├── HeroSection.js/.css   # Landing page hero section
│   ├── Login.js             # User login component
│   ├── MyAccount.js/.css     # User account management
│   ├── MyBases.js/.css       # Base listing and management
│   ├── Navbar.js/.css        # Navigation component
│   ├── NewBase.js/.css       # Base creation
│   ├── Quiz.js/.css          # Quiz configuration
│   ├── QuizResults.js/.css   # Quiz results display
│   ├── QuizTaking.js/.css    # Quiz taking interface
│   └── Signup.js            # User registration component
├── services/
│   ├── chatService.js        # Hugging Face API integration
│   ├── chatPersistenceService.js # Chat data management
│   ├── pdfTextExtractor.js   # PDF text extraction
│   ├── quizEvaluationService.js # Quiz answer evaluation
│   ├── quizGenerationService.js # Quiz question generation
│   └── quizPersistenceService.js # Quiz data management
├── App.js                    # Main application component
├── App.css                   # Global styles and theme variables
└── index.js                  # Application entry point
```

## 🗄️ Database Schema

### Core Tables
- **bases**: Study base information
- **base_files**: File metadata and storage references
- **pdf_text_content**: Extracted PDF text with processing status

### Chat System
- **chats**: Chat session management
- **chat_messages**: Individual chat messages

### Quiz System
- **quizzes**: Quiz configuration and metadata
- **quiz_sources**: Source files/bases for quiz generation
- **quiz_questions**: Individual quiz questions
- **quiz_answers**: User answers and evaluation results

### Security
- **Row Level Security (RLS)**: User-specific data access
- **RLS Policies**: Secure data isolation per user
- **Storage Policies**: File access control

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Hugging Face API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd studybase
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create `.env.local` file:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_HF_API_KEY=your_huggingface_api_key
   ```

4. **Database Setup**
   Run the SQL scripts in order:
   ```sql
   -- Complete database setup
   complete-database-setup.sql
   
   -- Fix dashboard statistics (if needed)
   fix-dashboard-stats.sql
   ```

5. **Start Development Server**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Enable Row Level Security
3. Run the database schema scripts
4. Configure storage buckets for file uploads
5. Set up RLS policies for data security

### Hugging Face API
1. Get API key from Hugging Face
2. Add to environment variables
3. Ensure sufficient API credits for usage

## 📱 User Interface

### Design System
- **Theme**: Glassmorphic design with blue accent colors
- **Responsive**: Mobile-first approach with breakpoints
- **Animations**: Smooth transitions and hover effects
- **Accessibility**: Keyboard navigation and screen reader support

### Key Components
- **Navigation**: Fixed navbar with theme toggle and user menu
- **File Viewer**: PDF rendering with zoom and navigation
- **Chat Interface**: Split-screen chat and file viewer
- **Quiz Interface**: Interactive question answering
- **Dashboard**: Performance analytics and statistics

## 🤖 AI Features

### Chat Assistant
- **Context-Aware**: Uses extracted PDF text as context
- **Multi-Session**: Create multiple chat sessions per base
- **Persistent**: Chat history saved and retrievable
- **Real-Time**: Streaming responses from LLM

### Quiz Generation
- **Content-Based**: Questions generated from PDF content
- **Configurable**: Customizable difficulty and question counts
- **Multiple Types**: MCQs, SAQs, and LAQs
- **Intelligent Parsing**: Structured question format extraction

### Answer Evaluation
- **MCQ**: Direct option matching
- **SAQ**: 90% similarity threshold using LLM
- **LAQ**: 75% similarity threshold using LLM
- **Automated Scoring**: Marks calculated and stored

## 🔒 Security Features

### Authentication
- **Supabase Auth**: Email/password authentication
- **Session Management**: Secure session handling
- **User Isolation**: Data access restricted per user

### Data Protection
- **RLS Policies**: Database-level security
- **File Access Control**: Storage bucket policies
- **API Key Security**: Environment variable protection

## 📊 Performance Features

### Optimization
- **Code Splitting**: Lazy loading of components
- **CSS Optimization**: Removed unused styles
- **Image Optimization**: Efficient file handling
- **Caching**: Supabase query optimization

### Analytics
- **Quiz Performance**: Score tracking and trends
- **Usage Statistics**: File uploads and chat sessions
- **Progress Tracking**: Study base management metrics

## 🛠️ Development

### Code Quality
- **ESLint**: Code linting and formatting
- **Component Structure**: Modular and reusable components
- **Service Layer**: Separated business logic
- **Error Handling**: Comprehensive error management

### Testing
- **Component Testing**: React component testing
- **Service Testing**: API integration testing
- **E2E Testing**: User workflow testing

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Ensure all production environment variables are set:
- Supabase URL and keys
- Hugging Face API key
- Any additional configuration

### Hosting Options
- **Vercel**: Recommended for React apps
- **Netlify**: Alternative hosting platform
- **AWS S3**: Static site hosting
- **Custom Server**: Node.js deployment

## 📈 Future Enhancements

### Planned Features
- **Collaborative Bases**: Multi-user study bases
- **Advanced Analytics**: Detailed performance insights
- **Mobile App**: React Native implementation
- **Offline Support**: PWA capabilities
- **AI Improvements**: Better context understanding

### Technical Improvements
- **Performance**: Further optimization
- **Accessibility**: Enhanced screen reader support
- **Internationalization**: Multi-language support
- **Testing**: Comprehensive test coverage

## 🤝 Contributing

### Development Guidelines
1. Follow React best practices
2. Maintain consistent code style
3. Write comprehensive comments
4. Test all new features
5. Update documentation

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Implement changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Supabase**: Backend infrastructure
- **Hugging Face**: AI model integration
- **React Community**: Framework and ecosystem
- **PDF.js**: PDF processing capabilities