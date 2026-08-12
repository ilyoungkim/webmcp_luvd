# README — WebMCP 기반 진단지 제출 자동화

이 문서는 **연애의자격(yonja)** 사이트에서 사용자가 작성하는 **재회 가능성 진단지**의 제출을
WebMCP(Model Context Protocol for Web)를 통해 자동화하는 방법을 정리합니다.

AI 에이전트(또는 Chrome 확장)가 대화 중 파악한 정보를 바탕으로 진단지 폼을 자동으로 채우고
제출할 수 있도록, 웹페이지가 **Tool(도구)** 형태로 "진단지 제출 기능"을 노출하는 것이 핵심입니다.

---

## 1. 목표

사용자가 대화로만 입력해도 AI가 다음을 자동 수행하도록 합니다.

- 진단지 페이지(`diagnosis.html`)에서 필요한 입력 필드 인식
- 이름 · 성별 · 이별 기간 · 이별 사유 등 데이터를 Tool 인자로 채움
- 실제 제출 API 호출 또는 폼 submit 실행
- 결과(진단 접수 완료)를 사용자에게 표시

---

## 2. 진단지 페이지 실제 구조 (`diagnosis.html`)

현재 페이지는 Next.js(React) 기반이며, 대부분의 폼 필드가 동적으로 렌더링됩니다.
정적으로 확인된 입력 요소는 다음과 같습니다.

| 필드 | placeholder / UI | 비고 |
| --- | --- | --- |
| 이름 | `이름을 입력해주세요.` | `maxlength="4"` |
| 휴대폰 번호 | `휴대폰 번호를 입력해 주세요` | `maxlength="13"` |
| 이별 날짜 | `날짜를 선택하세요` / 캘린더 | |
| 이별 상태 | `아직 헤어지지 않았어요` 등 | 라디오/선택형 |
| 이별 사유 | `ex) 방금 헤어졌어요...` | |
| 재회 목적 | `ex) 다시 만나고 싶어요...` | |
| 유입 경로 | `ex) 친구 추천으로...` | |

> ⚠️ 필드 `name`은 React 상태로 관리되어 정적 HTML에는 없습니다.
> 자동화 구현 시 **선택자(placeholder/라벨 기반)** 또는 **React 입력 이벤트 디스패치**가 필요합니다.

---

## 3. WebMCP Tool 정의

AI가 호출할 수 있도록 진단지 제출용 **JSON Schema**와 **실행 핸들러**를 정의합니다.

### 3-1. Tool 명세 (JSON Schema)

```js
// 예시: 진단지 제출 Tool 명세 (yonja.diagnosis.submit 확장형)
const submitDiagnosisTool = {
  name: "yonja.diagnosis.submit",
  description: "이름, 성별, 이별 기간, 이별 사유 등의 정보를 받아 재회 가능성 진단지를 제출합니다.",
  inputSchema: {
    type: "object",
    properties: {
      name:            { type: "string",  description: "신청자 이름" },
      phone:           { type: "string",  description: "휴대폰 번호" },
      gender:          { type: "string",  enum: ["male", "female"], description: "성별" },
      separated_days:  { type: "integer", description: "이별 후 경과 일수" },
      separated_at:    { type: "string",  description: "이별 날짜 (YYYY-MM-DD)" },
      still_together:  { type: "boolean", description: "아직 헤어지지 않았는지 여부" },
      relationship_period: { type: "string", description: "교제 기간" },
      reason:          { type: "string",  description: "이별 사유" },
      goal:            { type: "string",  description: "재회 목적" },
      source:          { type: "string",  description: "유입 경로" }
    },
    required: ["name", "gender", "reason"]
  }
};
```

### 3-2. 실행 핸들러 (Form/API 연동)

AI가 Tool을 호출하면 실제 백엔드 API로 전송하거나, DOM 폼을 채운 뒤 제출 이벤트를 실행합니다.

```js
async function handleToolCall(toolName, args) {
  if (toolName === "yonja.diagnosis.submit") {
    // 방식 A) API 백엔드로 직접 전송
    const response = await fetch("/api/diagnosis/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args)
    });

    // 방식 B) DOM 폼 요소 직접 제어
    // document.querySelector('[placeholder="이름을 입력해주세요."]').value = args.name;
    // document.querySelector("#diagnosis_form").submit();

    return await response.json();
  }
}
```

---

## 4. 구현 방식 선택

### 방식 A — Client-side WebMCP (권장, 이 저장소 기준)

- 프론트엔드 JS(`webmcp.js`)에 Tool을 추가로 등록
- 로그인 상태 / 쿠키 / 세션 토큰을 그대로 유지한 채 폼 제출 처리
- Chrome 확장(`webmcp-extension`)과 연동되어 팝업에서도 호출 가능

장점:
- 별도 서버 없이 현재 구조에 바로 적용 가능
- 세션/인증 유지가 자연스러움

### 방식 B — Server-side MCP Server

- 백엔드(Node.js/Python)에 MCP 서버 구축
- 럽디/연애의자격 DB 및 실제 제출 API와 직접 연동
- AI가 백엔드 엔드포인트를 호출하도록 구성

장점:
- 복잡한 검증·저장 로직을 서버에 위임
- 다수 클라이언트에서 재사용 가능

---

## 5. 적용 절차 (Plan)

### Step 1 — Tool 등록 정의 추가
`yonja.html`(또는 `webmcp.js`)의 `WebMCPConfig.items`에 `diagnosis.submit` 항목을 확장해
이름·성별·이별 기간·이별 사유 등 실제 필드에 맞는 `inputSchema`와 `getData` 핸들러를 정의합니다.

### Step 2 — 제출 로직 구현
`getData(args)` 안에서:
1. `fetch`로 제출 API 호출
2. 또는 DOM 셀렉터(placeholder/라벨)로 입력 값을 채우고 제출 이벤트 실행

### Step 3 — 확장 연동 확인
`webmcp-extension`의 `keywordPlan()`에서 `진단` 키워드가 `yonja.diagnosis.submit`을
호출하도록 유지하고, 호출 결과를 팝업 결과 영역에 표시합니다.

### Step 4 — 검증
- 페이지에서 Tool 등록 로그 확인 (`[WebMCP] tool 등록 완료: yonja.diagnosis.submit`)
- 팝업에서 "진단 제출" 퀵 입력 실행
- 실제 진단 접수 완료 응답 확인

---

## 6. 요약

웹사이트에 **이름 · 성별 · 이별 기간 · 이별 사유** 등을 인자로 받는
`submit_reunion_diagnosis`(또는 `yonja.diagnosis.submit`) 스크립트/도구를 작성해
MCP 프로토콜로 등록해 두면,

AI가 사용자의 대화 맥락을 읽고 **자동으로 해당 도구를 실행**하여
진단지 접수를 완료할 수 있습니다.

> 참고: WebMCP는 제안(proposed) 표준이며, Chrome/브라우저 버전에 따라 지원 범위가 다를 수 있습니다.
> 지원되지 않는 환경에서는 확장의 키워드 기반 fallback이 동작합니다.
