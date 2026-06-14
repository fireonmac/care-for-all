# 케어포올 요양보호기록 작성기 - 배포 아키텍처 결정 문서 (ADR)

## 1. 상황과 제약

- 기술 구성: Next.js 16.2.9 App Router, Drizzle ORM, SQLite, Ollama
- 초기 사용자: 한 기관의 3~4명
- 인프라: AI 모델을 실행할 개인 GPU 서버 보유
- 목표: 초기 운영 비용과 외부 의존성을 낮추면서 데이터를 한 서버에서 관리

## 2. 검토한 선택지

### 옵션 1: Vercel + Turso + 개인 AI 서버

장점:

- Git 기반 자동 배포와 Vercel Edge 네트워크를 활용할 수 있다.

단점:

- 웹 서버, 데이터베이스, AI 서버가 분리되어 네트워크 왕복이 늘어난다.
- 개인 서버의 Ollama에 외부 서비스가 접근할 별도 보안 경로가 필요하다.
- 데이터와 운영 지점이 여러 서비스로 분산된다.

### 옵션 2: 개인 서버의 Docker + SQLite + Ollama

장점:

- 웹 앱, 데이터베이스, AI가 같은 서버에 있어 통신 경로가 짧다.
- SQLite와 Ollama 포트를 공용 인터넷에 직접 공개하지 않아도 된다.
- 별도 애플리케이션 서버와 클라우드 데이터베이스 비용이 없다.

단점:

- 서버 한 대가 단일 장애점이다.
- 배포, 모니터링, 백업, 복구를 직접 관리해야 한다.
- SQLite는 단일 웹 컨테이너 구성을 전제로 한다. 웹 컨테이너를 여러 개로 수평 확장하지 않는다.

## 3. 결정

초기 규모와 보유 장비를 고려하여 **옵션 2: 개인 서버 올인원 구성**을 채택한다.

- Next.js는 standalone 모드로 빌드하여 단일 Docker 컨테이너로 실행한다.
- SQLite 파일은 호스트의 `./app_data`를 `/app/data`에 마운트하여 보존한다.
- Ollama는 호스트에서 실행하고 웹 컨테이너가 `host.docker.internal`을 통해 호출한다.
- Next.js 포트는 호스트의 `127.0.0.1:3000`에만 바인딩한다.
- 외부 접속은 Cloudflare Tunnel, Tailscale 또는 로컬 리버스 프록시가 담당한다.
- 애플리케이션 인증은 배포 직후 별도 작업으로 추가한다. 인증 추가 전에는 실제 개인정보를 입력하지 않는다.

Quick Tunnel은 주소와 가용성이 보장되지 않으므로 개발 및 배포 확인에만 사용한다. 기관 테스트의 고정 접속 경로는 Named Tunnel 또는 Tailscale 중 기관 환경에 맞는 방식을 사용한다.

## 4. 배포 파일

저장소 루트의 다음 파일을 사용한다.

- `Dockerfile`: 의존성, 마이그레이션, 빌드, 경량 실행 이미지를 단계별로 정의
- `docker-compose.yml`: 웹 서비스와 일회성 마이그레이션 서비스 정의
- `.dockerignore`: 로컬 DB, 빌드 결과, 환경 파일이 이미지에 포함되는 것을 방지
- `.env`: 실제 Ollama 모델명 설정

`src/db/index.ts`와 `drizzle.config.ts`는 모두 `DATABASE_URL`을 사용한다. Next.js 홈 화면은 `connection()` 이후 DB를 조회하므로 Docker 빌드 중 운영 DB가 필요하지 않다.

## 5. 사전 준비

### Ollama

정확한 모델 태그를 확인한다.

```bash
ollama list
```

저장소 루트에 `.env`를 만들고 실제 모델 태그를 입력한다.

```dotenv
OLLAMA_MODEL=gemma3:27b
```

Linux 호스트의 Ollama가 컨테이너 요청을 받을 수 있도록 서비스 환경에 다음 값을 설정하고 Ollama를 재시작한다.

```bash
OLLAMA_HOST=0.0.0.0:11434
```

이 설정은 Ollama가 모든 호스트 인터페이스에서 수신하게 하므로, 서버 방화벽에서 `11434/tcp` 외부 인바운드를 차단해야 한다. 공용 공유기에서도 11434 포트 포워딩을 설정하지 않는다.

## 6. 최초 배포

Compose V2 명령인 `docker compose`를 사용한다.

```bash
mkdir -p app_data backups

# 최초 1회 및 DB 스키마가 변경될 때 실행
docker compose run --rm migrate

# 웹 서비스 시작
docker compose up -d app
```

마이그레이션 서비스는 Drizzle CLI가 포함된 전용 `migrator` 타깃을 사용한다. 운영용 `runner` 이미지에는 개발 도구를 포함하지 않는다.

상태 확인:

```bash
docker compose ps
docker compose logs --tail=100 app
curl --fail http://127.0.0.1:3000/api/test
```

배포 갱신:

```bash
git pull
docker compose build app migrate
docker compose run --rm migrate
docker compose up -d app
```

마이그레이션과 웹 재시작 사이에는 짧은 점검 시간을 잡는다. 호환되지 않는 스키마 변경은 별도의 데이터 변환 절차를 작성한 뒤 적용한다.

`main` push 기반 자동 배포는 [GitHub Actions CI/CD 운영 가이드](./ci-cd.md)를 따른다.

## 7. 백업과 복구

실행 중인 SQLite 파일을 `cp`로 복사하지 않는다. 저장소의 스크립트는 SQLite online backup 명령으로 일관된 백업을 만든다.

```bash
./scripts/backup-sqlite.sh
```

호스트에 `sqlite3` CLI가 필요하다. cron에서는 저장소의 절대 경로를 사용한다.

```cron
0 3 * * * cd /absolute/path/to/care-for-all && ./scripts/backup-sqlite.sh >> ./backups/backup.log 2>&1
```

백업은 서버와 다른 저장장치에도 복제하고, 주기적으로 복구를 시험한다.

복구 절차:

```bash
docker compose stop app
cp backups/sqlite-YYYYMMDD-HHMMSS.db app_data/sqlite.db
docker compose up -d app
```

복구 전에 현재 DB를 별도 이름으로 보관한다.

## 8. 운영 점검

- `app_data`와 `.env`는 Git에 커밋하지 않는다.
- 디스크 여유 공간과 백업 성공 여부를 정기적으로 확인한다.
- 웹 컨테이너와 Ollama 로그에 민감한 원문이 불필요하게 남지 않는지 확인한다.
- 서버 OS와 Docker 보안 업데이트를 적용한다.
- 장애 후에는 DB 무결성과 최근 백업의 복구 가능 여부를 확인한다.
