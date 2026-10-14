# 《가짜 마왕의 일생》 및 확장형 존재 시뮬레이터
## 개발 명세서 v1.0 — 2026-10-14

> 목적: 코덱스가 해석상 임의 변경 없이 구현할 수 있도록 게임 엔진, 콘텐츠 데이터, 결과 판정, 상태 관리, 엔딩, 검증·테스트·배포의 계약을 정한다.
> 상태: **엔진 규격 확정안 / 마왕 콘텐츠 전체 분기 미작성**. 기존 대화에서 즉흥적으로 등장한 설정은 전부 자동 확정하지 않는다. 작가가 `CANON.md`에 채택·정정한 사실만 정식 설정이다.

## 0. 30초 요약

- 플레이어는 출생·성장·사건을 짧은 연대기로 읽고 결정적인 순간에 행동을 고른다.
- 선택지는 **시도**이며 **성공 보장 명령이 아니다**. 시스템은 사전 작성한 조건과 확률, 과거의 선택으로 결과를 정한다.
- 황당한 선택(고백·청혼·밀고·사기 등)은 허용하되 세계가 진지하게 반응한다. 유리한 결과를 억지로 만들지 않는다.
- 선악은 버튼의 색이 아니라 누적된 행위·목격자·평판·관계로 결정된다. 선행 보상/악행 처벌을 강제하지 않는다.
- 모든 실제 플레이 가능 경로는 완결된 엔딩으로 이어져야 한다. 배드엔딩·허무엔딩·블랙코미디 엔딩을 정상 콘텐츠로 다룬다.
- 정적 웹앱(Vite + TypeScript, 반응형 HTML/CSS)으로 빌드하여 GitHub Pages에 배포한다. 로그인·서버·AI 호출 없이 작동한다.
- 완전 자유 입력은 v1에서 제외한다. 사전 작성된 선택지 외의 자유 행동은 나중에 별도 시스템으로 추가한다.

## 1. 플레이 경험 및 콘텐츠 원칙

### 1.1 핵심 루프
1. `2~6개의 짧은 연대기 항목`을 노출한다. 해당 장면과 선택 결과에 필요한 정보가 있어야 한다.
2. `현재 사건`을 2~5문장 이내로 설명한다.
3. 3~6개의 선택지를 제공한다. 일반적 선택 + 탐욕/회피/배신 + 상황 파괴형 황당한 선택을 적절히 혼합한다. 모든 장면에 억지 개그를 넣지 않는다.
4. 선택 후 현재 상태와 조건, 필요한 경우 시드 기반 난수를 사용해 결과를 **원자적으로** 확정한다.
5. 결과 장면과 시간 경과를 표시하고 상태/연대기/자동저장을 업데이트한다.
6. 지속 불가능한 상태가 되거나 결말 노드에 도달하면 엔딩 회고 및 다시 시작 화면으로 이동한다.

### 1.2 이야기 문체
- 블랙코미디. 직업·국가·연애·법·돈이 맞물리는 부조리에서 웃음이 발생한다.
- 인물은 성격과 기억을 가진다. 유머를 위해 지능이나 성격을 매번 바꾸지 않는다.
- 이익이 큰 선택에는 위험이나 비용이 있다. **모든 선택이 고통스러울 필요는 없다**.
- 주인공이 선하거나 악하다는 이유만으로 운이 바뀌지 않는다. 목표를 달성한 악당 엔딩도 허용한다.
- 소소한 선택이 수십 년 후 되돌아올 수 있다. 회고는 이전 장면을 새로운 관점에서 읽히게 한다.
- 주인공의 사망은 자동 부활하지 않는다. 조기 배드엔딩도 엔딩 도감에 기록한다.

### 1.3 서사 완결성
- 1회 권장: 10~20분, 의미 있는 선택 12~20회(제작 목표, 고정 강제 아님).
- v1 첫 완성 목표: 최소 10개 이상의 개별 엔딩, 60개 이상의 저작 장면, 결함 없는 종단 경로. 확장 목표 25~40개 엔딩.
- 플레이 불가능한 옵션을 장식용으로 노출하지 않는다. 준비물이 필요한 행위는 아이템이 없을 경우 차단하거나, **준비를 시도하는 다른 행동**으로 재서술한다.
- 선택 결과를 설명 없이 바꾸지 않는다. 변장, 거짓 소문, 환각 등은 데이터에 근거해야 한다.

## 2. 기술 및 배포

| 영역 | 선택 | 구체 기준 |
|---|---|---|
| 런타임 | 브라우저/TypeScript | Node 서버 불필요, 클라이언트 단일 페이지 앱 |
| 빌드 | Vite | 잠금파일(`package-lock.json`) 커밋, `npm ci`/`npm run build` |
| 콘텐츠 | JSON | 스토리·인물·엔딩을 코드와 분리 |
| 런타임 구조 검증 | JSON Schema + TypeScript 추가 검사 | Ajv 또는 동등한 검증기 |
| 단위/통합 테스트 | Vitest 또는 동급 | 상태 전이, RNG, 불변식 |
| 브라우저 테스트 | Playwright 또는 동급 | 모바일/PC, 자동저장, 뒤로가기 |
| 저장 | localStorage | 한 회차와 엔딩 도감 별도 네임스페이스; 오류 처리 |
| 배포 | GitHub Actions → GitHub Pages | 테스트와 전체 경로 검증에 성공할 때만 배포 |
| 스타일 | 반응형 CSS | 가로 320px 이상, 키보드/터치 접근성 |

배포 URL 예시 `https://USERNAME.github.io/REPO/`에는 Vite `base: '/REPO/'`가 필요하다. 사용자 도메인 또는 사용자 Pages 루트 사이트면 `base: '/'`를 쓴다. JSON과 이미지 경로를 항상 `import.meta.env.BASE_URL` 기준으로 해결한다. GitHub Pages용 Actions를 사용한다. 티스토리에서는 링크 이동이 기본, iframe 삽입은 실제 정책/CSP에 따라 별도 점검한다.

**의도적으로 제외:** 회원가입, 서버 DB, 유료 AI 호출, 멀티플레이, 가챠, 광고 SDK, PWA 오프라인 캐시(나중에 추가), 외부 API 의존.

## 3. 소스 트리

```text
repo/
  index.html
  package.json
  vite.config.ts
  src/
    app/main.ts
    engine/types.ts
    engine/conditions.ts
    engine/effects.ts
    engine/transition.ts
    engine/random.ts
    engine/invariants.ts
    engine/history.ts
    content/load.ts
    content/validate.ts
    persistence/save.ts
    persistence/migrate.ts
    ui/GameScreen.ts
    ui/HistoryScreen.ts
    ui/PeopleScreen.ts
    ui/EndingScreen.ts
    styles/main.css
  public/stories/demon-king/
    story.json
    characters.json
    chapters/01-birth-and-mina.json
    chapters/02-royal-politics.json
    endings.json
  schemas/
    story.schema.json
  scripts/
    validate-content.ts
    simulate-all-routes.ts
  tests/
    engine/*.test.ts
    story/demon-king.test.ts
    e2e/*.spec.ts
  .github/workflows/deploy.yml
  CONTENT_GUIDE.md
  CANON.md
  CHANGELOG.md
```

## 4. 콘텐츠 파일 규격

모든 파일은 UTF-8, JSON 표준 문법 사용(주석/후행 쉼표 금지). 모든 ID는 스토리 내 영구 고유 문자열. **공개한 ID를 재사용·이름 변경·삭제하지 않는다**. 바꾸려면 이관 표를 제공한다.

### 4.1 story.json — 스토리 매니페스트

```json
{
  "schemaVersion": 1,
  "id": "demon-king",
  "version": "1.0.0",
  "title": "가짜 마왕의 일생",
  "entryNodeId": "dk20_confrontation",
  "chapters": ["chapters/01-birth-and-mina.json"],
  "charactersFile": "characters.json",
  "endingsFile": "endings.json",
  "initialState": {
    "age": 20,
    "player": {
      "species": "human",
      "combat": 2,
      "magic": 0,
      "gold": 0,
      "alive": true,
      "legalStatus": "registered_demon_king",
      "crimes": []
    },
    "npcs": {
      "mina": {
        "alive": true,
        "combat": 8402,
        "trust": 50,
        "affection": 0,
        "relationship": "childhood_friend"
      },
      "erisia": {
        "alive": true,
        "combat": 320,
        "trust": 0,
        "affection": 0,
        "relationship": "stranger"
      },
      "king": {
        "alive": true,
        "combat": 10,
        "trust": 0,
        "affection": 0,
        "relationship": "stranger"
      }
    },
    "flags": ["registration_is_believed_accidental"],
    "inventory": {}
  }
}
```

여기서 최초 20세 상태에는 미나 살인미수 전과가 **없다**. 해당 행동을 실제로 선택하고 실패하여 법적 판결이 내려진 경우에만 전과가 생긴다. 과거의 즉흥 플레이를 현재 상태로 옮기는 별도 세이브는 초기 상태가 아니다.

### 4.2 chapters/*.json — 장면 및 선택

```json
{
  "schemaVersion": 1,
  "nodes": [
    {
      "id": "dk20_confrontation",
      "kind": "scene",
      "age": 20,
      "title": "첫 용사 시험",
      "chronicle": [
        { "age": 0, "text": "인간으로 태어났지만 마왕으로 등록되었다." },
        { "age": 12, "text": "친구 미나를 만났다. 그녀의 꿈은 용사였다." }
      ],
      "body": "미나가 검을 뽑았다. 용사 자격을 얻으려면 등록 마왕을 쓰러뜨려야 한다.",
      "choices": [
        {
          "id": "attack_mina",
          "text": "미나를 공격하고 능력을 빼앗으려 한다.",
          "outcomes": [
            {
              "id": "disarmed",
              "when": { "op": "lt", "path": "player.combat", "value": 8402 },
              "weight": 1,
              "result": "failure",
              "to": { "kind": "node", "id": "dk20_disarmed" },
              "effects": [
                { "op": "addToSet", "path": "flags", "value": "attempted_attack_on_mina" },
                { "op": "set", "path": "npcs.mina.trust", "value": -90 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**규칙:** 장면 `age`는 고정된 절대 나이. 화면에 표시하는 연대기 항목의 `age`는 그 장면의 `age`보다 클 수 없다. 동일 나이의 여러 장면은 가능. `choices`는 최소 1개, 각 선택에는 결과 `outcomes`가 최소 1개 있어야 한다. `body`는 순수 텍스트로, HTML·JS를 삽입하지 않는다.

콘텐츠 작성 편의를 위해 장면에 `when`(접근 조건)을 허용할 수 있으나, **조건 미충족이면 장면이 막히는** 구조로 만들지 말고 반드시 분기별 도착 노드를 마련한다. `chronicle`의 개별 항목은 선택적으로 `when` 및 `presence` 메타데이터를 가질 수 있다.

### 4.3 조건 DSL — 임의 코드 실행 금지

합법 조건 구조:

```json
{ "op": "gte", "path": "player.gold", "value": 200 }
{ "op": "eq", "path": "npcs.mina.alive", "value": true }
{ "op": "contains", "path": "flags", "value": "mina_saw_attack" }
{ "all": [ { "op": "eq", "path": "player.magic", "value": 0 }, { "not": { "op": "contains", "path": "flags", "value": "awakened" } } ] }
{ "any": [ { "op": "gte", "path": "player.gold", "value": 1000 }, { "op": "contains", "path": "flags", "value": "has_patron" } ] }
```

허용 `op`: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`. `all`, `any`, `not` 재귀 합성 가능. 허용 접근 경로는 `player`/`npcs`/`flags`/`inventory` 중 등록된 필드와 인물 ID만. 동적 `eval`, JS 표현식, 임의 경로, 날짜 함수 금지. `contains`는 배열형 경로만 허용한다.

### 4.4 선택 규격
- `choice.id`: 장면 내 유일, 공개 후 변경 금지.
- `choice.text`: 사용자가 선택하는 실제 행동. 결과가 보장된 듯한 서술 금지(예: '미나를 죽인다' 대신 '미나를 죽이려고 공격한다').
- `choice.description?`: 선택 전 알려줄 위험·대가·소지 조건. 숨겨진 정보나 정확한 성공률을 노출할 필요 없음.
- `choice.enabledWhen?`: 물리적/법적 입력 가능성 조건. 미충족 시 비활성화 이유를 제공하거나 메뉴에서 제외.
- `choice.outcomes`: 실행을 선택했을 때의 가능한 판정 결과 목록.
- `outcome.when?`: 이 결과가 성립할 사전 조건. 없으면 항상 대상.
- `outcome.weight`: 같은 선택에서 **자격을 충족한** 결과들을 뽑을 상대 가중치. 양의 정수. 자격 결과 1개라면 확정; 2개 이상이면 가중 추첨.
- `outcome.result`: `success`, `failure`, `mixed`, `neutral` 중 하나. 이 라벨은 설명용이지 플레이어 보상 강제 규칙이 아니다.
- `outcome.to`: `{ "kind": "node" | "ending", "id": "..." }`.
- `outcome.effects?`: 적용할 상태 변경 목록.
- 한 선택에서 적용 가능한 outcome이 0개인 상태는 **콘텐츠 오류**다. 임의의 성공 결과로 대체하지 말고 실행을 차단하고 오류 보고.

**판정 예시:** 플레이어 전투력 2, 미나 전투력 8,402. 정면 공격의 성공 outcome은 작성하지 않고, 확정 제압 outcome으로 연결한다. 훗날 복병·함정·공동 전투 등 새 승리 요인이 생긴 경우에 한해 별도 전제조건을 갖춘 outcome을 추가한다. `player.combat >= 8402`가 곧 반드시 이긴다는 뜻은 아니며, 승패는 기술·환경·의도에 따라 서술해야 한다.

### 4.5 효과 DSL

```json
{ "op": "add", "path": "player.gold", "value": 300 }
{ "op": "set", "path": "player.legalStatus", "value": "under_trial" }
{ "op": "set", "path": "npcs.mina.trust", "value": -90 }
{ "op": "addToSet", "path": "player.crimes", "value": "attempted_murder_convicted" }
{ "op": "addToSet", "path": "flags", "value": "mina_rejected_proposal" }
{ "op": "removeFromSet", "path": "flags", "value": "registered_demon_king_active" }
{ "op": "add", "path": "inventory.ring", "value": -1 }
```

허용 `op`: `set`, `add`, `addToSet`, `removeFromSet`. 타입·범위 검사 필수. `player.combat`, `player.magic`, `player.gold`, `npc.combat`, `inventory.*`는 0 이상. `trust`, `affection`은 -100~100. 음수 금화/음수 물품/존재하지 않는 인물 수정 금지. `alive: false`로 사망 처리하면 같은 회차에서 다시 `true`로 되돌리는 것은 금지(정식 부활 이벤트는 v2 확장). **전과는 고발만으로 추가하지 않는다.** `accused`와 `convicted` 플래그/신분은 구분해야 한다.

장면에 도착했을 때 누구의 지위가 변하는 등 세계 이벤트를 구현하려면 `entryEffects?`를 쓸 수 있다. 반드시 **최초 진입 시 한 번만** 실행하고, 방문 기록과 같은 원자적 저장에 포함한다. 단순한 렌더링은 상태를 바꾸지 않는다. `chronicle` 텍스트만으로 상태가 변했다고 간주하지 않는다.

### 4.6 등장인물 파일

```json
{
  "schemaVersion": 1,
  "characters": [
    { "id": "mina", "name": "미나", "role": "hero_candidate", "traits": ["현실적", "전투 능력 우수", "무고한 살인 기피"] },
    { "id": "erisia", "name": "에리시아", "role": "princess", "traits": ["정치적 계산", "권력욕", "경계심"] },
    { "id": "king", "name": "국왕", "role": "ruler", "traits": ["체면 중시", "왕실 통제 우선"] }
  ]
}
```

인물의 태도는 `traits`(성격), `alive`(생존), `trust`(신뢰), `affection`(호감), `relationship`(법적·사회적 관계), 관련 `flags`로 해석한다. 연애 감정이 높다고 결혼이 자동 성립하지 않는다. 법적 혼인에는 별도 사건과 `marriage_registered` 상태가 필요하다.

### 4.7 엔딩 파일

```json
{
  "schemaVersion": 1,
  "endings": [
    {
      "id": "ending_early_execution",
      "kind": "bad",
      "title": "세계정복, 시작도 못 함",
      "body": "두 번째 공격은 마지막 공격이 되었다.",
      "recapRules": [
        { "when": { "op": "contains", "path": "flags", "value": "attempted_attack_on_mina" }, "text": "20세, 당신은 우정보다 힘을 먼저 선택했다." }
      ]
    }
  ]
}
```

`kind`는 `happy`, `normal`, `bad`, `bittersweet`, `hidden`, `absurd` 중 하나. 엔딩 분류는 플레이어의 선악 점수와 1:1 연결하지 않는다. 엔딩 진입 시 해당 run을 **종료 상태**로 변경. 추가 선택지·전투·시간 이동 금지. 엔딩 결과에는 최종 나이, 주요 선택 3~5개, 관계 결과, 남긴 영향, 발견 엔딩 ID가 포함된다.

## 5. 상태와 저장 규격

### 5.1 GameState

```ts
type GameState = {
  saveSchemaVersion: 1;
  storyId: string;
  storyVersion: string;
  runId: string;
  currentNodeId: string | null;
  endingId: string | null;
  ended: boolean;
  age: number;
  player: {
    species: string;
    combat: number;
    magic: number;
    gold: number;
    alive: boolean;
    legalStatus: string;
    crimes: string[];
  };
  npcs: Record<string, {
    alive: boolean;
    combat: number;
    trust: number;
    affection: number;
    relationship: string;
  }>;
  flags: string[];
  inventory: Record<string, number>;
  rng: { seed: number; state: number };
  history: Array<{
    age: number;
    nodeId: string;
    choiceId: string;
    outcomeId: string;
    toKind: "node" | "ending";
    toId: string;
  }>;
  enteredNodeIds: string[];
};
```

`player.crimes`는 **유죄 확정 기록**에만 사용한다. 혐의·수사·기소 등은 `flags` 또는 별도 법적 상태로 추적한다. `history`는 선택·결과의 원장을 기록하되, 표시 텍스트는 스토리 버전에 따라 달라질 수 있어 `storyVersion`을 고정한다. 저장 데이터는 외부 입력이므로 로드시 반드시 검증한다.

### 5.2 저장 방식
- 키: `existence-sim:v1:run:<storyId>` 및 `existence-sim:v1:meta`.
- 선택마다 **전이 완료 후 한 번** 자동저장. 성공적으로 저장되기 전 다음 화면 전환을 완료했다고 표시하지 않는다.
- 저장 실패(용량·브라우저 설정): 오류 안내 + JSON 내보내기 제공. 몰래 저장된 척하지 않는다.
- 엔딩 도감은 회차 저장과 별도 `meta`에 누적. 새 게임 시 현재 회차를 초기화해도 엔딩 도감은 유지한다.
- 저장 파일 내보내기/가져오기 제공; 사이즈 제한과 스키마, `storyId`, `storyVersion` 호환성 검사 필수.
- 저장 로딩 시 구 버전은 명시적 migration만 허용. 없으면 덮어쓰지 말고 읽기 실패 안내/백업 권고.
- 브라우저·기기 간 자동 동기화 없음. 시크릿 모드나 저장소 삭제 시 데이터가 사라질 수 있다.

## 6. 전이 엔진 실행 순서 — 반드시 단일 함수로 구현

`choose(state, nodeId, choiceId) -> {nextState, transitionReceipt}`는 결정적 상태 전이 함수(시드가 같으면 같은 결과)를 목표로 한다.

1. 세이브 스키마, 회차 종료 여부, `currentNodeId`와 제공 `nodeId` 일치 확인. 종료 회차 선택 요청은 거부.
2. 현재 장면과 선택의 유효성을 검사하고 `enabledWhen`을 평가. 미충족이면 **아무 상태 변경 없이** 거부.
3. 선택의 `outcomes`에서 `when`을 만족한 목록을 만든다. 0개면 콘텐츠 오류.
4. 후보가 1개면 그 결과를 사용; 여러 개면 저장된 RNG 상태에서 가중 추첨하고 새 RNG 상태를 기록한다. 새로고침/복원 후 난수가 달라지지 않도록 한다.
5. 현재 상태를 복제해 해당 `effects` 적용, 참조 무결성/타입/범위 검사.
6. 이동 대상이 장면이면 대상의 `age >= 현재 age`를 검사하고 나이를 대상 `age`로 갱신한다. 아직 방문하지 않은 장면이면 `entryEffects`를 한 번 적용한다.
7. 대상이 엔딩이면 현재 나이를 유지하고 `ended=true`, `endingId` 지정. 사망 엔딩은 `player.alive=false`를 명시한다.
8. 모든 불변식을 재검사하고 `history`에 정확한 결과 ID를 1회 기록한다.
9. 상태+영수증을 반환하고 영속 저장. 예외 시 원래 상태를 유지하고 오류 메시지 및 로그 제공(중간 적용 금지).

같은 버튼을 두 번 누르거나 새로고침 시 **중복 보상/중복 선택**이 일어나지 않게 UI에서 클릭 잠금과 전이 식별을 구현한다. 난수는 재현 가능한 고정 PRNG(예: `mulberry32`, uint32)를 사용하고 버전을 고정한다. 난수 호출 횟수를 UI 표시 동작에 연결하지 않는다.

## 7. 분기와 사건 합류

- 분기 그래프는 v1에서 **DAG(방향성 비순환 그래프)** 로 제한한다. 과거 장면으로 되돌아가는 무한 루프 금지.
- 서로 다른 선택이 같은 시대 사건으로 다시 합류할 수 있으나 `flags`, `crimes`, `npcs.*`가 다른 경우 조건부 대사/선택/결과를 제공한다.
- 예: 미나가 사망한 회차에서는 미나의 실제 출현(presence) 장면으로 이동 불가. 회상·문서의 언급은 허용.
- 예: 혼인 성립은 양 당사자의 동의, 법적 조건, 공식 등록 플래그가 있을 때만 처리. 이혼 신청 ≠ 이혼 확정.
- 예: 공주가 반역을 제안했다는 사실만으로 플레이어가 반역 유죄가 되지 않는다. 공모·증거·판결은 별도 상태.
- 예: 장부의 차액 ≠ 횡령 증명. 문서·감사·재판 등의 이벤트를 거쳐 공개 사실(`known`)과 실제 세계의 진실(`truth`)을 분리할 수 있어야 한다.

### 숨은 정보
`flags`는 객관적 세계 상태. 플레이어가 아는 단서는 `knowledge`(추후 확장) 또는 `flags`의 명시적 `known_*`로 구분한다. UI는 불확실성을 사실처럼 알려주지 않는다. 후속 콘텐츠 작성을 위해 `CANON.md`에 `확정 사실`, `인물 주장`, `미확정 의혹`을 분리 기록한다.

## 8. 자동 검증 시스템

### 8.1 정적 구조 검사(빌드 차단)
- JSON Schema 적합성, UTF-8/중복 키(별도 parser/lint), 고유 ID, 모든 파일 로딩 확인.
- 모든 `to`가 존재하는 노드/엔딩을 가리킴. 한 스토리 내 중복 ID 없음.
- 한 장면에는 최소 1개 활성화 가능한 선택 경로 및 모든 선택에 최소 1개 결과가 있어야 함.
- 필드 경로가 화이트리스트 안에 있고 `when`/`effects` 타입·값 범위가 적합함.
- 모든 참조 인물·아이템 ID는 등록되어 있어야 함(아이템은 설정된 카탈로그 권장).
- DAG 순환 금지, 도달 불가능 노드 경고/의도적 비밀 컨텐츠 태그 확인.
- 시간 역행 금지(이동 대상 나이 ≥ 원본), 엔딩 이후 이동 금지.
- 장면 0개/결말 0개, 빈 문구, 누락된 설명, 과도한 분기(설정 임계치 초과) 보고.

### 8.2 상태 기반 전체 경로 검사(배포 차단)
- 초기 상태에서 모든 `choice/outcome` 가능 조합을 탐색한다. 확률은 모든 양수 가중치 결과를 가능한 경우로 간주한다.
- 모든 *실제로 도달 가능한 상태*에서 선택 후 적용 가능한 결과가 0개인 경우가 없는지 확인한다.
- 금화/물품 음수, 관계 범위 초과, 사망 인물의 현장 등장, 사망 후 플레이 지속, 판결 없는 전과 확정, 이혼 전후 모순을 검사한다.
- 끝에 도달해 선택도 엔딩도 없는 소프트락이 없는지 확인한다.
- 모든 도달 가능 경로가 유한 단계 후 엔딩에 도달하는지 검사한다. DAG라면 종료성과 순환 검사를 이용할 수 있다.
- 상태 조합 폭발에 대비해 `age+node+중요 상태 해시`로 중복 제거. 탐색 상한에 도달하면 **검증 불완전으로 실패**하고 완료 판정을 하지 않는다.
- RNG 추출 결과가 다른 회차에 영향을 주지 않는지 seed 재현 테스트.

### 8.3 자동화로 완전히 잡을 수 없는 오류
- 텍스트 속 미묘한 인과관계나 농담의 재미를 기계가 완벽히 검증할 수는 없다.
- 대사·연대기에 `presence`(현장 등장 인물), `reference`(언급만), `flashback`(회상)를 구분하는 메타데이터를 지원해 검사 가능성을 높인다.
- 설정 편집 시 **작가 검수 항목**: 인물 나이·동기·관계·법률·예산/금액·시간 흐름·결혼/이혼·생사·전투력. 무작위 자동 생성으로 빈 이야기를 채우지 않는다.

## 9. 테스트 고정 사례(회귀 테스트)

다음은 실사용 대화에서 발견된 문제를 회귀 테스트로 고정한다.

1. `combat=2 vs mina.combat=8402` 직접 공격 → 아무 전제 없는 승리 불가. 살해 시도/미나의 경계 상승.
2. 공격 직후 고백 → 고백 시도는 가능하지만 생존/연애/용서를 보장하지 않음. 사과 또는 재판 등 실질 결과로 분기.
3. `gold=0` → 대금 100만 금화를 **즉시 지급한 상태로 만들 수 없음**. 허풍·차용 요청·계약 제안은 가능.
4. 왕실에서 공주와 혼인 → `왕위 계승권` 자동 획득 금지. 법률·계승 규칙으로 별도 판정.
5. 공주가 미나에게 반역 제안 → 미나가 거절하면 `mina_is_conspirator`가 true가 되어서는 안 됨.
6. 미나 사망 시 → 이후 미나 실제 방문·대화 금지. 회상/편지의 언급 가능.
7. 이혼 *절차 중* → 아직 배우자임. 이혼 확정 이벤트 후만 `relationship=ex_spouse`.
8. 왕실 장부 2,000,000, 가족 수령 3,000 → 차액 1,997,000은 **이체/사용처 미확정**이지 자동 횡령 확정 금지.
9. 엔딩 진입 → 이후 1회 선택도 허용 금지. 엔딩 회고 통계는 기록된 실제 역사에 근거.
10. 같은 버튼 더블클릭·브라우저 새로고침 → 중복 전이/중복 금화 적립 금지.
11. 불법 상태 저장(JSON 변조, 오래된 스키마) → 안전하게 거부하고 원래 저장 보존.
12. 최소 20개 고정 시드 시뮬레이션 및 모든 결과 경로 탐색. CI 실패 시 배포 금지.

## 10. UI 요구사항

- 기본 화면: 헤더(게임명/나이) → 짧은 주요 능력치 → 연대기 2~6줄 → 현재 사건 → 선택 카드 3~6개 → 결과/다음 화면.
- 별도: **인생 기록**, **인물 관계**, **엔딩 회고**, **설정/세이브 가져오기·내보내기**, **엔딩 도감**.
- 플레이 중 1클릭=1선택. 정확한 확률은 기본적으로 숨기되 선택이 가진 위험/제약은 정직하게 안내.
- 모바일 320px 폭 대응, 선택 터치 영역 최소 44px, 명도 대비, 키보드 선택/포커스 처리, 모션 감소 설정 준수.
- 인터랙션/랜덤 결과에 따라 텍스트 길이가 늘어나도 레이아웃 붕괴 금지.
- 상태 패널은 접어서 스토리 가독성을 유지. 장식 그래픽은 선택 사항이며 게임 진행에 필수 아님.
- 로딩 실패 시 빈 화면 금지. 재시도/오류 정보/현재 세이브 보존 안내.

## 11. 개발 순서와 완료 조건

### Phase 1 — 엔진만
- TypeScript 타입, 콘텐츠 로더, 조건/효과 DSL, 상태 전이, RNG, 저장/로드, JSON Schema, 단위테스트.
- 샘플 JSON으로 3개 이상 선택 분기와 2개 이상 엔딩을 실제로 통과.

### Phase 2 — 콘텐츠 툴 및 UI
- 반응형 게임/기록/관계/엔딩 화면, 최소한의 디자인, 세이브 내보내기·복원.
- `npm run validate:content`로 모든 참조 검사, `npm run simulate:all`로 실도달 경로 검사.

### Phase 3 — 첫 작품 완결
- 《가짜 마왕의 일생》 모든 선택→결과와 모든 경로→엔딩을 작성.
- 핵심 등장인물·금전·전과·혼인/이혼·국왕 후계 문제의 일관성 확인.
- 위험한 행동이 실패할 수 있으며 조기 배드엔딩도 최소 2개 포함.
- 마지막 회고에 플레이 중 실제 있었던 선택만 인용.

### Phase 4 — 배포
- `npm ci && npm run typecheck && npm test && npm run validate:content && npm run simulate:all && npm run build` 모두 통과 시 Actions로 Pages 배포.
- 배포 후 `/<REPO>/` 진입, 콘텐츠 fetch, 모바일 UI, 저장/복원, 엔딩, 새 회차 전부 수동 확인.

**완료 정의:** (a) 어떤 선택도 성공을 자동 보장하지 않음, (b) 모든 실제 플레이 가능한 상태에서 막힌 분기가 없음, (c) 모든 실제 플레이 가능한 경로가 엔딩에 도달, (d) 오류 시 저장 무결성 유지, (e) GitHub Pages 링크만으로 PC·모바일 플레이 가능.

## 12. 코덱스 작업 보호 규칙

1. **기존 기능을 이유 없이 재작성하지 말 것.** 변경 전에 현재 코드·테스트·콘텐츠 계약 확인.
2. `types`, 조건/효과 DSL, 세이브 스키마, 공개 콘텐츠 ID는 계약이다. 바꿀 경우 migration, 영향 분석, 회귀테스트를 함께 제출.
3. `CANON.md`의 세계관 확정 사실을 임의로 바꾸지 말 것. 설정 오류 발견 시 조용히 덮지 말고 명시적으로 수정 제안 및 일괄 정합성 점검.
4. 새 콘텐츠 작성은 가능하면 JSON만 변경. 엔진 변경이 필요한 요구는 사유와 영향 범위를 먼저 문서화.
5. 데모용 임시 fallback/실패 시 자동 성공/죽은 인물의 무단 부활/마지막 노드 자동 연결 금지.
6. 허용되지 않은 조건문은 임의로 무시하지 말고 스키마 오류로 중단.
7. 빌드 실패를 숨기거나 검증기를 비활성화해서 배포하지 말 것.
8. 단계 종료 시 변경 파일, 테스트 결과, 남은 위험, 적용한 설정 변경을 `CHANGELOG.md`에 간결히 기록.
9. 기능이 완성되기 전 25~40개 엔딩을 한꺼번에 기계 생성하지 말고 **게임 엔진과 소규모 고품질 세로 단면**을 먼저 만들 것.
10. 구현 중 판단이 갈리는 내용은 본 문서의 '선택은 시도, 결과는 판정' 원칙을 우선 적용할 것.

## 13. 아직 콘텐츠 제작 단계에서 정해야 할 항목

- 첫 작품 공식 정사(과거 대화는 즉석 시연이며 전부 정식 편입하지 않음).
- 인간/종족/사회 제도의 실제 세부 설정과 마왕 등록 제도의 진실.
- 미나·에리시아·국왕 등 인물의 장기적 동기, 비밀, 결말 후보.
- 세부 사건별 가중치와 능력/정보/관계가 판정에 미치는 영향.
- 첫 작품 전체 사건·분기·엔딩 문장.

**주의:** 이 명세서는 엔진 계약과 콘텐츠 제작 규칙을 확정한다. 이것만으로 모든 이야기가 완성된 것은 아니다. 코덱스는 먼저 엔진을 만들고, 콘텐츠는 품질을 검수하면서 단계적으로 채워야 한다.
