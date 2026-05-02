import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
} from '@mui/material';
import {
  FactCheck as QmsIcon,
  CategoryOutlined as ScopeIcon,
  Science as ProductQualIcon,
  PrecisionManufacturing as ProcessQualIcon,
  VerifiedUser as MaterialQualIcon,
  MonitorHeart as ConformityIcon,
  AutoGraph as AiIcon,
  CheckCircleOutline as CheckIcon,
  HourglassEmpty as SoonIcon,
  ReportProblem as CapaIcon,
  ArticleOutlined as DocsIcon,
} from '@mui/icons-material';

const PILLARS = [
  {
    phase: 1,
    label: 'Phase 1',
    icon: <QmsIcon sx={{ fontSize: 32 }} />,
    title: 'QMS Self-Assessment',
    route: '/nexus/qms-assessment',
    reqIds: ['#0841#', '#0882#', '#0883#', '#0585#', '#0652#'],
    description:
      'Track compliance across all Mastercard QMS requirements. Two checklist variants — ISO 9001 certified (31 requirements) or non-certified (60 requirements). Each requirement mapped to a conformity verdict: NC+ · nc- · RI · Full. Any NC finding auto-creates a CAPA item.',
    color: '#1565C0',
  },
  {
    phase: 1,
    label: 'Phase 1',
    icon: <ScopeIcon sx={{ fontSize: 32 }} />,
    title: 'Product Scope & Process Steps',
    route: '/nexus/product-scope',
    reqIds: ['#0583#', '#0705#', '#0811#', '#0706#'],
    description:
      'Select in-scope product types (IC, ICM, IL, CB, ICC, Perso, iacICM, BSM, IAC/iacIL) and assess conformity across 90 process tags per product. SPC (#0705#), Cpk (#0811#), and the #0706# production gate are all evaluated per product type in V3.A.',
    color: '#0277BD',
  },
  {
    phase: 2,
    label: 'Phase 2',
    icon: <ProductQualIcon sx={{ fontSize: 32 }} />,
    title: 'Product Qualification',
    route: '/nexus/product-qualification',
    reqIds: ['#0561#', '#0571#', '#0582#', '#0651#', '#0654#', '#0706#'],
    description:
      'Formal one-time approval of the card design — per product type. Qualification Plan, design review sign-off chain (#0571#), evidence links to test sessions, and the #0706# production gate per product. Gate unlocks only when all 6 criteria are satisfied.',
    color: '#2E7D32',
  },
  {
    phase: 2,
    label: 'Phase 2',
    icon: <ProcessQualIcon sx={{ fontSize: 32 }} />,
    title: 'Process Qualification',
    route: '/nexus/process-qualification',
    reqIds: ['#0583#', '#0653#', '#0705#', '#0811#'],
    description:
      'Proof that the manufacturing process is stable and repeatable — per product type. Process Specification tracker, SPC evidence panel with Cp/Cpk pulled from existing test sessions, and a Process Qualification Report (#0653#) builder.',
    color: '#E65100',
  },
  {
    phase: 1,
    label: 'Phase 1',
    icon: <MaterialQualIcon sx={{ fontSize: 32 }} />,
    title: 'Components / Material Qualification',
    route: '/nexus/components',
    reqIds: ['#0603#', '#0604#'],
    description:
      'Structured supplier and subcontractor registry matching the V3.A Components sheet. CQM certification status, ISO 3166-1 country codes, cert expiry alerts, and per-component links to open CAPA items for non-certified suppliers.',
    color: '#6A1B9A',
  },
  {
    phase: 3,
    label: 'Phase 3',
    icon: <CapaIcon sx={{ fontSize: 32 }} />,
    title: 'CAPA',
    route: '/nexus/capa',
    reqIds: ['#0821#', '#0882#', '#0883#'],
    description:
      'Corrective Action Plan lifecycle — mirrors the V3.A CAP sheet exactly. Action IDs in [YY-MM/xxxNN] format, severity (NC+/nc-/RI), deadline tracking with overdue alerts, evidence references, and auditor review workflow. Auto-populated from NC findings.',
    color: '#B71C1C',
  },
  {
    phase: 3,
    label: 'Phase 3',
    icon: <DocsIcon sx={{ fontSize: 32 }} />,
    title: 'Document Register',
    route: '/nexus/documents',
    reqIds: ['#0761#', '#0762#'],
    description:
      'Formal document register matching the V3.A Docs sheet. Each entry links a DocID and title to the requirement that first called for it. Auto-populated from evidence references entered across QMS and product assessments.',
    color: '#37474F',
  },
  {
    phase: 4,
    label: 'Phase 4',
    icon: <ConformityIcon sx={{ fontSize: 32 }} />,
    title: 'Product Conformity',
    route: '/nexus/conformity',
    reqIds: ['#0701#', '#0702#', '#0721#', '#0722#', '#0703#'],
    description:
      'Ongoing proof that volume production cards meet released specifications every batch. Quality Monitoring Records auto-generated from approved test sessions. Pass rates by test category over time. Representative sample tracker.',
    color: '#00695C',
  },
  {
    phase: 5,
    label: 'Phase 5',
    icon: <AiIcon sx={{ fontSize: 32 }} />,
    title: 'AI Insights',
    route: '/nexus/ai-insights',
    reqIds: ['#0705#', '#0811#', '#0821#'],
    description:
      'Predictive analytics layered on all modules. Per-product SPC out-of-control alerts, qualification readiness scores, predicted pass/fail trends, and supplier risk scoring based on cert expiry and defect rates.',
    color: '#AD1457',
  },
];

const EXISTING_CAPABILITIES = [
  { label: 'Test Sessions & Entries', req: '#0701# · #0702#', live: true },
  { label: 'Statistical Process Control (Xbar/R, IMR)', req: '#0705#', live: true },
  { label: 'Process Capability (Cp / Cpk)', req: '#0811#', live: true },
  { label: 'Kappa / MSA Studies', req: '#0811#', live: true },
  { label: 'KPI Performance Tracking', req: '#0801#', live: true },
  { label: 'Job Tracker (production runs)', req: '#0720#', live: true },
  { label: 'Adhesion Log', req: '#0583#', live: true },
  { label: 'ISO Test Forms (30+ specialized)', req: '#0651#', live: true },
];

const PHASES = [
  { phase: 0, label: 'Phase 0', title: 'Seed Data Prep — QMS requirements, 90 process step tags, enums', status: 'next' },
  { phase: 1, label: 'Phase 1', title: 'QMS Self-Assessment · Product Scope · Components (Foundation DB)', status: 'planned' },
  { phase: 2, label: 'Phase 2', title: 'Product Qualification Hub · Process Qualification Hub', status: 'planned' },
  { phase: 3, label: 'Phase 3', title: 'CAPA · Document Register', status: 'planned' },
  { phase: 4, label: 'Phase 4', title: 'Product Conformity (Quality Monitoring Records)', status: 'planned' },
  { phase: 5, label: 'Phase 5', title: 'NEXUS Dashboard · Audit Report · AI Insights', status: 'planned' },
];

export default function NexusIntro() {
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>

      {/* ── Hero ── */}
      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #004C99 0%, #0066CC 50%, #003D80 100%)',
          borderRadius: 3,
          p: { xs: 4, md: 6 },
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -60,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,152,0,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #FF9800, #F44336)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(255,152,0,0.4)',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: -1 }}>
                Nx
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(90deg, #FFFFFF 0%, #FF9800 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1,
                }}
              >
                NEXUS
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', mt: 0.3 }}>
                Qualification Hub
              </Typography>
            </Box>
          </Stack>

          <Typography
            variant="h5"
            sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400, fontStyle: 'italic', pt: 1 }}
          >
            Connected Quality. Intelligent Future.
          </Typography>

          <Typography sx={{ color: 'rgba(255,255,255,0.55)', maxWidth: 680, lineHeight: 1.7 }}>
            NEXUS is the qualification and conformity layer built on top of the CQM tracking system.
            Where CQM stores the data, NEXUS gives it meaning — answering the question:{' '}
            <em style={{ color: 'rgba(255,255,255,0.8)' }}>
              "Is this product, process, and supply chain fully qualified and audit-ready?"
            </em>
          </Typography>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" pt={1}>
            <Chip
              label="Mastercard CQMAP V3.A"
              size="small"
              sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#FFB74D', border: '1px solid rgba(255,152,0,0.3)', fontWeight: 600 }}
            />
            <Chip
              label="23 Audit Sheets"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <Chip
              label="9 Product Types"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <Chip
              label="31–60 QMS Requirements"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <Chip
              label="In Development"
              size="small"
              sx={{ bgcolor: 'rgba(33,150,243,0.15)', color: '#64B5F6', border: '1px solid rgba(33,150,243,0.3)' }}
            />
          </Stack>
        </Stack>
      </Paper>

      {/* ── Existing Capabilities ── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4, borderRadius: 2, borderColor: 'success.light', bgcolor: 'rgba(46,125,50,0.04)' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
          <CheckIcon color="success" />
          <Typography variant="h6" fontWeight={700} color="success.dark">
            Already Live in This System
          </Typography>
          <Chip label="Feeding NEXUS on Day 1" size="small" color="success" variant="outlined" />
        </Stack>
        <Grid container spacing={1.5}>
          {EXISTING_CAPABILITIES.map((cap) => (
            <Grid item xs={12} sm={6} md={3} key={cap.label}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <CheckIcon sx={{ fontSize: 16, color: 'success.main', mt: 0.3, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
                    {cap.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cap.req}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* ── 7 Modules ── */}
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        9 NEXUS Modules
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Each module maps directly to requirements in the Mastercard CQM Assessment Plan V3.A.
        Every requirement ID (e.g. <code>#0705#</code>) corresponds to a specific row in the CQMAP audit workbook.
      </Typography>

      <Grid container spacing={2.5} mb={5}>
        {PILLARS.map((p) => (
          <Grid item xs={12} sm={6} lg={4} key={p.title}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: 2,
                borderColor: 'divider',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 4 },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                  <Box sx={{ color: p.color }}>
                    {p.icon}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Chip
                      icon={<SoonIcon sx={{ fontSize: '12px !important' }} />}
                      label={p.label}
                      size="small"
                      sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor: `${p.color}15`,
                        color: p.color,
                        border: `1px solid ${p.color}30`,
                        '& .MuiChip-icon': { color: p.color },
                      }}
                    />
                  </Stack>
                </Stack>

                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  {p.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 2 }}>
                  {p.description}
                </Typography>

                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {p.reqIds.map((id) => (
                    <Chip
                      key={id}
                      label={id}
                      size="small"
                      sx={{
                        fontSize: 10,
                        height: 18,
                        fontFamily: 'monospace',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                      }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── CQMAP Structure ── */}
      <Paper
        variant="outlined"
        sx={{ p: 3, mb: 4, borderRadius: 2, bgcolor: 'rgba(25,118,210,0.03)', borderColor: 'primary.light' }}
      >
        <Typography variant="h6" fontWeight={700} color="primary.main" mb={0.5}>
          Built on Mastercard CQMAP V3.A
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          The entire NEXUS module structure is derived from the official Mastercard CQM Assessment Plan workbook.
          Every audit sheet is represented as a trackable module.
        </Typography>

        <Grid container spacing={2}>
          {[
            { label: 'Coversheet', desc: 'Site info, contacts, production volumes, grade, cert recommendations (structured in V3.A)' },
            { label: 'Audit Scope & Compliance', desc: 'Product type scope selection + per-product compliance % (200r × 37c)' },
            { label: 'QMS – has ISO 9001 Cert', desc: '31 requirements (ISO cert covers the basics) — was 41 in V2.22' },
            { label: 'QMS – NO ISO 9001 Cert', desc: '60 requirements (full ISO 9001 + CQM-specific) — was 73 in V2.22' },
            { label: 'IC / ICM / IL / CB / ICC / P', desc: '6 product sheets — 90 process tags each, 79 columns (V3.A expanded from 60/55)' },
            { label: 'iacICM / BSM / iacIL / IAC', desc: '3 additional product sheets — same 90-tag structure, new biometric variants' },
            { label: 'Components', desc: 'NEW in V3.A — structured supplier/subcontractor registry with CQM cert status' },
            { label: 'CAP + CAP previous', desc: 'NEW in V3.A — built-in Corrective Action Plan workflow (full CAPA lifecycle)' },
            { label: 'Docs', desc: 'NEW in V3.A — document register, DocID/title/notes linked to requirement IDs' },
            { label: 'Audit Report', desc: 'NEW in V3.A — auto-generated full audit report (1505r × 430c)' },
            { label: 'Audit Agenda / Attendees / SelectionLists', desc: 'NEW in V3.A — audit schedule, attendees, all dropdown values' },
          ].map((row) => (
            <Grid item xs={12} sm={6} md={4} key={row.label}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.8, flexShrink: 0 }} />
                <Box>
                  <Typography variant="body2" fontWeight={600}>{row.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.desc}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        <Stack direction="row" spacing={4} flexWrap="wrap" gap={1}>
          {[
            { label: 'NC+', desc: 'Major non-conformity (fail)', color: '#c62828' },
            { label: 'nc-', desc: 'Minor non-conformity', color: '#e65100' },
            { label: 'RI', desc: 'Room for Improvement', color: '#f9a825' },
            { label: 'Full', desc: 'Fully compliant', color: '#2e7d32' },
            { label: 'NCC', desc: 'Not Conformity Checked (subcontractor — new in V3.A)', color: '#546e7a' },
          ].map((s) => (
            <Stack key={s.label} direction="row" alignItems="center" spacing={1}>
              <Chip
                label={s.label}
                size="small"
                sx={{ fontWeight: 700, bgcolor: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}
              />
              <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
            </Stack>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', fontStyle: 'italic' }}>
            ← Canonical conformity scale used throughout NEXUS
          </Typography>
        </Stack>

      </Paper>

      {/* ── Roadmap ── */}
      <Typography variant="h5" fontWeight={700} mb={3}>
        Implementation Roadmap
      </Typography>

      <Stack spacing={0}>
        {PHASES.map((ph, idx) => (
          <Box key={ph.phase} sx={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {/* Timeline spine */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: ph.status === 'next' ? 'warning.main' : 'action.disabledBackground',
                  border: ph.status === 'next' ? '3px solid' : '2px solid',
                  borderColor: ph.status === 'next' ? 'warning.dark' : 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                  mt: 1.5,
                }}
              >
                <Typography variant="caption" fontWeight={700} color={ph.status === 'next' ? 'warning.contrastText' : 'text.disabled'}>
                  {ph.phase}
                </Typography>
              </Box>
              {idx < PHASES.length - 1 && (
                <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', my: 0.5 }} />
              )}
            </Box>

            {/* Content */}
            <Box sx={{ pb: 3, pt: 1.5, pl: 2, flexGrow: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.3}>
                <Typography variant="caption" fontWeight={700} color={ph.status === 'next' ? 'warning.main' : 'text.disabled'} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                  {ph.label}
                </Typography>
                {ph.status === 'next' && (
                  <Chip label="Up Next" size="small" color="warning" sx={{ height: 18, fontSize: 10 }} />
                )}
              </Stack>
              <Typography variant="body1" fontWeight={600} color={ph.status === 'next' ? 'text.primary' : 'text.secondary'}>
                {ph.title}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>

    </Box>
  );
}
