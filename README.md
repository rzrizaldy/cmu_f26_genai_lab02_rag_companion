# RAG Companion · Lab 02

Interactive companion for **Lab 02: RAG. How does a machine read your resume?**
CMU Generative AI Lab · Fall 2026 · prepared by Rizaldy Utomo (TA)

**Live:** https://rzrizaldy.github.io/cmu_f26_genai_lab02_rag_companion/

Five layers of a RAG pipeline you can click through: chunking strategies, an embedding map of 2,800+
job-posting chunks, retrieval with metadata filters, an evaluation leaderboard with 95% ranges, and a
resume matcher. Your resume is parsed and embedded **in your browser** (Transformers.js); nothing is uploaded.

Single static page: `index.html` + `rag_bundle.js` (exported from the lab notebook). No build step.

## Data
- 384 postings from *LinkedIn Job Postings 2023–24* by Arsh Koneru & Zoey Yu Zou (Kaggle), **CC BY-SA 4.0**, via the `xanderios/linkedin-job-postings` HF mirror
- 40 postings from USAJOBS (March 2026) via `loyoladatamining/usajobs` (US government work)
- 8 anonymized persona resumes from the Kaggle Resume Dataset

Postings were cleaned and re-sectioned for teaching. The data in `rag_bundle.js` is shared under **CC BY-SA 4.0**.
Code (`index.html`) is MIT.
