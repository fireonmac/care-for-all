# 시티케어 요양보호기록 작성기 - 배포 아키텍처 결정 문서 (ADR)

이 문서는 로컬 개발 환경(Next.js + SQLite + Ollama)을 실제 서비스로 배포하기 위해 고려했던 아키텍처 옵션들을 비교 분석하고, 최종적으로 채택된 배포 전략과 그 근거를 기록한 문서입니다.

---

## 1. 현재 상황 및 주요 제약사항 (Constraints)
*   **사용 기술**: Next.js 15 (App Router), Drizzle ORM, SQLite.
*   **AI 모델**: Ollama를 이용해 로컬 환경에서 오픈소스 대형 언어 모델(Gemma 등) 구동.
*   **초기 사용자**: 3~4명의 소규모 사용자. 수익 발생 전까지 도메인 구매 등 **추가 금전적 지출을 지양**함.
*   **고정 자산**: 무거운 AI 모델을 돌리기 위해 **개인 소유의 GPU 서버를 24시간 가동**해야 함.

---

## 2. 배포 아키텍처 비교 및 트레이드오프

### 옵션 1: Vercel (서버리스) + Turso (클라우드 DB) + 개인 서버 (AI 연동)
전통적인 모던 웹 배포 방식(Serverless)을 채택하되, AI 모델만 개인 서버에 남겨두는 하이브리드 방식입니다.

*   **구조**:
    *   **프론트/백엔드**: Vercel에 배포 (코드 푸시 시 자동 배포).
    *   **데이터베이스**: Vercel의 서버리스 환경에서는 로컬 `sqlite.db` 파일이 매번 초기화되므로, 서버리스 호환 분산형 SQLite 서비스인 **Turso** 사용.
    *   **AI**: Vercel 백엔드 함수가 인터넷망을 타고 개인 서버의 Ollama API를 호출.
*   **장점 (Pros)**:
    *   Vercel을 통한 완벽한 CI/CD(자동 배포) 및 글로벌 CDN 캐싱 혜택.
*   **단점 (Cons & Trade-offs)**:
    *   **치명적 보안 위험**: Vercel에서 접근할 수 있도록 개인 서버의 Ollama 포트를 **외부 공용 인터넷망에 개방**해야 합니다.
    *   **성능 저하 (레이턴시)**: Next.js 서버(해외) ↔ Turso DB(클라우드) ↔ 개인 AI 서버를 오가는 삼각 네트워크 통신 지연이 발생합니다.
    *   데이터가 분산 관리되어 어르신들의 민감한 기록이 외부 클라우드 망을 타게 됩니다.

### 옵션 2: 개인 서버 올인원 (Docker + Local SQLite) 🔥 [최종 선택]
AI 모델 구동을 위해 어차피 켜두어야 하는 개인 서버 1대에 웹 앱과 DB를 전부 몰아넣어(All-in-one) 도커(Docker)로 돌리는 방식입니다.

*   **구조**:
    *   **프론트/백엔드**: 개인 서버 내 `Next.js 컨테이너` (Standalone 모드로 초경량화).
    *   **데이터베이스**: 개인 서버 내 디스크에 저장된 `sqlite.db` 파일을 Docker Volume으로 마운트하여 영구 보존.
    *   **AI**: 같은 개인 서버 내에서 구동되는 Ollama. (컨테이너 내부망으로 통신)
*   **장점 (Pros)**:
    *   **비용 제로**: 외부 클라우드 DB(Turso)나 Vercel 제한에 신경 쓸 필요가 없습니다. 추가 비용 0원.
    *   **압도적 속도**: 앱, DB, AI가 한 물리적 컴퓨터 안에서 통신(localhost)하므로 네트워크 지연율이 0ms에 가깝습니다.
    *   **최고의 보안**: 외부망에 AI 서버나 DB를 노출할 필요가 노출할 필요가 없습니다. 사용자에게는 웹 포트(80/443)만 열어주면 됩니다.
*   **단점 (Cons & Trade-offs)**:
    *   개발자가 직접 Docker 세팅 및 HTTPS 환경 구축(리버스 프록시)을 관리해야 합니다. Vercel처럼 '원클릭 배포'가 되지는 않습니다.

---

## 3. 최종 선택 및 운영 계획

### 🎯 결정: "옵션 2 (개인 서버 도커 올인원)"
**이유**: 고정 자산(개인 GPU 서버)이 이미 확보된 상태에서, 보안을 취약하게 만들고 통신 속도를 늦추면서까지 Vercel과 Turso를 쪼개서 쓸 이유가 전혀 없습니다. 어차피 서버를 켜두는 김에 남는 램 자원(약 100~200MB)을 할당하여 Next.js와 로컬 SQLite를 함께 굴리는 것이 기술적으로 가장 우수하고 경제적입니다.

### 💸 예산 최적화 (초기 3~4인 유저 대상 무자본 배포 방법)
유료 도메인을 구매하기 전까지 추가 비용을 내지 않고 운영하기 위한 솔루션입니다:

1. **Cloudflare Tunnel (추천)**: 서버 포트 포워딩이나 SSL 인증서 발급 등 복잡한 Nginx 설정 없이 무료로 안전하게 외부에서 접속할 수 있도록 터널을 뚫어줍니다. 테스트용 무료 URL(`*.trycloudflare.com`)도 제공합니다.
2. **DuckDNS**: 평생 무료 서브도메인(`*.duckdns.org`)을 발급받아 내 서버 IP와 연결합니다.
3. **Tailscale**: 해당 3~4명이 내부 관계자라면 무료 VPN인 Tailscale 망으로 묶어서 가장 안전하게 비공개 접속 환경을 구축할 수 있습니다.
4. **직접 IP 접속**: 가장 단순하게 서버의 `IP주소:3000`을 공유합니다.

---

## 4. 구현 가이드 (Docker Compose)

Next.js의 도커 용량을 최소화하기 위해 `next.config.ts` 파일에 `output: "standalone"` 옵션이 적용되어 있습니다.

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 빌드 시 DB 파일 경로 환경 변수 설정
ENV DATABASE_URL="file:/app/data/sqlite.db"
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV DATABASE_URL="file:/app/data/sqlite.db"

# standalone 빌드 결과물 복사
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./app_data:/app/data  # SQLite 파일 영구 보존용 호스트 볼륨 매핑
    environment:
      - DATABASE_URL=file:/app/data/sqlite.db
      - OLLAMA_URL=http://host.docker.internal:11434 # 호스트의 Ollama 연동
    restart: always
```
