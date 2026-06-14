import { X, Building2, TrendingUp } from 'lucide-react';
import type { SchoolRecord } from '../types';

interface DetailDrawerProps {
  school: SchoolRecord | null;
  onClose: () => void;
}

export default function DetailDrawer({ school, onClose }: DetailDrawerProps) {
  if (!school) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>
            <Building2 size={18} />
            {school.schoolName}
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="drawer-body">
          <section className="drawer-section">
            <h4>基本信息</h4>
            <div className="info-grid">
              {school.schoolCode && <div className="info-item"><span>学校编码</span><strong>{school.schoolCode}</strong></div>}
              <div className="info-item"><span>隶属</span><strong>{school.affiliation}</strong></div>
              <div className="info-item"><span>性质</span><strong>{school.schoolNature}</strong></div>
              <div className="info-item"><span>类别</span><strong>{school.schoolCategory}</strong></div>
              <div className="info-item"><span>校址所在区</span><strong>{school.locationDistrict}</strong></div>
              <div className="info-item"><span>录取批次</span><strong>{school.admissionBatches}</strong></div>
              {school.batch2Score2025 && (
                <div className="info-item"><span>2025第二批分</span><strong>{school.batch2Score2025}</strong></div>
              )}
              {school.gradient2025 && school.gradient2025 !== '-' && (
                <div className="info-item"><span>2025梯度</span><strong className="gradient-text">{school.gradient2025}</strong></div>
              )}
              {school.schoolAddress2026 && (
                <div className="info-item"><span>2026年地址</span><strong>{school.schoolAddress2026}</strong></div>
              )}
              {school.enrollmentPlan2026 && school.enrollmentPlan2026 !== '-' && (
                <div className="info-item"><span>2026招生计划</span><strong>{school.enrollmentPlan2026}</strong></div>
              )}
              {school.maxWaiquPlan2026 && school.maxWaiquPlan2026 !== '-' && (
                <div className="info-item"><span>2026外区最大计划</span><strong>{school.maxWaiquPlan2026}</strong></div>
              )}
              {school.totalPlan2026 !== null && school.totalPlan2026 !== undefined && (
                <div className="info-item"><span>2026总计划</span><strong>{school.totalPlan2026}</strong></div>
              )}
              {school.totalDormitory2026 !== null && school.totalDormitory2026 !== undefined && (
                <div className="info-item"><span>2026总宿位</span><strong>{school.totalDormitory2026}</strong></div>
              )}
            </div>
          </section>

          {school.batch3Records.length > 0 && (
            <section className="drawer-section">
              <h4><TrendingUp size={16} /> 第三批录取分数</h4>
              <table className="drawer-table">
                <thead>
                  <tr>
                    <th>年份</th><th>范围</th><th>户籍最低分</th><th>户籍末位志愿</th><th>户籍末位分</th>
                    <th>外区最低分</th><th>外区末位志愿</th><th>外区末位分</th>
                  </tr>
                </thead>
                <tbody>
                  {school.batch3Records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.year}</td><td>{r.scope}</td>
                      <td>{r.hujiMinScore ?? '--'}</td>
                      <td>{r.hujiLastVolunteerOrder ?? '--'}</td>
                      <td>{r.hujiLastScore ?? '--'}</td>
                      <td>{r.waiquMinScore ?? '--'}</td>
                      <td>{r.waiquLastVolunteerOrder ?? '--'}</td>
                      <td>{r.waiquLastScore ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {school.batch4Records.length > 0 && (
            <section className="drawer-section">
              <h4><TrendingUp size={16} /> 第四批录取分数</h4>
              <table className="drawer-table">
                <thead>
                  <tr>
                    <th>年份</th><th>性质</th><th>范围</th><th>类型</th>
                    <th>最低分</th><th>同分序号</th><th>末位志愿</th><th>末位分数</th>
                  </tr>
                </thead>
                <tbody>
                  {school.batch4Records.map((r, i) => (
                    <tr key={i}>
                      <td>{r.year}</td><td>{r.schoolNature}</td><td>{r.scope}</td>
                      <td>{r.isHuji ? '户籍生' : '统招'}</td>
                      <td>{r.minScore ?? '--'}</td>
                      <td>{r.minScoreRank ?? '--'}</td>
                      <td>{r.lastVolunteerOrder ?? '--'}</td>
                      <td>{r.lastScore ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {school.quotaControlLine && (
            <section className="drawer-section">
              <h4>名额分配控制线 (2026)</h4>
              <div className="quota-cards">
                <div className="quota-card">
                  <span className="quota-label">近三年均分</span>
                  <span className="quota-value">{school.quotaControlLine.avg3Year}</span>
                </div>
                <div className="quota-card highlight">
                  <span className="quota-label">2026控制线</span>
                  <span className="quota-value">{school.quotaControlLine.controlLine2026}</span>
                </div>
                <div className="quota-card">
                  <span className="quota-label">2023年</span>
                  <span className="quota-value">{school.quotaControlLine.score2023 ?? '--'}</span>
                </div>
                <div className="quota-card">
                  <span className="quota-label">2024年</span>
                  <span className="quota-value">{school.quotaControlLine.score2024 ?? '--'}</span>
                </div>
                <div className="quota-card">
                  <span className="quota-label">2025年</span>
                  <span className="quota-value">{school.quotaControlLine.score2025 ?? '--'}</span>
                </div>
              </div>
            </section>
          )}

          {school.xieheSendingRecords && school.xieheSendingRecords.length > 0 && (
            <section className="drawer-section">
              <h4><TrendingUp size={16} /> 协和送生录取明细（协和→该校）</h4>
              <p className="drawer-note">广州协和学校初中部毕业生通过名额分配被该校录取的情况</p>
              <table className="drawer-table">
                <thead>
                  <tr>
                    <th>年份</th><th>最低分</th><th>同分序号</th>
                    <th>末位分</th><th>末位志愿</th><th>末位同分序</th>
                  </tr>
                </thead>
                <tbody>
                  {school.xieheSendingRecords.map((r, i) => (
                    <tr key={i}>
                      <td>{r.year}</td>
                      <td>{r.minScore ?? '--'}</td>
                      <td>{r.minScoreRank ?? '--'}</td>
                      <td>{r.lastScore ?? '--'}</td>
                      <td>{r.lastVolunteerOrder ?? '--'}</td>
                      <td>{r.lastScoreRank ?? '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
