# 운영 가이드

실행 가능한 설정의 원본은 다음 파일이다.

- 명령과 패키지: `package.json`
- 환경변수 예시: `.env.example`
- 컨테이너 구성: `docker-compose.yml`, `Dockerfile`
- CI/CD: `.github/workflows/ci-deploy.yml`
- 배포와 백업: `scripts/deploy.sh`, `scripts/backup-sqlite.sh`

## 로컬 개발

Node.js 20과 `pnpm`이 필요하다. 기본 AI 공급자를 사용할 경우 Ollama도
실행되어 있어야 한다.

```bash
pnpm install
cp .env.example .env
mkdir -p app_data
pnpm db:push
pnpm dev
```

기본 설정에서는 Ollama에 `.env`의 `AI_MODEL`과 같은 모델 태그가 설치되어
있어야 한다.

```bash
ollama list
```

## AI 공급자 설정

애플리케이션은 다음 공통 환경변수로 모델 API를 선택한다.

| 환경변수 | 설명 |
| --- | --- |
| `AI_PROVIDER` | `ollama` 또는 `openai-compatible` |
| `AI_MODEL` | 공급자에 전달할 모델 식별자 |
| `AI_BASE_URL` | 공급자 API의 base URL |
| `AI_API_KEY` | Bearer API key. 필요한 공급자에서만 설정 |

로컬 Ollama:

```dotenv
AI_PROVIDER=ollama
AI_MODEL=gemma4:26b
```

이 값은 예시이며, `ollama list`로 운영 호스트에 실제 설치된 모델 태그를 확인한 뒤
`AI_MODEL`을 해당 태그로 설정한다.

OpenAI 호환 API:

```dotenv
AI_PROVIDER=openai-compatible
AI_MODEL=your-model
AI_BASE_URL=https://provider.example.com/v1
AI_API_KEY=your-api-key
```

`openai-compatible`은 `/chat/completions`와 SSE 스트리밍 규격을 지원하는
서비스에 사용할 수 있다. 공급자마다 지원 옵션이 다를 수 있으므로 모델명과
base URL은 해당 서비스 문서를 확인한다.

## 검증

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

`pnpm install`은 Husky Git 훅을 설정한다. 커밋할 때는 스테이징된 JavaScript와
TypeScript 파일에 `eslint --fix`를 실행하며, 수정할 수 없는 린트 오류가 남으면
커밋을 중단한다.

`main` 브랜치 push 시 GitHub 호스팅 runner도 합성 회귀 테스트, 타입 검사와 production build를
통과해야 배포를 시작한다.

## 운영 구조

- Self-hosted GitHub Actions runner가 배포한다.
- runner label은 `care-for-all-prod`다.
- Repository variable `DEPLOY_PATH`는 운영 디렉터리의 절대 경로다.
- 운영 디렉터리의 `.env`, `app_data`, `backups`는 소스 동기화에서 제외된다.
- 앱이 바인딩되는 호스트 포트와 주소는 `docker-compose.yml`의 `ports` 설정이 기준이다.
- 외부 접속은 Named Cloudflare Tunnel, Tailscale 또는 인증된 리버스 프록시가
  담당한다.

Quick Tunnel은 고정 주소와 가용성을 보장하지 않으므로 배포 확인에만 쓴다.

## 최초 운영 준비

운영 호스트에는 Docker Desktop, `docker compose`, `sqlite3`, `rsync`가
필요하다. 예시 디렉터리:

```text
/path/to/services/care-for-all
/path/to/actions-runner
```

```bash
mkdir -p /path/to/services/care-for-all
cd /path/to/services/care-for-all
mkdir -p app_data backups
cp /path/to/source/.env.example .env
```

Ollama를 사용한다면 `.env`의 `AI_MODEL`을 운영 호스트에 설치된 태그로
변경한다. 외부 API를 사용한다면 `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`를
해당 공급자 값으로 설정한다.

Self-hosted runner는 저장소의 `Settings > Actions > Runners`에서 운영 호스트의
OS와 아키텍처에 맞게 등록하고 `care-for-all-prod` label을 추가한다.
runner 환경(OS, 아키텍처)을 변경하면 `.github/workflows/ci-deploy.yml`의
`runs-on` 레이블도 함께 수정해야 한다.
서비스 설치 후 runner 계정에서 Docker가 동작하는지 확인한다.

```bash
./svc.sh install
./svc.sh start
./svc.sh status
docker compose version
docker ps
```

신뢰할 수 없는 public 저장소나 외부 PR 워크플로에 production runner를
제공하지 않는다.

## 배포

`main` push 또는 `CI and Deploy` 워크플로의 수동 실행으로 배포한다.

배포 스크립트는 다음 순서로 동작한다.

1. 검증된 소스를 운영 디렉터리에 동기화한다.
2. Docker 이미지를 빌드한다.
3. 기존 SQLite DB를 온라인 백업한다.
4. Drizzle 스키마를 적용한다.
5. 앱 컨테이너를 교체한다.
6. 컨테이너 내부 `/api/test`로 상태를 확인한다.

운영 확인 (포트는 `docker-compose.yml` 기준):

```bash
cd /path/to/production
docker compose ps
docker compose logs --tail=100 app
curl --fail http://127.0.0.1:$(docker compose port app 3000 | cut -d: -f2)/api/test
cat .deploy-version
```

장애 대응용 수동 배포:

```bash
./scripts/deploy.sh \
  /absolute/path/to/verified/source \
  /absolute/path/to/production \
  manual
```

## 백업과 복구

실행 중인 SQLite 파일을 `cp`로 백업하지 않는다. SQLite online backup을
사용한다.

```bash
./scripts/backup-sqlite.sh
```

백업은 서버와 다른 저장장치에도 복제하고 정기적으로 복구를 시험한다.

복구:

```bash
docker compose stop app
cp backups/sqlite-YYYYMMDD-HHMMSS.db app_data/sqlite.db
docker compose up -d app
```

복구 전에 현재 DB를 별도 이름으로 보관한다.

## 실패 대응

- 검증 실패: 배포하지 않으며 기존 서비스는 유지된다.
- Docker build 실패: 컨테이너 교체 전 중단되어 기존 서비스가 유지된다.
- 스키마 적용 실패: 직전에 생성된 백업을 확인하고 배포를 중단한다.
- 상태 확인 실패: 새 컨테이너 로그를 확인하고 이전 revision 재배포 또는 DB
  복구 여부를 판단한다.

## 정기 점검

- `app_data`, `.env`, `backups`가 Git에 포함되지 않았는지 확인한다.
- 디스크 여유 공간과 백업 성공 여부를 확인한다.
- 백업 복구를 주기적으로 시험한다.
- 프롬프트와 생성 결과가 일반 로그에 남지 않는지 확인한다.
- Docker와 호스트 OS의 보안 업데이트를 적용한다.


## Vercel + Turso + Gemini 준비

기존 Docker/로컬 SQLite 설정과 AI 공급자 인터페이스는 유지한다. 아래는 배포
준비 절차이며 실제 계정 생성·키 설정·DB 이전·배포가 완료되었다는 뜻은 아니다.

1. Vercel Hobby의 개인 비상업적 이용 조건에 맞는지 확인한다. 센터의 실제 업무용
   사용을 무료로 단정하지 않는다. 유료 플랜 변경은 별도 결정이다.
2. 합성 데이터용 Turso **libSQL** DB와 필요한 자격 증명을 준비한다. 기존
   `@libsql/client`를 유지한다. 앱 실행과 schema 적용에 같은 URL/토큰을 사용하되,
   운영 DB와 Preview DB는 분리한다. URL과 토큰은 서버 전용 환경변수로 저장한다.
3. `DATABASE_URL=libsql://<database-host>`와 `TURSO_AUTH_TOKEN`을 설정한다.
   Drizzle Kit는 원격일 때 `turso`, 파일일 때 `sqlite` dialect를 선택한다.
   `pnpm db:push`는 대상 DB를 바꾸므로 명시적으로 확인한 빈 테스트 DB에만 실행한다.
   Vercel 빌드 명령에 DB push를 넣지 않는다.
4. `ALLOWED_EMAILS`에 허용 Google 계정을 쉼표로 구분해 지정한다. Vercel에서는
   미설정 상태로 기록을 열 수 없다. Google OAuth의 검증된 이메일과 정확히 비교한다.
   가입과 새 세션 생성 단계에서도 적용하며, 기존 세션의 데이터 접근도 다시 확인한다.
   기존 Docker에서도 공개 접속에 사용한다면 이 값을 설정한다.
5. Better Auth secret, Google OAuth ID/secret과 실제 배포 도메인의 callback을
   준비한다. `BETTER_AUTH_URL`을 명시하면 우선 사용한다. Vercel에서만 이 값이 없을 때
   시스템 `VERCEL_URL`의 검증된 `*.vercel.app` 호스트에 HTTPS를 붙여 사용한다.
   Google redirect URI에는 해당 origin의 `/api/auth/callback/google`을 정확히 등록한다.
   Preview URL은 deployment protection을 유지하며, 보호 설정을 우회하지 않는다.
   운영과 Preview 설정을 구분하며, 비밀값은 Git이나 채팅에 붙여넣지 않는다.
6. Gemini에는 기존 `AI_PROVIDER=openai-compatible`을 사용한다. `AI_BASE_URL`은
   `https://generativelanguage.googleapis.com/v1beta/openai`, `AI_MODEL`은 프로젝트에서
   사용할 수 있는 모델 ID, `AI_API_KEY`는 Gemini 키로 설정한다. 새 SDK는 필요 없다.
7. 합성 입력으로 일일 스트림·일일 일반 응답·주간 생성과 오류/잘림/시간 초과를
   확인한다. 공개 함수·반환 타입·기존 Ollama 설정과 30초/500토큰·60초/700토큰은
   유지한다. 현재 `max_tokens`/temperature와 모델의 추론 기본값은 실제 선택 모델에서
   다시 검증해야 한다. 호환 API 문서 확인과 mock 테스트를 실제 API 검증으로 보지 않는다.
   AI_PROVIDER와 AI_MODEL은 생성 요청 시 검증하며, 누락 시 임의 공급자나 모델로
   대체하지 않는다. 로그인과 DB 조회는 AI 설정이 없어도 동작한다. 일일 생성 API는
   인증 후 AI 설정 누락을 503 구성 오류로 응답한다.
8. 무료 조건·계정 연결·테스트가 충족된 경우에만 Preview를 배포한다. Node 런타임을
   사용하며 일일 Route Handler는 maxDuration 60초, 주간 Server Action의 페이지는
   120초다. 실제 플랫폼 설정과 배포 빌드가 이를 반영하는지 확인한다.

API 오류는 Error 또는 스트림 오류로 전달한다. OpenAI 호환 어댑터는 잘림·차단·
도구 호출 등 완성되지 않은 종료 이유를 실패로 처리한다. 같은 어댑터의 스트림은
정상 `stop`과 비어 있지 않은 본문을 확인하며, 중간 EOF나 `stop` 없는 `[DONE]`은 실패다.
이 어댑터의 HTTP 오류는 민감 내용이 포함될 수 있는 응답 본문을 제외하고 상태만 전달한다.
기존 Ollama 어댑터에는 이 종료 상태·오류 본문 처리가 아직 적용되지 않았다.

공급자와 관계없이 일일 생성은 서버와 클라이언트에서 최종 형식을 검증하고,
검토 후 저장/수정에도 같은 초안 스키마를 적용한다. 형식 검증이 공급자의 정상 완료나
사실성 검증을 대신하지는 않는다.
생성 중 reader 취소는 기존 stream pipe를 통해 상류로 전달한다. 새 AbortSignal
인자를 추가하지 않았으며, 이미 전송된 요청의 공급자 과금 취소까지 보장하지 않는다.

`pnpm test`와 호환 별칭 `pnpm test:cloud`는 기존 TypeScript와 Node test runner를 사용한다.
실제 소스의 어댑터·인증 경계, 설치된 Better Auth의 생성 훅, 메모리 libSQL의 주간
상태 전이와 빈 초안 저장 차단을 합성 데이터로 확인한다. KST 경계는 UTC·Seoul·
Los Angeles 프로세스에서 비교한다. 외부 서비스를 호출하지 않으며, 실제 브라우저
Google OAuth·원격 DB·Gemini 품질 검증은 별도다.

현재 GitHub Actions의 main 배포는 Docker를 대상으로 유지된다. 클라우드 검증을
이유로 main에 바로 push하거나 기존 서버를 중지하지 않는다. 실제 이전 시에는
일관된 SQLite 백업, 관계/건수 확인, 쓰기 전환, Docker 자동 배포 정리와 복구 절차를
별도로 수행한다. Gemini 무료 API에는 실제 민감·개인 기록을 넣지 않는다.

참고: [Gemini 호환 API](https://ai.google.dev/gemini-api/docs/openai),
[Turso SDK](https://docs.turso.tech/sdk/ts/reference),
[Vercel Hobby 조건](https://vercel.com/docs/limits/fair-use-guidelines).
