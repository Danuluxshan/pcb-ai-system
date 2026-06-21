1.1 Functional Requirements (FR)
Functional requirements define what the system must do. Write them as: 'The system shall...'
ID	Module	Requirement	Priority
FR-01	Image Input	System shall accept PCB image upload (JPEG, PNG, WEBP ≤10 MB)	Must Have
FR-02	Image Input	System shall accept mobile camera capture via browser	Must Have
FR-03	Component Detection	System shall detect ≥9 component classes with bounding boxes and confidence scores	Must Have
FR-04	Defect Classification	System shall classify each detected component into one of 12 defect states	Must Have
FR-05	OCR	System shall extract printed marking text from component surface	Must Have
FR-06	OCR	System shall match extracted text against electronics knowledge base and return specifications	Must Have
FR-07	Explainable AI	System shall generate Grad-CAM heatmaps for every defect prediction	Must Have
FR-08	Explainable AI	System shall display natural-language explanation alongside each heatmap	Should Have
FR-09	Testing Guidance	System shall provide per-component instrument testing instructions (DMM, oscilloscope, LCR, ESR)	Must Have
FR-10	Measurement Input	System shall accept user-entered measurement values and validate against expected ranges	Must Have
FR-11	Diagnosis	System shall produce a per-component diagnosis: Good / Weak / Faulty / Critically Damaged	Must Have
FR-12	Health Score	System shall compute a PCB Health Score (0–100) with severity breakdown	Must Have
FR-13	Repair	System shall provide repair procedures and equivalent component suggestions for faulty components	Must Have
FR-14	Voice	System shall read testing instructions aloud via text-to-speech	Should Have
FR-15	History	System shall store all inspection results and allow longitudinal comparison	Should Have
FR-16	Reports	System shall generate downloadable PDF and Excel inspection reports	Must Have
Table 1.1: Functional Requirements using MoSCoW prioritisation

1.2 Non-Functional Requirements (NFR)
Category	NFR	Target / Metric
Performance	Inference latency	Full pipeline (upload → results) ≤ 8 seconds on GPU server
Performance	Detection accuracy	mAP@0.5 ≥ 90% on held-out test set
Reliability	System uptime	≥ 99% during evaluation periods
Usability	Learning time	New user completes first inspection in ≤ 5 minutes
Security	Data handling	No user PII stored; all uploads deleted after session
Scalability	Concurrent users	Support ≥ 5 simultaneous upload+inference sessions
Portability	Browser support	Chrome, Firefox, Safari, Edge (latest); mobile responsive
Maintainability	Code quality	≥ 80% backend unit test coverage; documented API
