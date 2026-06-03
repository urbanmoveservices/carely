# E2E test image fixtures



The E2E runner (`npm run test:e2e`) uses four lab report images for upload and OCR tests.



## Required files



Place these under `test-fixtures/` (preferred) or the project root:



- `lab-page-1.jpeg`

- `lab-page-2.jpeg`

- `lab-page-3.jpeg`

- `lab-page-4.jpeg`



Supported extensions: `.jpeg`, `.jpg`, `.png`, `.webp`



On first run, files found only at the project root are copied into `test-fixtures/`.



## Privacy



Use demo/synthetic lab images only. Do not commit real patient reports.



## Skipped tests



If any of the four pages is missing, upload/OCR checks are **SKIP**ped — other API tests still run.

