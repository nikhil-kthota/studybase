# StudyBase - AI-Powered Study Management Platform

A comprehensive React.js application with Supabase backend integration, featuring dynamic authentication, PDF text extraction, AI-powered chat, and a futuristic glassmorphic design.

## 🚀 Project Overview

StudyBase is a complete study management platform that helps students organize their study materials, extract text from PDFs automatically, and interact with AI-powered chat to enhance their learning experience. The platform features a sleek, futuristic interface with glassmorphic design elements, real-time authentication, and intelligent PDF processing.

## ✨ Key Features

### 🎨 **Futuristic Design**
- **Glassmorphism Effects**: Semi-transparent cards with backdrop blur
- **Animated Gradients**: Dynamic color transitions and floating elements
- **Smooth Animations**: Hover effects, transitions, and micro-interactions
- **Custom SVG Patterns**: Subtle background textures for each theme
- **Responsive Layout**: Mobile-first design with adaptive components

### 🌓 **Dynamic Theme System**
- **Light Theme**: Clean white background with blue accents
- **Dark Theme**: Deep space-like background with cyan highlights
- **Smooth Transitions**: Animated theme switching
- **Persistent Settings**: Theme preference saved in localStorage

### 🔐 **Authentication System**
- **Supabase Integration**: Real-time authentication with email/password
- **Dynamic Navbar**: Changes based on user authentication status
- **Protected Routes**: Secure access to user-specific content
- **Session Management**: Persistent login sessions

### 📚 **Study Base Management**
- **Create Bases**: Organize study materials into themed collections
- **File Upload**: Support for PDFs, images, and documents
- **File Organization**: Sort files by upload date (latest first)
- **Base Editing**: Add/remove files from existing bases
- **Base Deletion**: Complete base removal with confirmation

### 🤖 **AI-Powered Features**
- **Automatic PDF Text Extraction**: Extract text from uploaded PDFs using PDF.js
- **AI Chat Integration**: Ask questions about PDF content using Hugging Face API
- **Context-Aware Responses**: AI responses based on extracted PDF text
- **Multiple Model Fallback**: Automatic fallback to working AI models

### 📱 **Responsive Design**
- **Mobile-First**: Optimized for all screen sizes
- **Hamburger Menu**: Collapsible navigation for mobile devices
- **Touch-Friendly**: Large tap targets and smooth interactions
- **Progressive Enhancement**: Features scale appropriately across devices

## 🛠️ Technology Stack

### **Frontend**
- **React 18**: Modern React with hooks and functional components
- **React Router DOM**: Client-side routing and navigation
- **CSS3**: Custom properties, animations, and modern layout techniques
- **PDF.js**: PDF rendering and text extraction
- **JavaScript ES6+**: Modern JavaScript features and syntax

### **Backend**
- **Supabase**: Backend-as-a-Service for database, authentication, and storage
- **PostgreSQL**: Relational database with Row Level Security (RLS)
- **Supabase Storage**: File storage and management
- **Hugging Face API**: AI model integration for chat functionality

### **External APIs**
- **Hugging Face Inference API**: Multiple AI models for text generation
- **PDF.js CDN**: PDF processing and text extraction

## 📁 Project Structure

```
studybase/
├── public/
│   ├── index.html                 # HTML template
│   └── pdf.worker.min.js          # PDF.js worker for text extraction
├── src/
│   ├── components/
│   │   ├── AuthContext.js         # Authentication context provider
│   │   ├── BaseView.js            # Base viewing with PDF viewer and chat
│   │   ├── BaseView.css           # Base view styling
│   │   ├── EditBase.js            # Base editing component
│   │   ├── EditBase.css           # Edit base styling
│   │   ├── HeroSection.js         # Landing page hero section
│   │   ├── HeroSection.css        # Hero section styling
│   │   ├── Login.js               # Login form component
│   │   ├── Login.css              # Login styling
│   │   ├── MyAccount.js           # User account management
│   │   ├── MyAccount.css          # Account styling
│   │   ├── MyBases.js             # User's bases listing
│   │   ├── MyBases.css            # My bases styling
│   │   ├── Navbar.js              # Dynamic navigation component
│   │   ├── Navbar.css             # Navigation styling
│   │   ├── NewBase.js             # Create new base component
│   │   ├── NewBase.css            # New base styling
│   │   ├── PDFViewer.js           # PDF viewing component
│   │   ├── PDFViewer.css          # PDF viewer styling
│   │   ├── SignUp.js              # Sign up form component
│   │   └── SignUp.css             # Sign up styling
│   ├── lib/
│   │   └── supabase.js            # Supabase client configuration
│   ├── services/
│   │   ├── chatService.js         # AI chat integration service
│   │   └── pdfTextExtractor.js    # PDF text extraction service
│   ├── App.js                     # Main application component
│   ├── App.css                    # Global styles and theme variables
│   ├── index.js                   # Application entry point
│   └── index.css                  # Base styles
├── supabase-queries.sql           # Database schema and RLS policies
├── fix-pdf-text-content-rls.sql    # RLS policy fixes
├── package.json                   # Dependencies and scripts
├── .env.local                     # Environment variables (not tracked)
├── env.template                   # Environment variables template
└── README.md                      # Project documentation
```

## 🎯 Component Architecture

### **Authentication System**
- **AuthContext**: Global authentication state management
- **Login/SignUp**: Form components with validation
- **Protected Routes**: Secure access to user content
- **Session Persistence**: Automatic login state restoration

### **Base Management**
- **MyBases**: List and manage user's study bases
- **NewBase**: Create new bases with file upload
- **EditBase**: Modify existing bases (add/remove files)
- **BaseView**: View base contents with PDF viewer and chat

### **File Management**
- **File Upload**: Drag-and-drop file upload with progress
- **File Types**: Support for PDFs, images, and documents
- **File Sorting**: Automatic sorting by upload date
- **File Deletion**: Remove files from bases

### **AI Integration**
- **PDF Text Extraction**: Automatic text extraction from PDFs
- **Chat Service**: AI-powered Q&A about PDF content
- **Model Fallback**: Multiple AI models for reliability
- **Context Awareness**: Responses based on PDF content

## 🎨 Design System

### **Color Palette**
- **Light Theme**: 
  - Primary: `#000000` (Black text)
  - Secondary: `#374151` (Dark gray)
  - Accent: `#3b82f6` (Blue)
  - Background: `#f8fafc` to `#e2e8f0` (White gradient)

- **Dark Theme**:
  - Primary: `#ffffff` (White text)
  - Secondary: `rgba(255, 255, 255, 0.7)` (Light gray)
  - Accent: `#00d4ff` (Cyan)
  - Background: `#1a1a2e` to `#16213e` (Dark gradient)

### **Typography**
- **Font Family**: Inter, system fonts
- **Text Alignment**: Center-aligned headings, justified paragraphs
- **Responsive Scaling**: Font sizes adapt to screen size

### **Animations**
- **Hover Effects**: Transform, scale, and color transitions
- **Loading States**: Slide-in animations with staggered delays
- **Theme Switching**: Smooth color transitions
- **Mobile Interactions**: Touch-optimized animations

## 📱 Responsive Breakpoints

- **Desktop**: 1024px+ (Full layout with all features)
- **Tablet**: 768px-1024px (Adjusted spacing and sizing)
- **Mobile Large**: 640px-768px (Hamburger menu appears)
- **Mobile Medium**: 480px-640px (Compact navbar elements)
- **Mobile Small**: <480px (Ultra-compact layout)

## 🔧 Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager
- Supabase account
- Hugging Face account (for AI features)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd studybase
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.template .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_HF_API_KEY=your_huggingface_api_key
   ```

4. **Set up Supabase database:**
   - Run the SQL commands from `supabase-queries.sql` in your Supabase SQL editor
   - Run the SQL commands from `fix-pdf-text-content-rls.sql` for RLS policies

5. **Start the development server:**
   ```bash
   npm start
   ```

6. **Open [http://localhost:3000](http://localhost:3000) to view the application**

### Available Scripts
- `npm start`: Runs the app in development mode
- `npm build`: Builds the app for production
- `npm test`: Launches the test runner
- `npm eject`: Ejects from Create React App (one-way operation)

## 🗄️ Database Schema

### **Tables**
- **users**: User profiles and authentication data
- **bases**: Study base collections
- **files**: Uploaded files metadata
- **pdf_text_content**: Extracted PDF text for AI processing

### **Row Level Security (RLS)**
- **User Isolation**: Users can only access their own data
- **Secure File Access**: Files are protected by user ownership
- **PDF Text Security**: Extracted text is user-specific

## 🤖 AI Features

### **PDF Text Extraction**
- **Automatic Processing**: Text extraction happens during file upload
- **PDF.js Integration**: Reliable PDF processing
- **Fallback Methods**: Multiple extraction strategies
- **Error Handling**: Graceful failure with user feedback

### **AI Chat**
- **Context-Aware**: Responses based on PDF content
- **Multiple Models**: Fallback system for reliability
- **Real-time Processing**: Instant responses to user questions
- **Error Recovery**: Graceful handling of API failures

## 🔐 Security Features

- **Row Level Security**: Database-level access control
- **Authentication**: Secure user sessions
- **File Isolation**: Users can only access their own files
- **API Key Protection**: Environment variable security
- **Input Validation**: Form validation and sanitization

## 🚀 Key Features Implemented

### **✅ Completed Features**
- [x] User authentication (login/signup)
- [x] Study base creation and management
- [x] File upload and organization
- [x] PDF text extraction
- [x] AI-powered chat with PDF context
- [x] Responsive design
- [x] Theme switching
- [x] Database integration
- [x] File management (add/remove)
- [x] Base editing and deletion

### **🔄 Current Status**
- **Authentication**: Fully functional with Supabase
- **File Management**: Complete CRUD operations
- **PDF Processing**: Automatic text extraction
- **AI Chat**: Multi-model fallback system
- **UI/UX**: Responsive glassmorphic design

## 🎯 Development History

This project evolved through several key phases:

### **Phase 1: Foundation**
- Initial React setup with futuristic design
- Theme system implementation
- Responsive navigation

### **Phase 2: Authentication**
- Supabase integration
- User authentication system
- Protected routes

### **Phase 3: Base Management**
- Study base CRUD operations
- File upload system
- Base editing capabilities

### **Phase 4: AI Integration**
- PDF text extraction
- AI chat implementation
- Multi-model fallback system

## 🚀 Future Enhancements

- **Real-time Collaboration**: Multi-user study sessions
- **Advanced AI Features**: Document summarization, question generation
- **Progress Tracking**: Study analytics and progress visualization
- **Mobile App**: React Native version
- **Offline Support**: PWA capabilities
- **Advanced File Types**: Support for more document formats
- **Study Groups**: Collaborative study features
- **Export Features**: PDF generation and sharing

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

---

**StudyBase** - Making studying simple, organized, and AI-powered! 🚀📚🤖