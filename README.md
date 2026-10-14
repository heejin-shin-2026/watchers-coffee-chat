# Watchers 커피챗 자동 매칭

KAIST 경영대학 투자동아리 Watchers 커피챗 — 신청 접수부터 4인 1조 자동 매칭, 조장 지정, 결과 안내까지.

요구사항 정의서: `workspace/your_files/coffee-chat-spec/coffee-chat-spec.pdf` (v1.0)

## 기술 스택

- Next.js 15 (App Router) + Tailwind CSS
- Supabase (PostgreSQL) — DB 전용, 모든 접근은 서버 API 경유
- Vercel 배포

## 시작하기

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (무료 티어)
2. Dashboard → SQL Editor에서 `supabase/migration.sql` 실행
3. Settings → API에서 `Project URL`과 `service_role` 키 확인

### 2. 관리자 계정 생성

SQL Editor에서 실행 (비밀번호는 bcrypt 해시 — 아래 예시는 `CoffeeChat2026!`의 해시이므로 **반드시 변경**):

```sql
-- 새 비밀번호의 bcrypt 해시는 https://bcrypt-generator.com 등에서 생성
insert into admins (email, password_hash)
values ('admin@watchers.kr', '$2b$10$REPLACE_WITH_YOUR_BCRYPT_HASH');
```

### 3. 환경변수 설정

`.env.example`을 복사해 `.env.local` 생성:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_JWT_SECRET=32자-이상-랜덤-문자열
PHONE_ENCRYPTION_KEY=64자리-hex (openssl rand -hex 32)
```

### 4. 실행

```bash
npm install
npm run dev
```

- 신청 폼: http://localhost:3000/apply
- 관리자: http://localhost:3000/admin

### 5. Vercel 배포

```bash
vercel
```

Vercel Dashboard → Project → Settings → Environment Variables에 위 4개 환경변수 등록 후 재배포.

## 주요 기능

- **신청 폼** (`/apply`): 모바일 우선, 1분 신청, 중복 신청 시 덮어쓰기, 접수번호 발급
- **관리자** (`/admin`): 회차 생성/마감, 신청자 조회·검색·엑셀, 자동 매칭, 수동 조정(교환/대기자 교체/조장 변경), 확정, 조별·조장 안내문 복사
- **자동 매칭**: 지역 일치(40) + 관심사 겹침(12/개) + 소속 다양성(6) 가중치, 탐욕 편성 + 교환 개선 + 30회 반복 최고안, 이전 회차 동일 조 회피
- **조장 자동 지정**: 조에서 신청 시각이 가장 빠른 사람을 조장으로 지정 (수동 변경 가능)
- **보안**: 전화번호 AES-256-GCM 암호화 저장, 목록 마스킹, 동의 로그 영구 보관, RLS로 anon 차단
