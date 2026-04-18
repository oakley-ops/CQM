import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Alert,
  Divider,
  FormControlLabel,
  Switch,
  Chip,
} from '@mui/material';
import { Info as InfoIcon, Construction as ConstructionIcon } from '@mui/icons-material';
import { TestDefinition, TestEntryFormData, CardEntryData, TestEntryMetadata } from '../../../types/cqm';

interface IdentificationNotchFormProps {
  def: TestDefinition;
  entry: TestEntryFormData;
  onUpdateEntry: (defId: number, updates: Partial<TestEntryFormData>) => void;
  onUpdateCardEntry: (defId: number, cardNumber: number, updates: Partial<CardEntryData>) => void;
}

interface IdentificationNotchExtra {
  specConformityDeclared?: boolean;
  specReference?: string;
  conformityMethod?: string;
  notchSafeZoneDeclared?: boolean;
  notchSafeZoneFree?: boolean;
  touchProgramCompatible?: boolean;
}

const IdentificationNotchForm: React.FC<IdentificationNotchFormProps> = ({
  def, entry, onUpdateEntry,
}) => {
  const meta: TestEntryMetadata = entry.specializedMetadata ?? {};
  const extra = (meta.extraData ?? {}) as IdentificationNotchExtra;

  const updateMeta = (patch: Partial<TestEntryMetadata>) =>
    onUpdateEntry(def.id, { specializedMetadata: { ...meta, ...patch } });

  const updateExtra = (patch: Partial<IdentificationNotchExtra>) => {
    const next = { ...extra, ...patch };
    const isConformant = !!next.specConformityDeclared;
    updateMeta({ extraData: next });
    onUpdateEntry(def.id, {
      specializedMetadata: { ...meta, extraData: next },
      passStatus: isConformant ? true : undefined,
    });
  };

  const overallStatus = extra.specConformityDeclared === true
    ? 'PASS'
    : extra.specConformityDeclared === false
    ? 'FAIL'
    : null;

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Suitability for an Identification Notch — Conformity Declaration (#3067#)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        CQM Qualification: No physical testing required · CQM Monitoring: None required
      </Typography>

      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
        <Typography variant="caption">
          <strong>No physical test required.</strong> Conformity shall be achieved by construction.
          The vendor must state in the product specification that the card is suitable for producing
          cards with a notch and ensure production tolerances prevent functional elements from
          entering the Notch Safe Zone (#A600#).
        </Typography>
      </Alert>

      {/* ── Section A: Conformity Declaration ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
        Product Specification Conformity
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <ConstructionIcon color="action" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                Product specification states conformity to identification notch requirements
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Conformity achieved by construction — no functional elements inside Notch Safe Zone
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={extra.specConformityDeclared ?? false}
                  onChange={e => updateExtra({ specConformityDeclared: e.target.checked })}
                  color="success"
                />
              }
              label={extra.specConformityDeclared ? 'Declared' : 'Not Declared'}
              labelPlacement="start"
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={8}>
          <TextField
            label="Product Specification Reference"
            size="small"
            fullWidth
            placeholder="e.g. PS-2024-CB-001 Rev. 3"
            value={extra.specReference ?? ''}
            onChange={e => updateExtra({ specReference: e.target.value })}
            helperText="Document or revision where conformity is stated"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            label="Reviewed By"
            size="small"
            fullWidth
            value={meta.technician ?? ''}
            onChange={e => updateMeta({ technician: e.target.value })}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Date"
            size="small"
            fullWidth
            type="date"
            value={meta.testDate ?? ''}
            onChange={e => updateMeta({ testDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Conformity Method Description"
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="Describe how conformity is achieved by construction (e.g. card layer layout, tolerance controls)"
            value={extra.conformityMethod ?? ''}
            onChange={e => updateExtra({ conformityMethod: e.target.value })}
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section B: Notch Safe Zone ── */}
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
        Notch Safe Zone Declaration
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Required only if the area permitted for notches is not entirely free of functional elements.
        Defined size: 2.1 mm × 13.7 mm.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={extra.notchSafeZoneDeclared ?? false}
                  onChange={e => updateExtra({ notchSafeZoneDeclared: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Notch Safe Zone declared</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vendor defines a 2.1 mm × 13.7 mm NSZ
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={extra.notchSafeZoneFree ?? false}
                  onChange={e => updateExtra({ notchSafeZoneFree: e.target.checked })}
                  disabled={!extra.notchSafeZoneDeclared}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">NSZ free of functional elements</Typography>
                  <Typography variant="caption" color="text.secondary">
                    IL, CB, ICC, or IAC confirmed clear
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={extra.touchProgramCompatible ?? false}
                  onChange={e => updateExtra({ touchProgramCompatible: e.target.checked })}
                  disabled={!extra.notchSafeZoneDeclared || !extra.notchSafeZoneFree}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Compatible with Mastercard Touch Program</Typography>
                  <Typography variant="caption" color="text.secondary">
                    IL/CB/ICC/IAC compatible with notches located in the Notch Safe Zone
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* ── Section C: Overall status ── */}
      <Alert
        severity={overallStatus === 'PASS' ? 'success' : overallStatus === 'FAIL' ? 'error' : 'warning'}
        sx={{ mb: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" fontWeight="medium">
            {overallStatus === 'PASS'
              ? 'Conformity declared — record will be marked PASS.'
              : overallStatus === 'FAIL'
              ? 'Conformity not declared — record will be marked FAIL.'
              : 'Pending — declare conformity above to record result.'}
          </Typography>
          {overallStatus && (
            <Chip
              label={overallStatus}
              color={overallStatus === 'PASS' ? 'success' : 'error'}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
      </Alert>

      {/* ── Section D: Notes ── */}
      <TextField
        label="Notes"
        size="small"
        fullWidth
        multiline
        rows={3}
        value={meta.jobNotes ?? ''}
        onChange={e => updateMeta({ jobNotes: e.target.value })}
        helperText="Additional conformity evidence, spec version details, or review context."
      />
    </Box>
  );
};

export default IdentificationNotchForm;
