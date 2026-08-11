# AI-PCP Project

## Overview
AI-based PCP (Project Concept Paper) auto-generation system for international development cooperation (ODA).
Target users: developing country government officials writing KOICA-standard PCPs.

## Tech Stack
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Claude API (Anthropic SDK)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deployment**: Vercel

## Key Directories
- `src/lib/harness/` - PCP quality evaluation harness (test cases, evaluator, runner)
- `src/lib/prompts/` - Claude API prompt templates (system, evaluation)
- `src/lib/claude/` - Claude API client configuration
- `src/lib/types/` - TypeScript type definitions (pcp.ts, harness.ts)
- `data/` - Project documentation (requirement.md, PRD.md, TASK.md)

## Commands
- `npm run dev` - Start dev server
- `npm test` - Run unit tests (Vitest)
- `npm run harness` - Run full harness evaluation (requires ANTHROPIC_API_KEY)
- `npm run harness:list` - List harness test cases

## Harness System
The harness evaluates AI-generated PCPs across 8 dimensions:
1. Structure (15%) - KOICA 5-section format compliance
2. Logic (20%) - Problem-objective-activity-outcome logical chain
3. SDGs Alignment (10%) - Substantive SDGs connection
4. Relevance (15%) - Recipient country needs alignment
5. Results Framework (15%) - SMART indicators, logical framework
6. Risk/Sustainability (10%) - Risk analysis and sustainability plan
7. Writing Quality (10%) - Clarity, professionalism
8. Budget (5%) - Budget realism and structure

Regression threshold: 5% score drop triggers warning.

## Conventions
- Use English for code, comments, and API responses
- Use Korean for user-facing documentation (data/*.md)
- PCP output language: English
- All API routes under `src/app/api/`
- Types in `src/lib/types/`
