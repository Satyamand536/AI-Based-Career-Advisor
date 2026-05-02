# AI Career Advisor System - Implementation Plan

## Completed Tasks

- [x] Analyze existing codebase
- [x] Create implementation plan
- [x] Get user approval

## Pending Tasks

- [ ] Update requirements.txt to include sentence-transformers
- [ ] Refactor ClassifierService to use EmbeddingService
- [ ] Simplify RecommenderEngine for pure embedding-based ranking
- [ ] Add better error handling and edge cases
- [ ] Create sample input/output examples
- [ ] Improve documentation and comments
- [ ] Test the system with sample data
- [ ] Ensure production readiness

## Key Changes Needed

1. **Dependencies**: Add sentence-transformers to requirements.txt
2. **ClassifierService**: Remove own model, use EmbeddingService singleton
3. **RecommenderEngine**: Remove classification-based filtering, rank purely by cosine similarity
4. **Error Handling**: Handle empty inputs, short resumes, unknown skills
5. **Explainability**: Provide similarity scores and explanations
6. **Modularity**: Ensure clean separation of concerns
