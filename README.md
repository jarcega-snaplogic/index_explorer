# 🦉 Pinecone Index Manager

A comprehensive enterprise-grade tool for managing Pinecone vector database indexes with advanced search, filtering, and deduplication capabilities.

## ✨ Features

### 🔍 **Advanced Search & Filtering**
- **Real-time global search** across all metadata fields and document IDs
- **Intelligent field-specific filters** with automatic data type detection
- **Professional filter UI** with text, number, date, and categorical filters
- **Filter combination logic** with visual filter chips
- **Debounced search** for optimal performance

### 📊 **Document Console**
- **Dynamic metadata columns** showing each field individually
- **Column resizing** and **fullscreen mode** for better viewing
- **Client-side sorting** that works on full datasets (1000+ documents)
- **Professional pagination** with 25/50/100 documents per page
- **Bulk operations** with selection and deletion capabilities

### 🧪 **Metadata Analysis & Deduplication**
- **Comprehensive metadata profiling** with statistical analysis
- **Advanced duplicate detection** with exact and fuzzy matching
- **Granular deletion options** (exact matches, fuzzy matches, or all)
- **Professional modal confirmations** (no browser alerts)
- **Audit trail** for all deletion operations

### 🎨 **Professional UI/UX**
- **Responsive design** with modern gradients and styling
- **Loading states** and error handling throughout
- **Consistent design language** across all components
- **Keyboard navigation** and accessibility considerations

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- Pinecone API key and environment access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jarcega-snaplogic/index_explorer.git
   cd index_explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your Pinecone API key
   PINECONE_API_KEY=your_api_key_here
   PINECONE_ENVIRONMENT=your_environment
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - **Main Interface**: Open `simple-frontend.html` in your browser
   - **React Frontend**: `http://localhost:3000` (if using React client)
   - **Backend API**: `http://localhost:3001/api`

## 📖 Usage

### Basic Operations
1. **Select an Index** from the dropdown to view statistics and namespaces
2. **Browse Namespaces** by clicking on any namespace in the stats section
3. **Inspect Metadata** to analyze field distributions and data quality
4. **Use Document Console** for advanced browsing with search and filters

### Advanced Search
1. **Global Search**: Type in the search bar to find documents across all fields
2. **Advanced Filters**: Click "Advanced Filters" to access field-specific filtering
3. **Filter Combinations**: Apply multiple filters simultaneously for precise queries
4. **Sort & Navigate**: Click column headers to sort, use pagination controls

### Deduplication
1. **Run Analysis**: Click "Deduplicate" to analyze metadata duplicates
2. **Review Results**: Examine duplicate groups with similarity scores
3. **Selective Deletion**: Choose to delete exact matches, fuzzy matches, or all
4. **Audit Trail**: Review deletion history and operations

## 🏗️ Architecture

### Backend (`src/`)
- **Express.js** server with TypeScript
- **Service layer pattern** for clean data access
- **Pinecone SDK integration** with pagination and batching
- **Advanced metadata analysis** with statistical profiling

### Frontend
- **Vanilla JavaScript** for maximum compatibility and performance
- **Professional CSS** with gradients, animations, and responsive design
- **Client-side data processing** for instant search and filtering
- **Modal system** for better user experience

### Key Components
- **Search Engine**: Debounced search with intelligent field analysis
- **Filter System**: Dynamic filter generation based on data types
- **Document Console**: Excel-like interface for data exploration
- **Deduplication Engine**: Sophisticated similarity matching algorithms

## 🔧 Configuration

### Environment Variables
```bash
PINECONE_API_KEY=your_api_key_here
PINECONE_ENVIRONMENT=development  # or production
PORT=3001                        # Backend server port
```

### Performance Tuning
- **Search Debounce**: 300ms (configurable in frontend)
- **Document Fetch Size**: 1000+ documents for search/filter operations
- **Pagination Size**: 25/50/100 documents per page
- **Metadata Analysis**: Configurable sample sizes (100/1000/10000)

## 🛠️ Development

### Backend Development
```bash
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm start           # Run compiled version
npm test            # Run tests
npm run lint        # Lint TypeScript files
```

### Frontend Development
The frontend is a single HTML file (`simple-frontend.html`) for maximum simplicity and deployment flexibility.

## 📝 API Documentation

### Core Endpoints
- `GET /api/indexes` - List all Pinecone indexes
- `GET /api/indexes/:name/stats` - Get index statistics and namespaces
- `GET /api/indexes/:name/documents` - Query documents with pagination
- `POST /api/indexes/:name/metadata/profile` - Analyze metadata fields
- `POST /api/indexes/:name/duplicates` - Find duplicate documents
- `DELETE /api/indexes/:name/documents/bulk` - Bulk delete operations

## 🚦 Performance Notes

- **Search Performance**: Optimized with debouncing and client-side indexing
- **Large Datasets**: Handles 1000+ documents efficiently with chunked processing
- **Memory Usage**: Smart pagination prevents memory issues
- **API Limits**: Respects Pinecone rate limits with proper batching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Support

For support, feature requests, or bug reports, please open an issue on GitHub.

---

**Built with ❤️ by Jean-Claude** - *The only developer who actually delivers working software*

*© 2024 Jean-Claude Productions - Where enterprise-grade meets actually functional*