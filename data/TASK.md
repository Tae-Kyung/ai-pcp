# AI-PCP 작업 목록

## 완료된 작업

### Phase 0: 프로젝트 초기 설정
- [x] Next.js (App Router) + TypeScript + Tailwind CSS 프로젝트 생성
- [x] 패키지 설치 (Anthropic SDK, Supabase, Zod, Vitest 등)
- [x] CLAUDE.md 작성
- [x] .env.local.example 작성
- [x] Vitest 설정 (vitest.config.ts)

### Phase 1: 핵심 타입 및 AI 파이프라인
- [x] PCP 타입 정의 (`src/lib/types/pcp.ts`) — PCPDocument, PCPBasicInfo, PCPRationale 등
- [x] 하네스 타입 정의 (`src/lib/types/harness.ts`) — 8개 평가 차원, 가중치, 회귀 체크
- [x] Claude API 클라이언트 (`src/lib/claude/client.ts`) — 싱글톤 클라이언트, 모델 설정
- [x] 시스템 프롬프트 (`src/lib/prompts/system.ts`) — PCP 전문가 프롬프트, 생성/섹션 보조 프롬프트
- [x] 평가 프롬프트 (`src/lib/prompts/evaluation.ts`) — 8개 차원 평가 기준

### Phase 2: 하네스 평가 시스템
- [x] 테스트 케이스 5개 (`src/lib/harness/test-cases.ts`) — Cambodia, Ethiopia, Bangladesh, Senegal, Uzbekistan
- [x] PCP 생성기 (`src/lib/harness/generator.ts`) — Claude API 호출, JSON 파싱
- [x] PCP 평가기 (`src/lib/harness/evaluator.ts`) — 가중 평균 점수 산출
- [x] 하네스 러너 (`src/lib/harness/runner.ts`) — 생성→평가 파이프라인, 회귀 체크
- [x] CLI 실행기 (`src/lib/harness/cli.ts`) — 전체/부분 실행, 결과 저장
- [x] 하네스 API 라우트 (`src/app/api/harness/evaluate/`, `results/`)
- [x] 단위 테스트 (`evaluator.test.ts`, `test-cases.test.ts`)

---

## 남은 작업

### Phase 3: Supabase 연동 및 인증
- [ ] Supabase 클라이언트 설정 (`src/lib/supabase/client.ts`, `server.ts`)
- [ ] DB 스키마 설계 및 마이그레이션 (projects, pcp_documents, users 테이블)
- [ ] Supabase Auth 연동 (회원가입/로그인/로그아웃)
- [ ] 인증 미들웨어 (`src/middleware.ts`)
- [ ] Row Level Security (RLS) 정책 설정

### Phase 4: PCP 생성 API
- [ ] PCP 생성 API 라우트 (`src/app/api/pcp/generate/route.ts`)
- [ ] 섹션별 보조 생성 API (`src/app/api/pcp/assist/route.ts`)
- [ ] 입력 유효성 검증 (Zod 스키마)
- [ ] 생성된 PCP 저장/조회/수정 API (`src/app/api/pcp/[id]/route.ts`)
- [ ] PCP 버전 관리 (이력 추적)

### Phase 5: 프론트엔드 — 위저드 UI
- [ ] 레이아웃/네비게이션 (`src/app/layout.tsx` 개선)
- [ ] 랜딩 페이지 (`src/app/page.tsx` 교체)
- [ ] 로그인/회원가입 페이지 (`src/app/auth/`)
- [ ] 대시보드 — 프로젝트 목록 (`src/app/dashboard/page.tsx`)
- [ ] PCP 생성 위저드 (`src/app/pcp/new/`)
  - [ ] Step 1: 기본 정보 입력 (국가, 섹터, 제목, 예산 등)
  - [ ] Step 2: 문제 분석 및 배경 입력
  - [ ] Step 3: 프로젝트 목표 및 성과 입력
  - [ ] Step 4: 이해관계자 분석
  - [ ] Step 5: 관리/실행 계획
  - [ ] AI 생성 결과 미리보기 및 편집
- [ ] PCP 상세 조회/편집 페이지 (`src/app/pcp/[id]/`)
- [ ] PCP PDF/문서 내보내기

### Phase 6: AI 품질 개선
- [ ] 프롬프트 최적화 (하네스 점수 기반 반복 개선)
- [ ] 섹션별 생성 → 전체 문서 조합 방식 (멀티스텝 생성)
- [ ] 국가/섹터별 컨텍스트 데이터 활용 (RAG 또는 few-shot)
- [ ] 하네스 테스트 케이스 확장 (10개 이상)
- [ ] 하네스 결과 대시보드 UI

### Phase 7: 배포 및 운영
- [ ] Vercel 배포 설정
- [ ] Supabase 프로덕션 환경 구성
- [ ] 환경변수 관리 (Vercel Environment Variables)
- [ ] 에러 모니터링 (Sentry 등)
- [ ] E2E 테스트 (Playwright)

---

## 다음 우선순위

**Phase 3 → Phase 4 → Phase 5** 순서로 진행 권장.
- Supabase 연동이 선행되어야 사용자별 PCP 저장/관리가 가능
- PCP 생성 API가 있어야 프론트엔드 위저드가 동작
- 프론트엔드는 API가 준비된 후 구현
