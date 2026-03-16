# Mediawall Guestbook 작업 기록

## 2026-03-17 — 인프라 무료 티어 검토

### 사용 규모
- 일 최대 10,000명 / 동시 200~400명 / 버스트 100~200 메시지
- 외부에는 submit 페이지만 공개 (Wall은 대형 스크린만)

### 검토 결과
- **Render 무료 (0.1 vCPU)** → 동시 200명 이상 WebSocket 브로드캐스트 불가
- **Render Standard ($25/월, 1 vCPU, 2GB RAM)** → 동시 400명 대비 3~5배 여유, 충분
- **Firebase Spark (무료)** → 쓰기 20,000/일 한도. submit만 공개 시 읽기는 여유
- **Firebase Blaze (종량제)** → submit만 공개 시 비용 거의 $0
  - Google Cloud 신규 계정이면 $300/90일 무료 크레딧 적용 가능
- perMessageDeflate(WebSocket 압축) ON 유지 — Standard에서 충분, 이슈 시 OFF 검토

### 결정
- **Render Standard ($25/월) + Firebase Blaze** 조합으로 업그레이드
- 예상 월 비용: ~$25

---

## 2026-03-15 — DB 전환 및 서버 최적화

### DB 전환: SQLite → Firestore
- better-sqlite3 제거, firebase-admin 추가
- 서비스 계정 키는 Render 환경변수 FIREBASE_SERVICE_ACCOUNT로 전달
- Render 재배포 시에도 메시지 영구 보존

### 서버 성능 최적화
- 메시지 큐: 순차 처리 → 배치 플러시 (200ms마다 최대 50건)
- 브로드캐스트를 DB 저장 전 즉시 실행 (Wall 반응속도 향상)
- Rate limit: IP당 5초/10건 (행사장 공유 WiFi 대응)
- 큐 상한 2000건, Socket.io 연결 1000개 제한
- WebSocket 압축(perMessageDeflate), 헬스체크 GET /health, body 100kb 제한

### Firestore 읽기 최적화
- 카운터를 messages → metadata/counter로 분리 (!=필터 제거)
- getCount() 1건 읽기, getMessages() limit 수만큼만 읽기

### 보안 강화
- admin 비밀번호/토큰 서버 사이드로 이동 (프론트 노출 제거)
- POST /api/messages/admin/login → 토큰 발급
- delete 라우트에 X-Admin-Token 검증

### 프론트엔드 개선
- Wall 초기 로드 30건 (MAX_MESSAGES)
- Submit: 재시도 로직 (최대 3회, 지수 백오프, 10초 타임아웃)
- Admin: 페이지네이션(더 보기), 최신순 정렬, 아바타 제거
- Admin: 소켓 재연결 시 자동 갱신, Wall 새로고침 버튼
- Socket.io 재연결 500ms~3s, 무한 재시도

---

## 배포 현황
- **GitHub**: gakim0219/mediawall-guestbook
- **프론트엔드**: Firebase Hosting (https://mediawall-guestbook.web.app)
- **백엔드**: Render (Express + Firestore + Socket.io)
- **DB**: Firebase Firestore (messages, metadata 컬렉션)

## 기술 스택
- React 19 + Vite 5 + Socket.io-client
- Express + Socket.io + firebase-admin
- Firebase Firestore (messages, metadata 컬렉션)
- HyundaiSans 폰트 (Bold, Medium)
