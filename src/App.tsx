import { useEffect, useMemo, useState } from 'react'

type Gender = 'total' | 'male' | 'female'
type Series = Record<Gender, number[]>
type PopulationData = { years: number[]; data: Record<string, Record<string, Series>> }

const TYPES = [
  { key: '동부', label: '동 지역', color: '#D7FF3F' },
  { key: '읍부', label: '읍 지역', color: '#7A8CFF' },
  { key: '면부', label: '면 지역', color: '#FF7849' },
]
const GENDERS: { key: Gender; label: string }[] = [
  { key: 'total', label: '전체' }, { key: 'male', label: '남성' }, { key: 'female', label: '여성' },
]
const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(Math.round(n))
const short = (n: number) => n >= 10_000_000 ? `${(n / 10_000_000).toFixed(1)}천만` : n >= 10_000 ? `${(n / 10_000).toFixed(0)}만` : fmt(n)

function LineChart({ data, years, age, gender }: { data: PopulationData['data']; years: number[]; age: string; gender: Gender }) {
  const series = TYPES.map(t => ({ ...t, values: data[t.key]?.[age]?.[gender] ?? [] }))
  const values = series.flatMap(s => s.values)
  const max = Math.max(...values) * 1.08, min = Math.min(...values) * .92
  const x = (i: number) => 58 + i * (642 / (years.length - 1))
  const y = (v: number) => 30 + (max - v) / (max - min || 1) * 220
  return <div className="chart-scroll"><svg className="line-chart" viewBox="0 0 740 300" role="img" aria-label="읍면동 인구 추세선 그래프">
    {[0,1,2,3,4].map(i => <g key={i}><line x1="58" x2="700" y1={30+i*55} y2={30+i*55} className="grid"/><text x="48" y={34+i*55} textAnchor="end" className="axis-label">{short(max-(max-min)*i/4)}</text></g>)}
    {years.map((year,i) => <text key={year} x={x(i)} y="282" textAnchor="middle" className="year-label">{year}</text>)}
    {series.map(s => <g key={s.key}>
      <polyline points={s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      {s.values.map((v,i)=><g key={i}><circle cx={x(i)} cy={y(v)} r="5" fill="#111" stroke={s.color} strokeWidth="3"/><title>{s.label} {years[i]}년 {fmt(v)}명</title></g>)}
    </g>)}
  </svg></div>
}

function BarChart({ data, age, yearIndex }: { data: PopulationData['data']; age: string; yearIndex: number }) {
  const rows = TYPES.map(t => ({...t, male:data[t.key]?.[age]?.male[yearIndex]??0, female:data[t.key]?.[age]?.female[yearIndex]??0}))
  const max = Math.max(...rows.flatMap(r=>[r.male,r.female]))
  return <div className="bar-chart">{rows.map(r=><div className="bar-group" key={r.key}>
    <div className="bar-label"><span className="legend-dot" style={{background:r.color}}/>{r.label}</div>
    <div className="bar-track"><div className="bar male" style={{width:`${r.male/max*100}%`}}><span>{short(r.male)}</span></div></div>
    <div className="bar-track"><div className="bar female" style={{width:`${r.female/max*100}%`}}><span>{short(r.female)}</span></div></div>
  </div>)}</div>
}

export default function App() {
  const [population, setPopulation] = useState<PopulationData | null>(null)
  const [age, setAge] = useState('합계')
  const [gender, setGender] = useState<Gender>('total')
  const [yearIndex, setYearIndex] = useState(4)
  useEffect(()=>{ fetch('/population.json').then(r=>r.json()).then(setPopulation) },[])
  const ages = useMemo(()=>population ? Object.keys(population.data['전국']).filter(a=>!a.includes('연령')) : [],[population])
  if (!population) return <main className="loading">데이터를 불러오는 중입니다</main>
  const year = population.years[yearIndex]
  const total = population.data['전국'][age]?.[gender]?.[yearIndex] ?? 0
  const previous = population.data['전국'][age]?.[gender]?.[yearIndex-1] ?? total
  const change = previous ? (total-previous)/previous*100 : 0
  const typeTotal = TYPES.reduce((sum,t)=>sum+(population.data[t.key]?.[age]?.[gender]?.[yearIndex]??0),0)
  return <main>
    <header className="topbar"><div className="brand"><span className="brand-mark">P</span><span>인구 데이터랩</span></div><div className="source">KOSIS 인구총조사 · 2021—2025</div></header>
    <section className="hero">
      <div><p className="eyebrow">POPULATION INSIGHT</p><h1>연령 및 성별 인구<br/><em>읍·면·동 변화</em></h1><p className="subtitle">지역의 크기보다, 변화의 방향을 봅니다.</p></div>
      <div className="controls">
        <label>연령대<select value={age} onChange={e=>setAge(e.target.value)}>{ages.map(a=><option key={a}>{a}</option>)}</select></label>
        <label>기준 연도<select value={yearIndex} onChange={e=>setYearIndex(Number(e.target.value))}>{population.years.map((y,i)=><option key={y} value={i}>{y}년</option>)}</select></label>
        <div className="segmented" aria-label="성별 선택">{GENDERS.map(g=><button className={gender===g.key?'active':''} onClick={()=>setGender(g.key)} key={g.key}>{g.label}</button>)}</div>
      </div>
    </section>

    <section className="stats">
      <article><span>전국 {age} 인구</span><strong>{fmt(total)}<small>명</small></strong><p className={change>=0?'up':'down'}>{change>=0?'▲':'▼'} 전년 대비 {Math.abs(change).toFixed(2)}%</p></article>
      {TYPES.map(t=>{const value=population.data[t.key]?.[age]?.[gender]?.[yearIndex]??0; return <article key={t.key}><span>{t.label}</span><strong>{short(value)}<small>명</small></strong><p>{typeTotal?`${(value/typeTotal*100).toFixed(1)}%`: '—'} · 지역 유형 비중</p></article>})}
    </section>

    <section className="dashboard-grid">
      <article className="panel trend-panel"><div className="panel-head"><div><p className="kicker">5-YEAR TREND</p><h2>읍·면·동 인구 추이</h2></div><div className="legend">{TYPES.map(t=><span key={t.key}><i style={{background:t.color}}/>{t.label}</span>)}</div></div><LineChart data={population.data} years={population.years} age={age} gender={gender}/></article>
      <article className="panel compare-panel"><div className="panel-head"><div><p className="kicker">GENDER GAP</p><h2>{year}년 성별 비교</h2></div><div className="gender-legend"><span><i className="male-key"/>남성</span><span><i className="female-key"/>여성</span></div></div><BarChart data={population.data} age={age} yearIndex={yearIndex}/></article>
    </section>
    <footer><span>자료: 통계청 인구총조사</span><span>단위: 명 · 선택 연령 {age}</span></footer>
  </main>
}
