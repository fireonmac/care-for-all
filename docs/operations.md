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

로컬 앱은 `AI_BASE_URL`이 없으면 `http://127.0.0.1:11434`를 사용하고,
Docker 앱은 Compose 기본값인 `http://host.docker.internal:11434`를 사용한다.

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
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

`main` 브랜치 push 시 GitHub 호스팅 runner도 타입 검사와 production build를
통과해야 배포를 시작한다.

## 운영 구조

- Mac Studio의 self-hosted GitHub Actions runner가 배포한다.
- runner label은 `care-for-all-prod`다.
- Repository variable `DEPLOY_PATH`는 운영 디렉터리의 절대 경로다.
- 운영 디렉터리의 `.env`, `app_data`, `backups`는 소스 동기화에서 제외된다.
- 앱은 호스트 `127.0.0.1:13000`에 바인딩된다.
- 외부 접속은 Named Cloudflare Tunnel, Tailscale 또는 인증된 리버스 프록시가
  담당한다.

Quick Tunnel은 고정 주소와 가용성을 보장하지 않으므로 배포 확인에만 쓴다.

## 최초 운영 준비

운영 호스트에는 Docker Desktop, `docker compose`, `sqlite3`, `rsync`가
필요하다. 예시 디렉터리:

```text
/Users/your-name/services/care-for-all
/Users/your-name/actions-runner
```

```bash
mkdir -p /Users/your-name/services/care-for-all
cd /Users/your-name/services/care-for-all
mkdir -p app_data backups
cp /path/to/source/.env.example .env
```

Ollama를 사용한다면 `.env`의 `AI_MODEL`을 운영 호스트에 설치된 태그로
변경한다. 외부 API를 사용한다면 `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`를
해당 공급자 값으로 설정한다.

Self-hosted runner는 저장소의 `Settings > Actions > Runners`에서 macOS ARM64로
등록하고 `care-for-all-prod` label을 추가한다. 서비스 설치 후 runner 계정에서
Docker가 동작하는지 확인한다.

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

운영 확인:

```bash
cd /Users/your-name/services/care-for-all
docker compose ps
docker compose logs --tail=100 app
curl --fail http://127.0.0.1:13000/api/test
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
