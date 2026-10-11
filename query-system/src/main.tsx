import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bootstrap as bootstrapCloudSync } from './utils/cloudSync'

/* 云同步启动自检：已有会话的设备立即与云端对账（SPEC-2026-0007） */
bootstrapCloudSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
