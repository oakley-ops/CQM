import { useState } from 'react';
import { Box, Button, FormControlLabel, Grid, Switch, TextField, Typography } from '@mui/material';
import { updateAudit } from '../../../services/nexus/nexusService';
import type { NexusAuditRecord } from '../../../types/nexus';

const FIELDS: { key: keyof NexusAuditRecord; label: string; type?: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'site_name', label: 'Site' },
  { key: 'address_line1', label: 'Street' },
  { key: 'city', label: 'City' },
  { key: 'state_province', label: 'Province / State' },
  { key: 'country_code', label: 'Country code (ISO, e.g. US)' },
  { key: 'primary_contact_name', label: 'CQM Primary Contact — name' },
  { key: 'primary_contact_email', label: 'Primary Contact — e-mail' },
  { key: 'primary_contact_phone', label: 'Primary Contact — phone' },
  { key: 'audit_contact_name', label: 'Audit Contact — name' },
  { key: 'audit_contact_email', label: 'Audit Contact — e-mail' },
  { key: 'audit_contact_phone', label: 'Audit Contact — phone' },
  { key: 'customer_id', label: 'Customer ID (CID)' },
  { key: 'cvcs_reference', label: 'CVCS Reference' },
  { key: 'staff_total', label: 'Staff — total', type: 'number' },
  { key: 'staff_in_production', label: 'Staff — in production', type: 'number' },
];

interface Props {
  audit: NexusAuditRecord;
  onSaved: (a: NexusAuditRecord) => void;
  onError: (msg: string) => void;
}

export default function SiteProfileChapter({ audit, onSaved, onError }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...audit });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of FIELDS) payload[f.key] = form[f.key] === '' ? null : form[f.key];
      payload.iso_9001_certified = form.iso_9001_certified;
      onSaved(await updateAudit(audit.id, payload));
    } catch { onError('Failed to save site profile'); }
    finally { setSaving(false); }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Mirrors the cqmAP Coversheet, Section 1 (vendor fills prior to the audit).
      </Typography>
      <FormControlLabel
        control={<Switch checked={!!form.iso_9001_certified}
          onChange={e => setForm(f => ({ ...f, iso_9001_certified: e.target.checked }))} />}
        label="Site holds an ISO 9001 certificate (selects the 31- vs 60-requirement QMS set)"
        sx={{ mb: 2 }}
      />
      <Grid container spacing={2}>
        {FIELDS.map(f => (
          <Grid item xs={12} sm={6} md={4} key={String(f.key)}>
            <TextField
              fullWidth size="small" label={f.label} type={f.type ?? 'text'}
              value={form[f.key] ?? ''}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: f.type === 'number' ? Number(e.target.value) || null : e.target.value }))}
            />
          </Grid>
        ))}
      </Grid>
      <Button variant="contained" sx={{ mt: 2 }} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Site Profile'}
      </Button>
    </Box>
  );
}
