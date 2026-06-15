# Repository Guide

이 파일은 코딩 에이전트가 저장소에서 작업할 때 따라야 할 최소 규칙만 담는다.
제품 요구사항이나 운영 절차를 이 파일에 복제하지 않는다.

## Start Here

1. [README.md](./README.md)에서 실행 방법과 저장소 진입점을 확인한다.
2. [docs/README.md](./docs/README.md)에서 작업 주제의 기준 문서를 찾는다.
3. 문서와 구현이 다르면 구현을 추측해 문서화하지 말고, 코드와 설정을 확인한 뒤
   의도된 동작을 기준으로 둘을 함께 수정한다.

## Source Of Truth

| 주제 | SSOT |
| --- | --- |
| 제품 목표, 기록 원칙, MVP 범위 | `docs/product.md` |
| 기술 스택, 현재 시스템 구조와 코드 경계 | `docs/architecture.md` |
| 코드 작성 규칙과 개발 컨벤션 | `docs/conventions.md` |
| 로컬 실행, 배포, 백업, 복구 | `docs/operations.md` |
| 미구현 항목과 우선순위 | `docs/roadmap.md` |
| 패키지 버전과 명령 | `package.json` |
| 환경변수 목록과 로컬 기본 예시 | `.env.example` |
| 데이터 모델 | `src/db/schema.ts` |
| 배포 자동화 | `.github/workflows/ci-deploy.yml`, `scripts/deploy.sh` |

새 문서를 만들기 전에 위 문서 중 하나에 들어갈 수 없는지 먼저 확인한다.
같은 사실을 여러 문서에 복사하지 말고 링크로 연결한다.

## Working Rules

- 사용자에게 보이는 기록 문구와 AI 생성 규칙은 `docs/product.md`를 따른다.
- 현재 구현을 설명할 때는 계획이 아니라 실제 코드와 설정을 근거로 한다.
- 완료되지 않은 기능은 현재 기능처럼 쓰지 않고 `docs/roadmap.md`에 둔다.
- 기능, 스키마, 환경변수, 운영 절차가 바뀌면 같은 변경에서 해당 SSOT도 갱신한다.
- 실제 개인정보, `.env`, SQLite DB, 백업 파일을 커밋하지 않는다.

## Next.js Rule

이 저장소의 Next.js 버전은 학습 데이터의 관례와 다를 수 있다. Next.js API,
파일 규칙, 설정을 변경하기 전에 `node_modules/next/dist/docs/`의 관련 문서를
읽고 deprecation 안내를 따른다. 설치 버전은 `package.json`이 기준이다.
