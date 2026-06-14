# 케어포올

케어포올은 요양보호 현장의 관찰 메모를 일일·주간 요양보호기록으로 정리하는 웹 애플리케이션입니다.

## 개발

```bash
pnpm install
pnpm dev
```

개발 서버는 기본적으로 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 기술 구성

- Next.js 16 App Router
- Drizzle ORM
- SQLite
- Ollama
- Docker Compose
- GitHub Actions self-hosted runner

## 배포

- [배포 아키텍처](./docs/deployment-architecture.md)
- [GitHub Actions CI/CD 운영 가이드](./docs/ci-cd.md)

운영 서비스 식별자는 `care-for-all`, 화면 표시명은 `케어포올`을 사용합니다.

## 브랜드 자산

현재 `public/brand/care-for-all-logo-placeholder.png`는 새 로고가 확정되기 전까지 사용하는 임시 자산입니다. 새 로고 적용 시 같은 경로의 파일과 `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`를 함께 교체합니다.
