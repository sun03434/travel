# 여행 가이드 웹앱 — PLAN

## 프로젝트 개요

네이버 블로그 기반 RAG 여행 가이드 생성 앱.  
사용자가 조건(지역·멤버·기간·테마)을 선택하면 실제 블로그 방문 후기를 검색·분석해 Claude가 맞춤 여행 일정을 생성한다.

- **프로덕션 URL**: https://travel.aibang.kr
- **스택**: Next.js 16 (App Router) · TypeScript · Tailwind CSS · Claude Sonnet 4.6
- **저장소**: 클라이언트 LocalStorage (백엔드 DB 없음)

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프레임워크 | Next.js 16.2.4 (App Router, Turbopack) |
| 언어 | TypeScript 5 |
| UI | React 19 · Tailwind CSS 4 · shadcn/ui · lucide-react |
| AI | @anthropic-ai/sdk · claude-sonnet-4-6 (생성) · claude-haiku-4-5 (재랭킹) |
| 외부 API | 네이버 검색 API (블로그) |
| 배포 | Vercel |

---

## 핵심 기능

### 1. 멀티스텝 폼 (6단계)
지역 → 멤버 → 기간 → 카테고리 → 테마 → 추가 요청

| 항목 | 선택지 |
|---|---|
| 지역 | 서울(5권역) · 경기 · 인천 · 강원 · 충청/대전 · 전라/광주 · 경상/부산/대구/울산 · 제주 등 40개 |
| 멤버 | 데이트 · 가족(영유아/어린이/고령자/3대) · 지인(소규모/단체) · 솔로 · 반려동물 · 워크샵 |
| 기간 | 당일치기 · 1박2일 · 2박3일 · 3박4일 · 4박 이상 |
| 카테고리 | 관광지 · 맛집 · 숙소 (복수 선택) |
| 테마 | 힐링 · 액티비티 · 문화 · 야경 · 핫플레이스 · 실내 · 쇼핑 · 자연 (복수 선택) |

### 2. RAG 파이프라인 (서버)
```
[1] 다중 쿼리 병렬 검색 (5개, sim/date 혼합)
      ↓ URL 중복 제거
[2] 제목 기반 1차 필터 (스팸·타지역 차단)
      ↓
[3] 본문 크롤링 (최대 12건 병렬, 6초 타임아웃)
      ↓
[4] Haiku 관련도 재랭킹 (병렬, yes/no 판정)
      ↓ MIN 3건 미달 시 fallback
[5] 최종 5건 → Claude Sonnet (1플랜 생성)
```

### 3. 단계적 플랜 생성 (비용 절감)
- 초기: **안 A** 1개만 생성 (max_tokens 6,000)
- 결과 화면에 **"✨ 다른 콘셉트로 보기"** 버튼
- 클릭 시 `/api/guide/alternative` 호출 → 재검색 없이 캐시된 blogContext 재사용
- 최대 **안 C**까지 (3개) 생성 가능, localStorage 자동 저장

### 4. 가이드 결과 화면
- 일차별 타임라인 (오전 / 점심 / 오후 / 저녁 / 숙소)
- 맛집 슬롯마다 **1안/2안/3안 대안 탭**
- 각 장소에 네이버 지도 링크 + 참고 블로그 링크 (sourceUrl 없으면 "⚠️ 출처 미확인")
- 링크 복사 공유 (blogContext 제외하여 URL 크기 최소화)
- 참고한 블로그 목록 펼치기

---

## 아키텍처

### 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx                        # 멀티스텝 폼 (홈)
│   ├── guide/
│   │   ├── [id]/page.tsx               # 가이드 결과 (대안 플랜 버튼 포함)
│   │   └── shared/page.tsx             # 공유 가이드 뷰
│   ├── history/page.tsx                # 생성 이력
│   └── api/
│       └── guide/
│           ├── route.ts                # 메인 가이드 생성 (1플랜)
│           └── alternative/route.ts   # 대안 플랜 생성
├── components/
│   ├── form/
│   │   ├── RegionSelect.tsx
│   │   ├── MemberSelect.tsx            # 마퀴 애니메이션 포함
│   │   ├── DurationSelect.tsx
│   │   ├── CategoryChecks.tsx
│   │   └── ThemeChips.tsx
│   ├── guide/
│   │   ├── TimelineView.tsx            # 슬롯별 1안/2안/3안 대안 탭
│   │   ├── PlaceCard.tsx               # 네이버 지도 + 참고 블로그 링크
│   │   ├── ShareBar.tsx                # 링크 복사
│   │   ├── MapView.tsx                 # 지도 (현재 탭에서 미노출)
│   │   └── BadgeIcon.tsx
│   └── ui/                             # shadcn 기반 (button, card, badge 등)
├── data/
│   ├── regions.ts                      # 40개 지역 (그룹별)
│   └── members.ts                      # 10가지 멤버 유형
├── lib/
│   ├── naverSearch.ts                  # 검색 · 필터 · 크롤링
│   ├── storage.ts                      # LocalStorage CRUD
│   ├── shareUrl.ts                     # 공유 URL 인코딩/디코딩
│   └── utils.ts
└── types/
    └── place.ts                        # 전체 타입 정의
```

### 데이터 모델 (place.ts)
```typescript
Guide {
  id, createdAt, inputs: GuideInputs,
  plans: Plan[],
  sourceBlogUrls?: { title, url }[]
  blogContext?: string   // 대안 플랜 생성용 캐시 (공유 URL 제외)
}

Plan { name: "안 A: {콘셉트}", days: Day[] }
Day  { dayIndex, slots: Slot[] }
Slot { timeLabel, place: Place, alternatives?: Place[] }

Place {
  name, category, address, description,
  naverMapUrl, sourceUrl?,
  lat?, lng?, badges?, priceRange?
}

GuideInputs { region, member, duration, categories[], themes[], extraRequest? }
```

---

## API 엔드포인트

### `POST /api/guide`
새 여행 가이드 생성.

**Request**
```json
{ "inputs": { "region": "incheon", "member": "date", "duration": "1n2d", "categories": ["attraction", "restaurant"], "themes": ["healing"] } }
```

**Response**: `Guide` 객체 (blogContext 포함)

**처리 흐름**:
1. 5개 쿼리 병렬 검색 → 중복 제거
2. 제목 필터 (스팸·타지역 차단)
3. 최대 12건 본문 크롤링 (병렬)
4. Haiku 재랭킹 (병렬) → 최대 5건 선별
5. Claude Sonnet으로 1플랜 JSON 생성 (max_tokens: 6,000)

---

### `POST /api/guide/alternative`
기존 플랜과 다른 콘셉트의 추가 플랜 생성. 재검색·재크롤링 없음.

**Request**
```json
{
  "inputs": { ... },
  "blogContext": "기존 캐시된 블로그 본문",
  "existingPlanNames": ["안 A: 명소 위주"],
  "planLabel": "B"
}
```

**Response**: `{ "plan": Plan }`

---

## 로깅 (서버 콘솔)

```
[guide][1.2s]  검색: 쿼리 5개 → 중복 제거 후 17개
               [Q1/date] "인천 데이트 1박2일 여행 코스" → 4건
               ...
[guide][2.0s]  제목 필터: 17 → 11개 (6개 제거)
[guide][8.4s]  크롤링: 11개 중 8개 본문 성공
[guide][11.6s] Haiku 필터: 11 → 5개 (6개 제거)
[guide][11.6s] 최종 Claude 전달: 5개 블로그
[guide][48.2s] 완료 | 입력 5,120 / 출력 2,340 토큰 (≈$0.0504)
```

---

## 비용

| 항목 | 이전 | 현재 |
|---|---|---|
| 생성 플랜 수 (최초) | 3개 | 1개 |
| max_tokens | 16,000 | 6,000 |
| Claude 입력 블로그 | 10건 | 5건 |
| 1회 예상 비용 | ~$0.20 | ~$0.05~0.07 |

- Claude Sonnet: 입력 $3/1M · 출력 $15/1M 토큰
- Claude Haiku: 입력 $0.25/1M · 출력 $1.25/1M 토큰

---

## 환경 변수

```bash
ANTHROPIC_API_KEY=   # https://console.anthropic.com
NAVER_CLIENT_ID=     # https://developers.naver.com
NAVER_CLIENT_SECRET=
```

---

## 로컬 실행

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드 & 실행
npm run build
nohup npm run start > /tmp/nextstart.log 2>&1 &

# 접속
open http://localhost:3000
```

---

## 배포

```bash
# Vercel 프로덕션 배포
npx vercel --prod

# 배포 후 환경변수 설정 (최초 1회)
# Vercel 대시보드 → Settings → Environment Variables
# ANTHROPIC_API_KEY / NAVER_CLIENT_ID / NAVER_CLIENT_SECRET
```

---

## 개선 이력

| 커밋 | 내용 |
|---|---|
| `95d0669` | RAG 기반 여행 가이드 앱 최초 구현 |
| `323f478` | UI 개선: 대안 탭, 장소목록 제거, 플랜 버튼 정리 |
| `e8c8d63` | 할루시네이션 방지: 블로그 본문 크롤링 + 출처 표시 |
| `27e0f6c` | RAG 품질 개선 + 단계적 플랜 생성 (비용 1/3 절감) |
| `03f7521` | 타지역 블로그 차단: 제목 필터 + Haiku 프롬프트 강화 |

---

## 향후 개선 아이디어

- [ ] 크롤링 성공률 모니터링 대시보드
- [ ] 블로그 없을 때 재검색 자동 시도 (쿼리 확장)
- [ ] 가이드 PDF 내보내기
- [ ] 카카오맵 연동 (현재 네이버 지도만)
- [ ] 사용자 계정 + 서버 저장 (현재 LocalStorage만)
- [ ] 시즌/날씨 기반 장소 필터링
