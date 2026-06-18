# 개발 컨벤션

이 문서는 코딩 에이전트와 개발자가 일관된 코드를 작성하기 위한 절대적인 기준이다. 모든 세부 규칙은 아래 명시된 3가지 '절대 철학'에서 파생되며, 어떠한 경우에도 이 원칙을 우회할 수 없다.

## 절대 철학 (Core Philosophy)

1. 단일 진실 공급원 (Single Source of Truth, SSOT)
   데이터 모델, 타입, 상태는 단 한 곳에서만 선언되어야 하며, 시스템 전체가 그 하나의 근원을 자동으로 추론(Inference)하여 사용해야 한다. 중복된 타입 선언이나 강제 동기화 코드는 허용하지 않는다.

2. 엄격한 책임 분리 (Separation of Concerns)
   파일과 컴포넌트, 훅(Hook)은 단 하나의 명확한 책임을 가져야 한다. 데이터 통신 로직, 순수 UI 상태 관리, 사이드 이펙트 처리는 하나의 함수나 파일에 무분별하게 섞일 수 없다.

3. 선언적 설계 (Declarative Design)
   상태와 UI는 시간에 따른 변화를 직접 명령(Mutate)하는 방식이 아니라, 주어진 조건에 따라 도출(Derived)되어야 한다. 예측을 어렵게 만드는 불필요한 상태 변수 생성을 최소화한다.

---

## 철학 기반 세부 규칙 (Domain Rules)

### 1. 타입 및 데이터 파이프라인 (SSOT 원칙 파생)

[금지된 패턴]
- Next.js의 HTTP API 라우트(/api/...)를 파고 fetch()로 데이터를 가져오는 레거시 방식 (단, Native Response Stream이 필수인 AI 스트리밍 등은 예외).
- drizzle-zod를 사용하거나 Promise<T>를 명시적으로 캐스팅하여 프론트엔드 단에서 타입을 중복 선언하는 행위.

[표준 규칙]
- Drizzle Schema: 모든 데이터 모델과 타입의 유일한 근원.
- Server Action (actions.ts): DB에서 조회 및 가공한 데이터를 반환. TypeScript가 Drizzle 스키마를 기반으로 반환 타입을 100% 자동 추론해야 한다.
- React Query (use[Feature]Queries.ts): queryFn에서 Server Action을 직접 호출한다. 응답 데이터 타입은 Server Action의 반환값에서 자연스럽게 추론되므로 UI 측에서 별도의 타입을 선언하지 않는다.
  - *철학적 배경*: 컴포넌트 내부에서 useQuery를 직접 호출하지 않고 커스텀 훅으로 분리하여 Query Key와 데이터 페칭 세부 로직을 은닉한다. 참조: [Practical React Query - Create custom hooks](https://tkdodo.eu/blog/practical-react-query#create-custom-hooks)

### 2. 폼 상태 관리 (책임 분리 원칙 파생)

[금지된 패턴]
- 무늬만 리팩토링(God Hook): 폼의 내부 상태(useState), API 호출, 부수 효과(Toast 등)를 하나의 거대한 커스텀 훅으로 몰아넣고 밖으로 빼내는 행위.
- 동적 폼(추가/삭제되는 배열 폼 등)을 관리하기 위해 useState를 이용해 요소를 수동으로 조작하는 행위.

[표준 규칙]
- 사용자 입력을 받는 동적 폼은 반드시 다음 3가지 스택을 엄격하게 조합하여 작성한다.
  1. react-hook-form: 폼 상태 및 생명주기 관리. 배열 조작은 반드시 useFieldArray를 사용.
  2. zod: 클라이언트 사이드 런타임 유효성 검사 및 폼 타입 추론(z.infer).
  3. @hookform/resolvers/zod: Zod와 react-hook-form을 결합.

### 3. 컴포넌트 설계 (책임 분리 원칙 파생)

[금지된 패턴]
- 전역적으로 여러 도메인에서 재사용되지 않는 특정 도메인 전용 컴포넌트나 훅을 단순히 종류가 같다는 이유만으로 최상위 `/components`나 `/hooks` 폴더로 분리하여 찢어놓는 행위.

[표준 규칙]
- Co-location: 코드는 사용되는 곳과 가장 가까운 곳에 위치해야 한다. 특정 기능에만 종속된 하위 컴포넌트나 데이터 훅은 전역 폴더로 빼지 않고, 진입점 컴포넌트가 있는 전용 폴더 내부에 함께 모아 응집도를 높인다.
- Orchestration (조율): 진입점 컴포넌트([Component].tsx)는 UI 구성요소의 배치와 피드백(Toast)을 조율하는 역할만 수행한다. 실제 데이터 통신이나 무거운 로직은 하위 훅으로 위임하여 책임을 나눈다.

### 4. 부수 효과 및 상태 처리 (선언적 설계 원칙 파생)

[표준 규칙]
- 데이터 페칭 훅 내부에서는 try/catch로 에러를 삼키거나 Toast를 직접 띄우지 않는다. 에러를 throw하여 진입점 컴포넌트가 UI 피드백을 통제하도록 한다.
- 여러 비동기 상태(Error, Pending, Data)가 혼재할 경우, useEffect로 새로운 상태를 동기화하지 않고 렌더링 시점에 삼항 연산자 등을 이용해 가장 우선순위가 높은 상태를 도출(Derived State)해낸다.
- useEffect는 브라우저 외부 API 연동 등에만 극히 제한적으로 사용한다. 데이터 페칭은 React Query에, 폼 제출은 react-hook-form에 온전히 위임한다.

### 5. UI 컴포넌트 및 스타일링 (SSOT 원칙 파생)

[표준 규칙]
- 시맨틱 디자인 (테마 SSOT): CSS 클래스 작성 시 색상을 하드코딩(예: text-red-500)하지 않는다. 색상과 테마의 유일한 근원은 src/app/globals.css이며, 반드시 디자인 토큰(text-destructive, bg-primary 등)을 사용하여 다크모드 등 전역 테마 변경 시 한 곳에서 통제되도록 한다.
- 접근성 및 반응형: 개발 시 모바일 화면을 우선하며, 주요 조작 요소는 충분한 터치 영역을 확보한다.
- 복합 UI: 모달과 토스트처럼 접근성과 상태 관리가 복잡한 UI는 직접 구현하지 않고 shadcn-ui 컴포넌트를 우선 사용한다.

### 6. 기타 일반 규칙

- 수동 최적화 금지: React Compiler의 철학에 맞춰 useMemo, useCallback, memo를 이용한 수동 성능 최적화를 지양한다.
- 날짜 연산: 반드시 src/lib/dateUtils.ts의 KST 기준 유틸리티 함수를 사용한다.
- 환경변수: src/env.ts를 통해 Zod로 검증된 객체로만 접근한다.
