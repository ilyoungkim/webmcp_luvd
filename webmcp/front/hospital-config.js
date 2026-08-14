// ============================================================================
// hospital-config.js — 생생병원 기준 WebMCPConfig + 시스템 프롬프트
// ============================================================================
// - window.WebMCPConfig : webmcp.js가 툴 등록에 사용 (hospital/doctor/appointment)
// - window.HOSPITAL_SYSTEM_PROMPT : AI 비서에게 병원 지식을 주입
// ============================================================================
window.WebMCPConfig = {
  siteNs: 'hospital',
  lang: 'ko',
  debug: true,
  proxyEndpoint: '/api/chat',
  names: {
    hospital:    { names: ['get_info'], description: '병원 기본정보 · 진료과 · 위치 · 운영시간 조회' },
    doctor:      { names: ['get_info'], description: '의사 · 전문분야 · 진료시간 · 소속 진료과 조회' },
    appointment: { names: ['get_current'], description: '로그인한 환자의 현재 예약정보 조회' },
  },
  items: [
    {
      group: 'hospital',
      name: 'get_info',
      title: '병원 정보',
      description: '병원의 기본 정보(이름, 주소, 전화번호)와 진료과, 위치, 운영시간을 조회합니다.',
      getData: {
        name: '생생병원',
        address: '서울특별시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        departments: ['내과', '외과', '정형외과', '이비인후과', '피부과'],
        hours: '월~금 09:00~18:00, 토 09:00~13:00',
        url: 'https://www.saengsaenghospital.com',
      },
    },
    {
      group: 'doctor',
      name: 'get_info',
      title: '의사 정보',
      description: '의사의 전문분야, 진료시간, 소속 진료과 정보를 조회합니다.',
      inputSchema: {
        type: 'object',
        properties: { doctorId: { type: 'string', description: '의사 식별자' } },
        required: [],
      },
      getData: function () {
        return {
          doctors: [
            { id: '1', name: '김원장', specialty: '내과', department: '내과', schedule: '월/수/금' },
            { id: '2', name: '이외과', specialty: '외과', department: '외과', schedule: '화/목' },
            { id: '3', name: '박정형', specialty: '정형외과', department: '정형외과', schedule: '월~금' },
          ],
        };
      },
    },
    {
      group: 'appointment',
      name: 'get_current',
      title: '현재 예약 정보',
      description: '로그인한 사용자의 현재 예약 상태와 일정을 조회합니다.',
      inputSchema: {
        type: 'object',
        properties: { userId: { type: 'string', description: '예약자를 식별하는 사용자 ID' } },
        required: ['userId'],
      },
      getData: async function (args) {
        var userId = (args && args.userId) || 'guest';
        return { userId: userId, status: '예약됨', nextAppointment: '2026-08-15 10:00' };
      },
    },
  ],
};

// AI 비서에게 주입할 병원 지식
window.HOSPITAL_SYSTEM_PROMPT =
  '당신은 생생병원(saengsaenghospital) 웹사이트의 AI 비서입니다. ' +
  '사용자의 질문에 친절하고 정확하게 답변하세요. ' +
  '병원/의사/예약 관련 질문에는 제공된 정보를 바탕으로 답하고, ' +
  '필요하면 다음 기능을 안내하세요: 병원 정보 조회, 의사 정보 조회, 예약 정보 조회. ' +
  '항상 한국어로 자연스럽게 답변하세요. ' +
  '⚠️ 절대 내부 API 이름(hospital.get_info, hospital.doctor.get_info, hospital.appointment.get_current 등)을 사용자에게 노출하지 마세요. 기능명만 자연스럽게 안내하세요.\n\n' +
  '=== 생생병원 소개 ===\n' +
  '생생병원은 서울 강남구에 위치한 종합병원입니다. 내과, 외과, 정형외과, 이비인후과, 피부과 등 다양한 진료과를 운영합니다.\n' +
  '운영시간: 월~금 09:00~18:00, 토 09:00~13:00\n' +
  '주소: 서울특별시 강남구 테헤란로 123\n' +
  '전화: 02-1234-5678\n\n' +
  '=== 의사 목록 ===\n' +
  '- 김원장 (내과): 월/수/금 진료\n' +
  '- 이외과 (외과): 화/목 진료\n' +
  '- 박정형 (정형외과): 월~금 진료\n' +
  '사용자가 의사 정보를 물어보면 위 의사 목록을 정확히 알려주세요.\n\n' +
  '=== 예약 안내 ===\n' +
  '환자의 현재 예약 상태와 일정을 조회할 수 있습니다. 예약 관련 질문이 있으면 예약 정보 조회 기능을 안내하세요.\n\n' +
  '⚠️ 답변 마지막에 기능 목록이나 안내 문구를 추가하지 마세요. 사용자가 요청한 내용에 대해서만 간결하게 답변하세요.';
