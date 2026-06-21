# Risk Register — PCB AI Inspection System
Last updated: [your date]

## Risk Matrix

| ID | Risk | Category | Probability | Impact | Score | Level |
|----|------|----------|-------------|--------|-------|-------|
| R-01 | Insufficient annotated data for 19 classes | Dataset | High | High | 9 | Critical |
| R-02 | YOLOv11 mAP below 90% target | AI Model | High | High | 9 | Critical |
| R-03 | Colab GPU session timeout | Infrastructure | High | High | 9 | Critical |
| R-04 | OCR fails on small/rotated markings | OCR | High | Medium | 7 | High |
| R-05 | Defect classifier underfits rare classes | AI Model | Medium | High | 7 | High |
| R-06 | FPIC/FICS-PCB datasets inaccessible | Dataset | Medium | High | 7 | High |
| R-07 | Frontend-backend API integration breaks | Technical | Medium | Medium | 6 | High |
| R-08 | Component visual similarity confusion | AI Model | Medium | Medium | 5 | Medium |
| R-09 | Grad-CAM highlights wrong regions | XAI | Low | High | 5 | Medium |
| R-10 | Inference latency exceeds 8 seconds | Performance | Medium | Medium | 5 | Medium |
| R-11 | Knowledge base incomplete for rare parts | Knowledge Base | Low | High | 4 | Medium |
| R-12 | Health Score formula is unintuitive | Design | Low | Medium | 4 | Medium |
| R-13 | Voice assistant fails in noisy environments | Usability | Low | Medium | 3 | Low |
| R-14 | PDF report formatting errors | Technical | Low | Low | 2 | Low |
| R-15 | Deadline pressure causes incomplete testing | Project Management | Low | Low | 2 | Low |