# Mediawall Guestbook — Project Guide

## Project Overview
Mediawall Guestbook is a real-time digital guestbook wall system. Visitors submit messages, photos, or reactions via mobile device. Approved content is displayed on a large-screen wall in real time — typically at events, exhibitions, or installations.

## Two Core Surfaces
1. **Guest Submission UI** — Mobile-first form for visitors to submit content
2. **Display Wall UI** — Large-screen (1080p+) real-time content display

## Agent Roster

Use these agents by invoking them with `/agent <name>` or by referencing them in your prompt.

| Agent | When to Use |
|-------|-------------|
| `architect` | System design, technology decisions, ADRs, feature planning |
| `frontend` | UI components, animations, display wall layout, submission form |
| `backend` | API endpoints, WebSocket, media handling, server logic |
| `database` | Schema design, queries, migrations, indexing |
| `reviewer` | Code review, security audit, quality check before merge |
| `tester` | Writing tests, test strategy, debugging failing tests |
| `moderator` | Moderation UI, approval workflow, automated filtering, admin controls |
| `devops` | Deployment, Docker, environment config, event day setup |

## Recommended Workflow

```
1. architect   → Design the feature
2. database    → Design schema changes (if needed)
3. backend     → Implement API and business logic
4. frontend    → Build UI
5. tester      → Write tests
6. reviewer    → Review before merge
7. devops      → Prepare deployment
```

For moderation-related features, always involve the `moderator` agent alongside `backend` and `frontend`.

## Key Technical Decisions (fill in as decided)
- **Frontend Framework**: TBD
- **Backend Framework**: TBD
- **Database**: TBD
- **Real-time**: WebSocket (Socket.io) / SSE
- **Media Storage**: Local / S3 / Cloudinary
- **Deployment**: Local LAN / Cloud

## 작업 기록
- `docs/work-log.md`에 세션별 작업 내역이 기록되어 있음. 새 세션 시작 시 반드시 읽고 현재 상황을 파악할 것.
- 세션 종료 시 작업 내용을 해당 파일에 추가하고 git push할 것.

## Code Conventions
- All secrets in `.env` — never hardcoded
- Validate all user input at system boundaries
- Real-time events: `new_submission`, `content_approved`, `content_removed`
- Submission states: `pending` → `approved` / `rejected` / `flagged`
