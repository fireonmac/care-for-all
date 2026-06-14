# GitHub Actions CI/CD 운영 가이드

## 1. 배포 구조

`main` 브랜치에 push하면 다음 순서로 실행된다.

1. GitHub 호스팅 Linux runner에서 의존성 설치
2. TypeScript 검사
3. Next.js production build
4. 검증 성공 시 Mac Studio의 self-hosted runner에서 배포 시작
5. 검증된 소스를 운영 디렉터리로 동기화
6. Docker 이미지 빌드
7. 현재 SQLite DB 온라인 백업
8. Drizzle 스키마 적용
9. `citycare` 컨테이너 교체
10. `/api/test` 헬스체크

운영 디렉터리의 `.env`, `app_data`, `backups`는 소스 동기화에서 제외되므로 push로 덮어쓰거나 삭제하지 않는다.

## 2. 사전 조건

Mac Studio에서 다음 항목이 준비되어 있어야 한다.

- Docker Desktop이 실행 중이며 로그인 시 자동 시작
- `docker compose`, `sqlite3`, `rsync` 명령 사용 가능
- Mac이 자동으로 잠들지 않도록 전원 설정
- self-hosted runner 전용 또는 신뢰할 수 있는 private GitHub 저장소

public 저장소나 신뢰할 수 없는 외부 기여자의 워크플로에 production runner를 제공하지 않는다.

## 3. 운영 디렉터리 준비

예시:

```bash
mkdir -p /Users/your-name/services/citycare-log-maker
cd /Users/your-name/services/citycare-log-maker

mkdir -p app_data backups
cp /path/to/source/.env.example .env
```

`.env`에 실제 Ollama 모델명을 설정한다.

```dotenv
OLLAMA_MODEL=gemma4:26b
```

운영 디렉터리는 배포 전용으로 사용한다. 수동으로 수정한 소스 파일은 다음 배포에서 GitHub의 `main` 내용으로 교체된다.

## 4. Self-hosted runner 설치

GitHub 저장소에서 다음 메뉴로 이동한다.

`Settings` → `Actions` → `Runners` → `New self-hosted runner`

1. 운영체제는 `macOS`를 선택한다.
2. 아키텍처는 `ARM64`를 선택한다.
3. GitHub 화면에 표시된 다운로드 및 `config.sh` 명령을 Mac Studio에서 실행한다.
4. runner 설정 시 추가 label로 `citycare-prod`를 입력한다.
5. runner를 서비스로 설치하고 시작한다.

```bash
./svc.sh install
./svc.sh start
./svc.sh status
```

runner를 실행하는 macOS 계정에서 Docker 명령이 정상 동작해야 한다.

```bash
docker compose version
docker ps
```

## 5. GitHub 설정

저장소에서 다음 메뉴로 이동한다.

`Settings` → `Secrets and variables` → `Actions` → `Variables`

Repository variable을 추가한다.

| 이름 | 값 |
| --- | --- |
| `DEPLOY_PATH` | Mac Studio의 운영 디렉터리 절대 경로 |

예:

```text
/Users/your-name/services/citycare-log-maker
```

추가로 `Settings` → `Environments`에서 `production` 환경을 생성한다. 초기에는 승인 없이 자동 배포하고, 운영 안정화 후 필요한 경우 required reviewer를 설정한다.

## 6. 최초 배포

워크플로를 사용하기 전에 운영 디렉터리의 `.env`가 준비되어 있어야 한다.

변경사항을 `main`에 push하면 `.github/workflows/ci-deploy.yml`이 자동 실행된다.

GitHub 저장소의 `Actions` 탭에서 `CI and Deploy` 실행 상태를 확인한다. 성공 후 Mac Studio에서 다음 명령으로 확인한다.

```bash
cd /Users/your-name/services/citycare-log-maker
docker compose ps
docker compose logs --tail=100 citycare
cat .deploy-version
```

## 7. 수동 재배포

GitHub의 `Actions` → `CI and Deploy` → `Run workflow`를 선택하면 현재 `main`을 다시 배포할 수 있다.

Mac Studio에서 직접 배포 스크립트를 실행할 수도 있다.

```bash
./scripts/deploy.sh \
  /absolute/path/to/verified/source \
  /absolute/path/to/production \
  manual
```

일반 운영에서는 GitHub Actions를 사용하고, 수동 실행은 장애 대응에만 사용한다.

## 8. 실패 처리

### Verify 실패

TypeScript 검사 또는 production build가 실패하면 Mac Studio 배포는 실행되지 않는다. 기존 서비스는 그대로 유지된다.

### Docker build 실패

기존 컨테이너를 교체하기 전에 중단되므로 현재 서비스는 계속 실행된다.

### Migration 실패

배포가 중단되고 기존 컨테이너는 계속 실행된다. 마이그레이션 직전에 생성된 `backups` 파일을 확인한다.

### Health check 실패

워크플로는 실패로 종료되고 최근 200줄의 컨테이너 로그를 출력한다. 이 단계에서는 새 컨테이너가 실행 중일 수 있으므로 즉시 로그를 확인하고 이전 커밋을 다시 배포하거나 DB를 복구한다.

## 9. 운영상 한계

이 구성은 자동 배포이지만 완전한 무중단 배포는 아니다. 컨테이너 교체 시 짧은 연결 중단이 발생할 수 있다.

SQLite 단일 파일을 사용하므로 여러 웹 컨테이너를 동시에 실행하는 blue-green 배포는 적용하지 않는다. 3~10명 규모에서는 짧은 배포 중단을 감수하고 단일 컨테이너와 확실한 백업을 유지하는 편이 단순하고 안전하다.
